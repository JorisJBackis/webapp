"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2, User, Check, Calendar, Euro, ChevronsUpDown } from 'lucide-react'
import { getCountryFlag } from '@/lib/utils/country-flags'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface Player {
  id: number
  name: string
  age: number | null
  main_position: string | null
  nationality: string | null
  height: number | null
  foot: string | null
  contract_expires: string | null
  market_value_eur: number | null
  is_eu_passport: boolean | null
  picture_url: string | null
  transfermarkt_url: string | null
  club_id: number | null
  club_name: string | null
  club_logo_url: string | null
  league_name: string | null
  league_country: string | null
}

interface PlayerSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onPlayerSelected: (player: Player) => void
  selectedPlayerId?: number | null
}

export default function PlayerSelectionModal({
  isOpen,
  onClose,
  onPlayerSelected,
  selectedPlayerId
}: PlayerSelectionModalProps) {
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [positionFilter, setPositionFilter] = useState('all')
  const [nationalityFilter, setNationalityFilter] = useState('all')

  // Data state
  const [players, setPlayers] = useState<Player[]>([])
  const [positions, setPositions] = useState<string[]>([])
  const [nationalities, setNationalities] = useState<string[]>([])

  // Loading and pagination state
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const BATCH_SIZE = 50

  // Combobox states
  const [openPosition, setOpenPosition] = useState(false)
  const [openNationality, setOpenNationality] = useState(false)

  // Dropdown search states
  const [positionSearch, setPositionSearch] = useState('')
  const [nationalitySearch, setNationalitySearch] = useState('')

  const supabase = createClient()

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch filter options (positions and nationalities) on modal open
  useEffect(() => {
    if (!isOpen) return

    const fetchFilterOptions = async () => {
      try {
        if (!supabase) return

        // Get total count
        const { count } = await supabase
          .from('players_transfermarkt')
          .select('*', { count: 'exact', head: true })
          .not('club_id', 'is', null)

        setTotalCount(count || 0)

        // Fetch unique positions
        const { data: positionsData } = await supabase
          .from('players_transfermarkt')
          .select('main_position')
          .not('club_id', 'is', null)
          .not('main_position', 'is', null)

        const uniquePositions = [...new Set(
          positionsData?.map(p => p.main_position).filter(Boolean) as string[]
        )].sort()

        setPositions(uniquePositions)

        // Fetch unique nationalities
        const { data: nationalitiesData } = await supabase
          .from('players_transfermarkt')
          .select('nationality')
          .not('club_id', 'is', null)
          .not('nationality', 'is', null)

        // Extract individual nationalities from dual nationality strings
        const allNationalities = nationalitiesData
          ?.map(p => p.nationality)
          .filter(Boolean)
          .flatMap(nat => (nat as string).split(' / ').map(n => n.trim())) || []

        const uniqueNationalities = [...new Set(allNationalities)].sort()

        setNationalities(uniqueNationalities)
      } catch (err) {
        console.error('Error fetching filter options:', err)
      }
    }

    fetchFilterOptions()
  }, [isOpen, supabase])

  // Server-side filtering and pagination function
  const fetchPlayers = useCallback(async (append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setPlayers([])
      }

      if (!supabase) return

      // Build query with filters
      let query = supabase
        .from('players_transfermarkt')
        .select(`
          id,
          name,
          age,
          main_position,
          nationality,
          height,
          foot,
          contract_expires,
          market_value_eur,
          is_eu_passport,
          picture_url,
          transfermarkt_url,
          club_id,
          clubs_transfermarkt!inner(
            name,
            logo_url,
            leagues_transfermarkt!inner(
              name,
              country
            )
          )
        `, { count: 'exact' })
        .not('club_id', 'is', null)

      // Apply position filter
      if (positionFilter !== 'all') {
        query = query.eq('main_position', positionFilter)
      }

      // Apply nationality filter (handle dual nationalities)
      if (nationalityFilter !== 'all') {
        query = query.or(`nationality.eq.${nationalityFilter},nationality.ilike.${nationalityFilter} / %,nationality.ilike.% / ${nationalityFilter},nationality.ilike.% / ${nationalityFilter} / %`)
      }

      // Apply search filter
      if (debouncedSearchTerm) {
        query = query.or(`name.ilike.%${debouncedSearchTerm}%,clubs_transfermarkt.name.ilike.%${debouncedSearchTerm}%`)
      }

      // Apply pagination
      const from = append ? players.length : 0
      const to = from + BATCH_SIZE - 1

      query = query
        .order('name')
        .range(from, to)

      const { data: playersData, error: playersError, count } = await query

      if (playersError) throw playersError

      // Transform players
      const transformedPlayers = (playersData || []).map((player: any) => ({
        id: player.id,
        name: player.name,
        age: player.age,
        main_position: player.main_position,
        nationality: player.nationality,
        height: player.height,
        foot: player.foot,
        contract_expires: player.contract_expires,
        market_value_eur: player.market_value_eur,
        is_eu_passport: player.is_eu_passport,
        picture_url: player.picture_url,
        transfermarkt_url: player.transfermarkt_url,
        club_id: player.club_id,
        club_name: player.clubs_transfermarkt?.name || null,
        club_logo_url: player.clubs_transfermarkt?.logo_url || null,
        league_name: player.clubs_transfermarkt?.leagues_transfermarkt?.name || null,
        league_country: player.clubs_transfermarkt?.leagues_transfermarkt?.country || null
      }))

      if (append) {
        setPlayers(prev => [...prev, ...transformedPlayers])
      } else {
        setPlayers(transformedPlayers)
      }

      // Update hasMore based on total count
      const totalResults = count || 0
      const currentCount = append ? players.length + transformedPlayers.length : transformedPlayers.length
      setHasMore(currentCount < totalResults)

    } catch (err) {
      console.error('Error fetching players:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [supabase, positionFilter, nationalityFilter, debouncedSearchTerm, players.length])

  // Fetch players when filters change
  useEffect(() => {
    if (!isOpen) return
    fetchPlayers(false)

    // Reset scroll position
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [isOpen, positionFilter, nationalityFilter, debouncedSearchTerm])

  // Infinite scroll handler - load more from server
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || loadingMore || !hasMore) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight

    // Load more when scrolled 80% down
    if (scrollPercentage > 0.8) {
      fetchPlayers(true)
    }
  }, [loadingMore, hasMore, fetchPlayers])

  // Attach scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const handleSelectPlayer = (player: Player) => {
    onPlayerSelected(player)
    handleClose()
  }

  const formatMarketValue = (value: number | null) => {
    if (!value) return 'N/A'
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`
    return `€${value}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const handleClose = () => {
    setSearchTerm('')
    setDebouncedSearchTerm('')
    setPositionFilter('all')
    setNationalityFilter('all')
    setPlayers([])
    setHasMore(true)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Select Your Player Profile</DialogTitle>
          <DialogDescription>
            Search and select the player profile that matches you. Use filters to narrow down the results.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
          <div>
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Name or club..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label>Position</Label>
            <Popover modal={true} open={openPosition} onOpenChange={(open) => {
              setOpenPosition(open)
              if (!open) setPositionSearch('')
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openPosition}
                  className="w-full justify-between"
                >
                  {positionFilter === 'all' ? 'All Positions' : positionFilter}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <div className="flex items-center border-b px-3 py-2">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <Input
                    placeholder="Search position..."
                    className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none p-0 bg-transparent"
                    value={positionSearch}
                    onChange={(e) => setPositionSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto p-1">
                  <div
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      setPositionFilter('all')
                      setOpenPosition(false)
                      setPositionSearch('')
                    }}
                  >
                    All Positions
                  </div>
                  {positions
                    .filter(position => position.toLowerCase().includes(positionSearch.toLowerCase()))
                    .map((position) => (
                      <div
                        key={position}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          setPositionFilter(position)
                          setOpenPosition(false)
                          setPositionSearch('')
                        }}
                      >
                        {position}
                      </div>
                    ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Nationality</Label>
            <Popover modal={true} open={openNationality} onOpenChange={(open) => {
              setOpenNationality(open)
              if (!open) setNationalitySearch('')
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openNationality}
                  className="w-full justify-between"
                >
                  {nationalityFilter === 'all' ? 'All Nationalities' : nationalityFilter}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0">
                <div className="flex items-center border-b px-3 py-2">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <Input
                    placeholder="Search nationality..."
                    className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none p-0 bg-transparent"
                    value={nationalitySearch}
                    onChange={(e) => setNationalitySearch(e.target.value)}
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto p-1">
                  <div
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      setNationalityFilter('all')
                      setOpenNationality(false)
                      setNationalitySearch('')
                    }}
                  >
                    All Nationalities
                  </div>
                  {nationalities
                    .filter(nationality => nationality.toLowerCase().includes(nationalitySearch.toLowerCase()))
                    .map((nationality) => (
                      <div
                        key={nationality}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          setNationalityFilter(nationality)
                          setOpenNationality(false)
                          setNationalitySearch('')
                        }}
                      >
                        <span className="mr-2">{getCountryFlag(nationality) || '🌍'}</span>
                        {nationality}
                      </div>
                    ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Results */}
        <div className="text-sm text-muted-foreground mb-2 flex-shrink-0">
          {loading && players.length === 0 ? 'Loading...' : (
            players.length > 0
              ? `Showing ${players.length} players${hasMore ? ' (scroll for more)' : ''} • ${totalCount.toLocaleString()} total in database`
              : !loading ? 'No players found' : ''
          )}
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 border rounded-md overflow-y-auto"
          style={{ minHeight: 0 }}
        >
          {loading && players.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : players.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mb-4 opacity-50" />
              <p>No players found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {players.map(player => (
                <div
                  key={player.id}
                  className={`border rounded-lg overflow-hidden transition-all ${
                    selectedPlayerId === player.id ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Player Photo */}
                      {player.transfermarkt_url ? (
                        <a
                          href={player.transfermarkt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 hover:opacity-80 transition-opacity"
                        >
                          {player.picture_url ? (
                            <img
                              src={player.picture_url}
                              alt={player.name}
                              className="w-12 h-12 rounded-lg object-cover border-2 border-background shadow-md cursor-pointer"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md cursor-pointer">
                              <User className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </a>
                      ) : (
                        <>
                          {player.picture_url ? (
                            <img
                              src={player.picture_url}
                              alt={player.name}
                              className="w-12 h-12 rounded-lg object-cover border-2 border-background shadow-md flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md flex-shrink-0">
                              <User className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </>
                      )}

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        {/* Player Name */}
                        <div className="flex items-center gap-2">
                          {player.transfermarkt_url ? (
                            <a
                              href={player.transfermarkt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              <p className="font-bold truncate">{player.name}</p>
                            </a>
                          ) : (
                            <p className="font-bold truncate">{player.name}</p>
                          )}
                        </div>

                        {/* Stats Row */}
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                          {/* Position & Age */}
                          <div className="flex items-center gap-1">
                            <Badge className="bg-primary text-primary-foreground text-xs h-5">
                              {player.main_position || 'N/A'}
                            </Badge>
                            {player.age && (
                              <span>{player.age} yrs</span>
                            )}
                          </div>

                          {/* Nationality */}
                          {player.nationality && (
                            <div className="flex items-center gap-1">
                              <span>{getCountryFlag(player.nationality) || '🌍'}</span>
                              <span>{player.nationality}</span>
                            </div>
                          )}

                          {/* Club */}
                          {player.club_name && (
                            <div className="flex items-center gap-1">
                              {player.club_logo_url && (
                                <img
                                  src={player.club_logo_url}
                                  alt={player.club_name}
                                  className="w-4 h-4 object-contain"
                                />
                              )}
                              <span>{player.club_name}</span>
                            </div>
                          )}

                          {/* League */}
                          {player.league_name && (
                            <Badge variant="secondary" className="text-xs h-5">
                              {player.league_name}
                            </Badge>
                          )}

                          {/* Market Value */}
                          <div className="flex items-center gap-1">
                            <Euro className="h-3 w-3" />
                            <span>{formatMarketValue(player.market_value_eur)}</span>
                          </div>

                          {/* Contract Expires */}
                          {player.contract_expires && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(player.contract_expires)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Select Button */}
                    <div className="flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleSelectPlayer(player)}
                        variant={selectedPlayerId === player.id ? "default" : "outline"}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {selectedPlayerId === player.id ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading more indicator */}
              {loadingMore && (
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                  <span className="text-sm text-muted-foreground">Loading more players...</span>
                </div>
              )}

              {/* End of results indicator */}
              {!loadingMore && !hasMore && players.length > BATCH_SIZE && (
                <div className="flex justify-center items-center py-4">
                  <span className="text-sm text-muted-foreground">All {players.length} players loaded</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground flex-shrink-0">
          <p>💡 Tip: Use filters to quickly find your player profile. Can't find yourself? Contact support.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
