"use client"

import { useState,useEffect,useMemo,useRef,useCallback } from 'react'
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
import { Search,Loader2,Building2,Plus,Check,ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { getCountryFlag } from '@/lib/utils/country-flags'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface Club {
  id: number
  name: string
  logo_url: string | null
  league_name: string | null
  league_tier: number | null
  country: string | null
}

interface LeagueOption {
  name: string
  tier: number
}

interface AddFavoriteClubModalProps {
  isOpen: boolean
  onClose: () => void
  onClubAdded: () => void
}

export default function AddFavoriteClubModal({ isOpen,onClose,onClubAdded }: AddFavoriteClubModalProps) {
  const [searchTerm,setSearchTerm] = useState('')
  const [competitionFilter,setCompetitionFilter] = useState('all')
  const [countryFilter,setCountryFilter] = useState('all')
  const [clubs,setClubs] = useState<Club[]>([])
  const [favoritedClubIds,setFavoritedClubIds] = useState<Set<number>>(new Set())
  const [leagueOptions,setLeagueOptions] = useState<LeagueOption[]>([])
  const [countries,setCountries] = useState<string[]>([])
  const [expandedClubId,setExpandedClubId] = useState<number | null>(null)
  const [notes,setNotes] = useState<Record<number,string>>({})
  const [loading,setLoading] = useState(false)
  const [addingClubId,setAddingClubId] = useState<number | null>(null)
  const [clubsAddedInSession,setClubsAddedInSession] = useState(false)

  // Infinite scroll state
  const [displayCount,setDisplayCount] = useState(50)
  const [loadingMore,setLoadingMore] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Combobox states
  const [openCountry,setOpenCountry] = useState(false)
  const [openLeague,setOpenLeague] = useState(false)

  // Dropdown search states
  const [countrySearch,setCountrySearch] = useState('')
  const [leagueSearch,setLeagueSearch] = useState('')

  const supabase = createClient()

  // Fetch all clubs and favorited clubs
  useEffect(() => {
    if (!isOpen) return

    // Reset session tracking when modal opens
    setClubsAddedInSession(false)

    const fetchData = async () => {
      try {
        setLoading(true)

        if (!supabase) return

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch all clubs with league info
        const { data: clubsData,error: clubsError } = await supabase
          .from('clubs_transfermarkt')
          .select(`
            id,
            name,
            logo_url,
            country,
            league_id,
            leagues_transfermarkt!inner(name, tier)
          `)
          .order('name')

        if (clubsError) throw clubsError

        // Fetch already favorited clubs
        const { data: favoritedData,error: favoritedError } = await supabase.rpc('get_agent_favorite_clubs',{
          p_agent_id: user.id
        })

        if (favoritedError) throw favoritedError

        // Create a set of favorited club IDs
        const favoritedIds = new Set((favoritedData || []).map((fav: any) => fav.club_id))
        setFavoritedClubIds(favoritedIds)

        // Transform and filter out already favorited clubs
        const transformedClubs = (clubsData || []).map((club: any) => ({
          id: club.id,
          name: club.name,
          logo_url: club.logo_url,
          league_name: club.leagues_transfermarkt?.name || null,
          league_tier: club.leagues_transfermarkt?.tier || null,
          country: club.country
        }))

        const availableClubs = transformedClubs.filter(club => !favoritedIds.has(club.id))
        setClubs(availableClubs)

        // Extract unique leagues with their tiers, sorted by tier
        const leaguesMap = new Map<string,number>()
        availableClubs.forEach(club => {
          if (club.league_name && club.league_tier) {
            leaguesMap.set(club.league_name,club.league_tier)
          }
        })

        const uniqueLeagues = Array.from(leaguesMap.entries())
          .map(([name,tier]) => ({ name,tier }))
          .sort((a,b) => a.tier - b.tier || a.name.localeCompare(b.name))

        const uniqueCountries = [...new Set(
          availableClubs
            .map(c => c.country)
            .filter(Boolean) as string[]
        )].sort()

        setLeagueOptions(uniqueLeagues)
        setCountries(uniqueCountries)
      } catch (err) {
        console.error('Error fetching data:',err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  },[isOpen,supabase])

  // Reset league filter when country changes
  useEffect(() => {
    setCompetitionFilter('all')
  },[countryFilter])

  // Get filtered leagues based on selected country
  const filteredLeagues = countryFilter === 'all'
    ? leagueOptions
    : (() => {
      const leaguesMap = new Map<string,number>()
      clubs
        .filter(club => club.country === countryFilter)
        .forEach(club => {
          if (club.league_name && club.league_tier) {
            leaguesMap.set(club.league_name,club.league_tier)
          }
        })
      return Array.from(leaguesMap.entries())
        .map(([name,tier]) => ({ name,tier }))
        .sort((a,b) => a.tier - b.tier || a.name.localeCompare(b.name))
    })()

  // Apply filters with useMemo for performance
  const filteredClubs = useMemo(() => {
    let filtered = clubs

    // Country filter (apply first)
    if (countryFilter !== 'all') {
      filtered = filtered.filter(club => club.country === countryFilter)
    }

    // League filter
    if (competitionFilter !== 'all') {
      filtered = filtered.filter(club => club.league_name === competitionFilter)
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(club =>
        club.name.toLowerCase().includes(searchLower) ||
        club.league_name?.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  },[clubs,competitionFilter,countryFilter,searchTerm])

  // Display only a subset of filtered clubs for performance
  const displayedClubs = useMemo(() => {
    return filteredClubs.slice(0,displayCount)
  },[filteredClubs,displayCount])

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(50)
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  },[competitionFilter,countryFilter,searchTerm])

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || loadingMore) return

    const { scrollTop,scrollHeight,clientHeight } = container
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight

    // Load more when scrolled 80% down
    if (scrollPercentage > 0.8 && displayCount < filteredClubs.length) {
      setLoadingMore(true)
      // Simulate a small delay for smooth UX
      setTimeout(() => {
        setDisplayCount(prev => Math.min(prev + 50,filteredClubs.length))
        setLoadingMore(false)
      },300)
    }
  },[displayCount,filteredClubs.length,loadingMore])

  // Attach scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    container.addEventListener('scroll',handleScroll)
    return () => container.removeEventListener('scroll',handleScroll)
  },[handleScroll])

  const handleAddClub = async (club: Club) => {
    try {
      setAddingClubId(club.id)

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.rpc('add_favorite_club',{
        p_agent_id: user.id,
        p_club_id: club.id,
        p_notes: notes[club.id] || null
      })

      if (error) throw error

      // Trigger scraping for this club in the background (don't wait for it)
      fetch('/api/scrape',{
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId: club.id })
      }).catch(err => console.error('Error triggering scrape:',err))

      // Success - remove from list and update parent
      setClubs(prev => prev.filter(c => c.id !== club.id))
      setFavoritedClubIds(prev => new Set([...prev,club.id]))
      setExpandedClubId(null)
      setNotes(prev => {
        const newNotes = { ...prev }
        delete newNotes[club.id]
        return newNotes
      })

      // Mark that clubs were added in this session
      setClubsAddedInSession(true)

      // Don't notify parent yet - wait until modal closes to batch refresh

      // Show success toast
      toast.success(`${club.name} added to favorites!`)
    } catch (err: any) {
      console.error('Error adding club:',err)
      alert('Failed to add club: ' + err.message)
    } finally {
      setAddingClubId(null)
    }
  }

  const handleToggleNotes = (clubId: number) => {
    setExpandedClubId(expandedClubId === clubId ? null : clubId)
  }

  const handleClose = () => {
    // Only refresh parent's list if clubs were added in this session
    const shouldRefresh = clubsAddedInSession

    // Reset all state
    setSearchTerm('')
    setCompetitionFilter('all')
    setCountryFilter('all')
    setExpandedClubId(null)
    setNotes({})
    setDisplayCount(50)
    setClubsAddedInSession(false)

    // Notify parent to refresh if needed
    if (shouldRefresh) {
      onClubAdded()
    }

    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Add Club to Favorites</DialogTitle>
          <DialogDescription>
            Filter by country first, then narrow down by league. Click "+ Note" to add optional notes.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
          <div>
            <Label htmlFor="search">Search clubs</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name, league..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label>Country</Label>
            <Popover modal={true} open={openCountry} onOpenChange={(open) => {
              setOpenCountry(open)
              if (!open) setCountrySearch('')
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCountry}
                  className="w-full justify-between"
                >
                  {countryFilter === 'all' ? 'All Countries' : countryFilter}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0">
                <div className="flex items-center border-b px-3 py-2">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <Input
                    placeholder="Search country..."
                    className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none p-0 bg-transparent"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto p-1">
                  <div
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      setCountryFilter('all')
                      setOpenCountry(false)
                      setCountrySearch('')
                    }}
                  >
                    All Countries
                  </div>
                  {countries
                    .filter(country => country.toLowerCase().includes(countrySearch.toLowerCase()))
                    .map((country) => (
                      <div
                        key={country}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          setCountryFilter(country)
                          setOpenCountry(false)
                          setCountrySearch('')
                        }}
                      >
                        <span className="mr-2">{getCountryFlag(country) || '🌍'}</span>
                        {country}
                      </div>
                    ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>League</Label>
            <Popover modal={true} open={openLeague} onOpenChange={(open) => {
              setOpenLeague(open)
              if (!open) setLeagueSearch('')
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openLeague}
                  className="w-full justify-between"
                >
                  {competitionFilter === 'all' ? 'All Leagues' : competitionFilter}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <div className="flex items-center border-b px-3 py-2">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <Input
                    placeholder="Search league..."
                    className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none p-0 bg-transparent"
                    value={leagueSearch}
                    onChange={(e) => setLeagueSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto p-1">
                  <div
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      setCompetitionFilter('all')
                      setOpenLeague(false)
                      setLeagueSearch('')
                    }}
                  >
                    All Leagues
                  </div>
                  {filteredLeagues
                    .filter(league => league.name.toLowerCase().includes(leagueSearch.toLowerCase()))
                    .map((league) => (
                      <div
                        key={league.name}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                          setCompetitionFilter(league.name)
                          setOpenLeague(false)
                          setLeagueSearch('')
                        }}
                      >
                        <span className="font-medium text-xs text-muted-foreground mr-2">Tier {league.tier}</span>
                        <span className="mr-2">·</span>
                        {league.name}
                      </div>
                    ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Results */}
        <div className="text-sm text-muted-foreground mb-2 flex-shrink-0">
          {loading ? 'Loading...' : (
            filteredClubs.length > 0
              ? `Showing ${displayedClubs.length} of ${filteredClubs.length} clubs${displayedClubs.length < filteredClubs.length ? ' (scroll for more)' : ''}`
              : 'No clubs found'
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
          ) : filteredClubs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mb-4 opacity-50" />
              <p>No clubs found</p>
              <p className="text-sm">
                {favoritedClubIds.size > 0 && clubs.length === 0
                  ? 'All clubs have been added to favorites!'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {displayedClubs.map(club => (
                <div key={club.id} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      {club.logo_url ? (
                        <img
                          src={club.logo_url}
                          alt={club.name}
                          className="w-10 h-10 object-contain flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{club.name}</p>
                        <div className="flex gap-2 mt-1">
                          {club.league_name && (
                            <Badge variant="secondary" className="text-xs">
                              {club.league_name}
                            </Badge>
                          )}
                          {club.country && (
                            <Badge variant="outline" className="text-xs">
                              <span className="mr-1">{getCountryFlag(club.country) || '🌍'}</span>
                              {club.country}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={expandedClubId === club.id ? "secondary" : "outline"}
                        onClick={() => handleToggleNotes(club.id)}
                        disabled={addingClubId === club.id}
                        title="Add notes about this club"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Note
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAddClub(club)}
                        disabled={addingClubId !== null}
                      >
                        {addingClubId === club.id ? (
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
                  {expandedClubId === club.id && (
                    <div className="p-3 bg-muted/30 border-t">
                      <Label htmlFor={`notes-${club.id}`} className="text-xs">
                        Notes (Optional)
                      </Label>
                      <Textarea
                        id={`notes-${club.id}`}
                        placeholder="e.g., Main contact: John Doe, Met at conference 2024..."
                        value={notes[club.id] || ''}
                        onChange={(e) => setNotes(prev => ({ ...prev,[club.id]: e.target.value }))}
                        rows={2}
                        className="mt-1 text-sm resize-none"
                      />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading more indicator */}
              {loadingMore && (
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                  <span className="text-sm text-muted-foreground">Loading more clubs...</span>
                </div>
              )}

              {/* End of results indicator */}
              {!loadingMore && displayedClubs.length >= filteredClubs.length && filteredClubs.length > 50 && (
                <div className="flex justify-center items-center py-4">
                  <span className="text-sm text-muted-foreground">All {filteredClubs.length} clubs loaded</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground flex-shrink-0 mt-2">
          <p>💡 Tip: Click "+ Note" to add notes before adding, or edit them later in My Clubs</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}