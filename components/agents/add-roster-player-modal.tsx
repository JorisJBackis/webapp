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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2, User, Plus, Check, Calendar, Euro, ChevronsUpDown, Save, FileText, Eye } from 'lucide-react'
import { toast } from 'sonner'
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
  player_agent: string | null
  club_id: number | null
  club_name: string | null
  club_logo_url: string | null
  league_name: string | null
  league_country: string | null
  has_saved_note: boolean
  saved_note: string | null
}

interface AddRosterPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  onPlayerAdded: () => void
}

const PAGE_SIZE = 50

export default function AddRosterPlayerModal({ isOpen, onClose, onPlayerAdded }: AddRosterPlayerModalProps) {
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [agencyFilter, setAgencyFilter] = useState('all')
  const [positionFilter, setPositionFilter] = useState('all')
  const [nationalityFilter, setNationalityFilter] = useState('all')

  // Data state
  const [players, setPlayers] = useState<Player[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  // Filter options (loaded once)
  const [agencies, setAgencies] = useState<string[]>([])
  const [positions, setPositions] = useState<string[]>([])
  const [nationalities, setNationalities] = useState<string[]>([])
  const [filterOptionsLoaded, setFilterOptionsLoaded] = useState(false)

  // UI state
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [addingPlayerId, setAddingPlayerId] = useState<number | null>(null)
  const [savingNotePlayerId, setSavingNotePlayerId] = useState<number | null>(null)

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Combobox states
  const [openAgency, setOpenAgency] = useState(false)
  const [openPosition, setOpenPosition] = useState(false)
  const [openNationality, setOpenNationality] = useState(false)

  // Dropdown search states
  const [agencySearch, setAgencySearch] = useState('')
  const [positionSearch, setPositionSearch] = useState('')
  const [nationalitySearch, setNationalitySearch] = useState('')

  const supabase = createClient()

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm])

  // Load filter options once when modal opens
  useEffect(() => {
    if (!isOpen || filterOptionsLoaded) return

    const loadFilterOptions = async () => {
      try {
        const { data, error } = await supabase.rpc('get_player_filter_options')

        if (error) throw error

        if (data && data[0]) {
          setPositions(data[0].positions || [])
          // Extract individual nationalities from dual nationality strings
          const allNationalities = (data[0].nationalities || [])
            .flatMap((nat: string) => nat.split(' / ').map((n: string) => n.trim()))
          const uniqueNationalities = [...new Set(allNationalities)].sort() as string[]
          setNationalities(uniqueNationalities)
          setAgencies(data[0].agencies || [])
        }

        setFilterOptionsLoaded(true)
      } catch (err) {
        console.error('[AddRosterPlayerModal] Error loading filter options:', err)
      }
    }

    loadFilterOptions()
  }, [isOpen, filterOptionsLoaded, supabase])

  // Search players (server-side)
  const searchPlayers = useCallback(async (resetResults = true) => {
    if (!isOpen) return

    try {
      if (resetResults) {
        setLoading(true)
        setOffset(0)
      } else {
        setLoadingMore(true)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const currentOffset = resetResults ? 0 : offset

      const { data, error } = await supabase.rpc('search_available_players', {
        p_agent_id: user.id,
        p_search: debouncedSearch || null,
        p_position: positionFilter === 'all' ? null : positionFilter,
        p_nationality: nationalityFilter === 'all' ? null : nationalityFilter,
        p_agency: agencyFilter === 'all' ? null : agencyFilter,
        p_limit: PAGE_SIZE,
        p_offset: currentOffset
      })

      if (error) throw error

      const transformedPlayers: Player[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        age: p.age,
        main_position: p.main_position,
        nationality: p.nationality,
        height: p.height,
        foot: p.foot,
        contract_expires: p.contract_expires,
        market_value_eur: p.market_value_eur,
        is_eu_passport: p.is_eu_passport,
        picture_url: p.picture_url,
        transfermarkt_url: p.transfermarkt_url,
        player_agent: p.player_agent,
        club_id: p.club_id,
        club_name: p.club_name,
        club_logo_url: p.club_logo_url,
        league_name: p.league_name,
        league_country: p.league_country,
        has_saved_note: p.has_saved_note || false,
        saved_note: p.saved_note
      }))

      // Load saved notes into notes state
      const notesMap: Record<number, string> = { ...notes }
      transformedPlayers.forEach((p) => {
        if (p.saved_note && !notesMap[p.id]) {
          notesMap[p.id] = p.saved_note
        }
      })
      setNotes(notesMap)

      // Get total count from first result
      const total = data?.[0]?.total_count || 0
      setTotalCount(total)

      if (resetResults) {
        setPlayers(transformedPlayers)
        setOffset(PAGE_SIZE)
      } else {
        setPlayers(prev => [...prev, ...transformedPlayers])
        setOffset(prev => prev + PAGE_SIZE)
      }

      setHasMore(transformedPlayers.length === PAGE_SIZE && (currentOffset + PAGE_SIZE) < total)

    } catch (err) {
      console.error('[AddRosterPlayerModal] Error searching players:', err)
      toast.error('Failed to load players')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [isOpen, supabase, debouncedSearch, positionFilter, nationalityFilter, agencyFilter, offset, notes])

  // Trigger search when filters change
  useEffect(() => {
    if (!isOpen) return
    searchPlayers(true)
  }, [isOpen, debouncedSearch, positionFilter, nationalityFilter, agencyFilter])

  // Reset scroll when filters change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [debouncedSearch, positionFilter, nationalityFilter, agencyFilter])

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || loadingMore || !hasMore) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight

    // Load more when scrolled 80% down
    if (scrollPercentage > 0.8) {
      searchPlayers(false)
    }
  }, [loadingMore, hasMore, searchPlayers])

  // Attach scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const handleAddPlayer = async (player: Player) => {
    try {
      setAddingPlayerId(player.id)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('agent_rosters')
        .insert({
          agent_id: user.id,
          player_id: player.id,
          notes: notes[player.id] || null
        })

      if (error) throw error

      // Remove player from list
      setPlayers(prev => prev.filter(p => p.id !== player.id))
      setTotalCount(prev => prev - 1)
      setExpandedPlayerId(null)

      // Notify parent to refresh
      onPlayerAdded()

      toast.success(`${player.name} added to your roster!`)
    } catch (err: any) {
      console.error('[AddRosterPlayerModal] Error adding player:', err)
      toast.error('Failed to add player: ' + err.message)
    } finally {
      setAddingPlayerId(null)
    }
  }

  const handleToggleNotes = (playerId: number) => {
    setExpandedPlayerId(expandedPlayerId === playerId ? null : playerId)
  }

  const handleSaveNote = async (player: Player) => {
    try {
      setSavingNotePlayerId(player.id)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const noteText = notes[player.id]?.trim()

      if (!noteText) {
        // If note is empty, delete it from database
        const { error } = await supabase
          .from('agent_player_notes')
          .delete()
          .eq('agent_id', user.id)
          .eq('player_id', player.id)

        if (error) throw error

        // Update player in list
        setPlayers(prev => prev.map(p =>
          p.id === player.id ? { ...p, has_saved_note: false, saved_note: null } : p
        ))

        toast.success('Note removed')
      } else {
        // Upsert the note
        const { error } = await supabase
          .from('agent_player_notes')
          .upsert({
            agent_id: user.id,
            player_id: player.id,
            notes: noteText,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'agent_id,player_id'
          })

        if (error) throw error

        // Update player in list
        setPlayers(prev => prev.map(p =>
          p.id === player.id ? { ...p, has_saved_note: true, saved_note: noteText } : p
        ))

        toast.success(`Note saved for ${player.name}`)
      }
    } catch (err: any) {
      console.error('[AddRosterPlayerModal] Error saving note:', err)
      toast.error('Failed to save note: ' + err.message)
    } finally {
      setSavingNotePlayerId(null)
    }
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
    setDebouncedSearch('')
    setAgencyFilter('all')
    setPositionFilter('all')
    setNationalityFilter('all')
    setExpandedPlayerId(null)
    setNotes({})
    setPlayers([])
    setOffset(0)
    setTotalCount(0)
    setHasMore(true)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Add Player to Roster</DialogTitle>
          <DialogDescription>
            Search by agency, position, or name. Save notes for players (without adding to roster) or add them directly. Players with saved notes appear first.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0">
          <div>
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Name, club, agency..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              {searchTerm !== debouncedSearch && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          <div>
            <Label>Agency</Label>
            <Popover modal={true} open={openAgency} onOpenChange={(open) => {
              setOpenAgency(open)
              if (!open) setAgencySearch('')
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openAgency}
                  className="w-full justify-between"
                >
                  {agencyFilter === 'all' ? 'All Agencies' : agencyFilter}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0">
                <div className="flex items-center border-b px-3 py-2">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <Input
                    placeholder="Search agency..."
                    className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none p-0 bg-transparent"
                    value={agencySearch}
                    onChange={(e) => setAgencySearch(e.target.value)}
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto p-1">
                  <div
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      setAgencyFilter('all')
                      setOpenAgency(false)
                      setAgencySearch('')
                    }}
                  >
                    All Agencies
                  </div>
                  {agencies
                    .filter(agency => agency.toLowerCase().includes(agencySearch.toLowerCase()))
                    .map((agency) => (
                      <div
                        key={agency}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          setAgencyFilter(agency)
                          setOpenAgency(false)
                          setAgencySearch('')
                        }}
                      >
                        {agency}
                      </div>
                    ))}
                </div>
              </PopoverContent>
            </Popover>
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
                        <span className="mr-2">{getCountryFlag(nationality) || ''}</span>
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
          {loading ? 'Searching...' : (
            totalCount > 0
              ? `Showing ${players.length} of ${totalCount} players${hasMore ? ' (scroll for more)' : ''}`
              : 'No players found'
          )}
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 border rounded-md overflow-y-auto"
          style={{ minHeight: 0 }}
        >
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : players.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mb-4 opacity-50" />
              <p>No players found</p>
              <p className="text-sm">Try adjusting your filters or search term</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {players.map(player => (
                <div key={player.id} className="border rounded-lg overflow-hidden">
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
                          {player.has_saved_note && (
                            <Badge variant="secondary" className="text-xs h-5 flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Note saved
                            </Badge>
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
                              <span>{getCountryFlag(player.nationality) || ''}</span>
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

                        {/* Agency */}
                        {player.player_agent && (
                          <div className="mt-1">
                            <Badge variant="outline" className="text-xs">
                              Agency: {player.player_agent}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant={expandedPlayerId === player.id ? "secondary" : "outline"}
                        onClick={() => handleToggleNotes(player.id)}
                        disabled={addingPlayerId === player.id}
                        title={player.has_saved_note ? "View/edit saved note" : "Add notes about this player"}
                      >
                        {player.has_saved_note ? (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            See note
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            Note
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAddPlayer(player)}
                        disabled={addingPlayerId === player.id}
                      >
                        {addingPlayerId === player.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expandable notes section */}
                  {expandedPlayerId === player.id && (
                    <div className="p-3 bg-muted/30 border-t space-y-2">
                      <Label htmlFor={`notes-${player.id}`} className="text-xs">
                        Notes {player.has_saved_note ? '(Previously saved)' : '(Optional)'}
                      </Label>
                      <Textarea
                        id={`notes-${player.id}`}
                        placeholder="e.g., Strong defender, good in the air, interested in Spain..."
                        value={notes[player.id] || ''}
                        onChange={(e) => setNotes(prev => ({ ...prev, [player.id]: e.target.value }))}
                        rows={2}
                        className="text-sm resize-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSaveNote(player)}
                          disabled={savingNotePlayerId === player.id || addingPlayerId === player.id}
                          className="flex-1"
                        >
                          {savingNotePlayerId === player.id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Save className="h-3 w-3 mr-1" />
                          )}
                          Save Note Only
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAddPlayer(player)}
                          disabled={addingPlayerId === player.id || savingNotePlayerId === player.id}
                          className="flex-1"
                        >
                          {addingPlayerId === player.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Add to Roster
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
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
              {!loadingMore && !hasMore && players.length > 0 && (
                <div className="flex justify-center items-center py-4">
                  <span className="text-sm text-muted-foreground">All {totalCount} players loaded</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground flex-shrink-0">
          <p>Tip: Save notes for players you're interested in - they'll appear first in the list. Add notes without adding to roster to track prospects.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
