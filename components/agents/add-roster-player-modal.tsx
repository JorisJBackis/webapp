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
import { Search,Loader2,User,Plus,Check,Calendar,Euro,ChevronsUpDown,Save,FileText,Eye } from 'lucide-react'
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
}

interface AddRosterPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  onPlayerAdded: () => void
}

export default function AddRosterPlayerModal({ isOpen,onClose,onPlayerAdded }: AddRosterPlayerModalProps) {
  const [searchTerm,setSearchTerm] = useState('')
  const [agencyFilter,setAgencyFilter] = useState('all')
  const [positionFilter,setPositionFilter] = useState('all')
  const [nationalityFilter,setNationalityFilter] = useState('all')
  const [players,setPlayers] = useState<Player[]>([])
  const [rosterPlayerIds,setRosterPlayerIds] = useState<Set<number>>(new Set())
  const [agencies,setAgencies] = useState<string[]>([])
  const [positions,setPositions] = useState<string[]>([])
  const [nationalities,setNationalities] = useState<string[]>([])
  const [expandedPlayerId,setExpandedPlayerId] = useState<number | null>(null)
  const [notes,setNotes] = useState<Record<number,string>>({})
  const [savedNotes,setSavedNotes] = useState<Set<number>>(new Set()) // Track which players have saved notes
  const [loading,setLoading] = useState(false)
  const [addingPlayerId,setAddingPlayerId] = useState<number | null>(null)
  const [savingNotePlayerId,setSavingNotePlayerId] = useState<number | null>(null)

  // Infinite scroll state
  const [displayCount,setDisplayCount] = useState(50)
  const [loadingMore,setLoadingMore] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Combobox states
  const [openAgency,setOpenAgency] = useState(false)
  const [openPosition,setOpenPosition] = useState(false)
  const [openNationality,setOpenNationality] = useState(false)

  // Dropdown search states
  const [agencySearch,setAgencySearch] = useState('')
  const [positionSearch,setPositionSearch] = useState('')
  const [nationalitySearch,setNationalitySearch] = useState('')

  const supabase = createClient()

  // Fetch all players and roster players
  useEffect(() => {
    if (!isOpen) return

    const fetchData = async () => {
      try {
        setLoading(true)

        if (!supabase) return

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch all players with club and league info
        // NEW CODE - Fetch all players with pagination
        let playersData: any[] = []
        let from = 0
        const pageSize = 1000

        while (true) {
          const { data,error } = await supabase
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
              player_agent,
              club_id,
              clubs_transfermarkt(
                name,
                logo_url,
                leagues_transfermarkt(
                  name,
                  country
                )
              )
            `)
            .order('name')
            .range(from,from + pageSize - 1)

          if (error) throw error
          if (!data || data.length === 0) break

          playersData = [...playersData,...data]

          if (data.length < pageSize) break
          from += pageSize
        }

        // Fetch already rostered players
        const { data: rosteredData,error: rosteredError } = await supabase
          .from('agent_rosters')
          .select('player_id')
          .eq('agent_id',user.id)

        if (rosteredError) throw rosteredError

        // Fetch saved player notes
        const { data: notesData,error: notesError } = await supabase
          .from('agent_player_notes')
          .select('player_id, notes')
          .eq('agent_id',user.id)

        if (notesError) throw notesError

        // Create a set of rostered player IDs
        const rosteredIds = new Set((rosteredData || []).map((r: any) => r.player_id))
        setRosterPlayerIds(rosteredIds)

        // Load saved notes into state
        const notesMap: Record<number,string> = {}
        const savedNotesSet = new Set<number>()
          ; (notesData || []).forEach((note: any) => {
            if (note.notes) {
              notesMap[note.player_id] = note.notes
              savedNotesSet.add(note.player_id)
            }
          })
        setNotes(notesMap)
        setSavedNotes(savedNotesSet)

        // Transform and filter out already rostered players
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
          player_agent: player.player_agent,
          club_id: player.club_id,
          club_name: player.clubs_transfermarkt?.name || null,
          club_logo_url: player.clubs_transfermarkt?.logo_url || null,
          league_name: player.clubs_transfermarkt?.leagues_transfermarkt?.name || null,
          league_country: player.clubs_transfermarkt?.leagues_transfermarkt?.country || null
        }))

        const availablePlayers = transformedPlayers.filter(player => !rosteredIds.has(player.id))
        setPlayers(availablePlayers)

        // Extract unique agencies, positions, and nationalities
        const uniqueAgencies = [...new Set(
          availablePlayers
            .map(p => p.player_agent)
            .filter(Boolean) as string[]
        )].sort()

        const uniquePositions = [...new Set(
          availablePlayers
            .map(p => p.main_position)
            .filter(Boolean) as string[]
        )].sort()

        // Extract individual nationalities from dual nationality strings (e.g., "Lithuania / France")
        const allNationalities = availablePlayers
          .map(p => p.nationality)
          .filter(Boolean)
          .flatMap(nat => (nat as string).split(' / ').map(n => n.trim()))

        const uniqueNationalities = [...new Set(allNationalities)].sort()

        setAgencies(uniqueAgencies)
        setPositions(uniquePositions)
        setNationalities(uniqueNationalities)
      } catch (err) {
        console.error('Error fetching data:',err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  },[isOpen,supabase])

  // Apply filters with useMemo for performance
  const filteredPlayers = useMemo(() => {
    let filtered = players

    // Agency filter
    if (agencyFilter !== 'all') {
      filtered = filtered.filter(player => player.player_agent === agencyFilter)
    }

    // Position filter
    if (positionFilter !== 'all') {
      filtered = filtered.filter(player => player.main_position === positionFilter)
    }

    // Nationality filter (handle dual nationalities like "Lithuania / France")
    if (nationalityFilter !== 'all') {
      filtered = filtered.filter(player => {
        if (!player.nationality) return false
        const nationalities = player.nationality.split(' / ').map(n => n.trim())
        return nationalities.includes(nationalityFilter)
      })
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(player =>
        player.name.toLowerCase().includes(searchLower) ||
        player.club_name?.toLowerCase().includes(searchLower) ||
        player.player_agent?.toLowerCase().includes(searchLower)
      )
    }

    // Sort: Players with saved notes first, then alphabetically
    filtered.sort((a,b) => {
      const aHasNote = savedNotes.has(a.id)
      const bHasNote = savedNotes.has(b.id)

      // If one has notes and the other doesn't, prioritize the one with notes
      if (aHasNote && !bHasNote) return -1
      if (!aHasNote && bHasNote) return 1

      // Otherwise, sort alphabetically by name
      return a.name.localeCompare(b.name)
    })

    return filtered
  },[players,agencyFilter,positionFilter,nationalityFilter,searchTerm,savedNotes])

  // Display only a subset of filtered players for performance
  const displayedPlayers = useMemo(() => {
    return filteredPlayers.slice(0,displayCount)
  },[filteredPlayers,displayCount])

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(50)
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  },[agencyFilter,positionFilter,nationalityFilter,searchTerm])

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || loadingMore) return

    const { scrollTop,scrollHeight,clientHeight } = container
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight

    // Load more when scrolled 80% down
    if (scrollPercentage > 0.8 && displayCount < filteredPlayers.length) {
      setLoadingMore(true)
      // Simulate a small delay for smooth UX
      setTimeout(() => {
        setDisplayCount(prev => Math.min(prev + 50,filteredPlayers.length))
        setLoadingMore(false)
      },300)
    }
  },[displayCount,filteredPlayers.length,loadingMore])

  // Attach scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    container.addEventListener('scroll',handleScroll)
    return () => container.removeEventListener('scroll',handleScroll)
  },[handleScroll])

  const handleAddPlayer = async (player: Player) => {
    try {
      setAddingPlayerId(player.id)

      if (!supabase) return

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

      // Success - remove from list and update parent
      setPlayers(prev => prev.filter(p => p.id !== player.id))
      setRosterPlayerIds(prev => new Set([...prev,player.id]))
      setExpandedPlayerId(null)
      setNotes(prev => {
        const newNotes = { ...prev }
        delete newNotes[player.id]
        return newNotes
      })

      // Notify parent to refresh
      onPlayerAdded()

      // Show success toast
      toast.success(`${player.name} added to your roster!`)
    } catch (err: any) {
      console.error('Error adding player:',err)
      alert('Failed to add player: ' + err.message)
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

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const noteText = notes[player.id]?.trim()

      if (!noteText) {
        // If note is empty, delete it from database
        const { error } = await supabase
          .from('agent_player_notes')
          .delete()
          .eq('agent_id',user.id)
          .eq('player_id',player.id)

        if (error) throw error

        // Remove from saved notes set
        setSavedNotes(prev => {
          const newSet = new Set(prev)
          newSet.delete(player.id)
          return newSet
        })

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
          },{
            onConflict: 'agent_id,player_id'
          })

        if (error) throw error

        // Add to saved notes set
        setSavedNotes(prev => new Set([...prev,player.id]))

        toast.success(`Note saved for ${player.name}`)
      }
    } catch (err: any) {
      console.error('Error saving note:',err)
      alert('Failed to save note: ' + err.message)
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
    return new Date(dateString).toLocaleDateString('en-GB',{
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const handleClose = () => {
    setSearchTerm('')
    setAgencyFilter('all')
    setPositionFilter('all')
    setNationalityFilter('all')
    setExpandedPlayerId(null)
    setNotes({})
    setDisplayCount(50)
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
          {loading ? 'Loading...' : (
            filteredPlayers.length > 0
              ? `Showing ${displayedPlayers.length} of ${filteredPlayers.length} players${displayedPlayers.length < filteredPlayers.length ? ' (scroll for more)' : ''}`
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
          ) : filteredPlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mb-4 opacity-50" />
              <p>No players found</p>
              <p className="text-sm">
                {rosterPlayerIds.size > 0 && players.length === 0
                  ? 'All players have been added to your roster!'
                  : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {displayedPlayers.map(player => (
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
                          {savedNotes.has(player.id) && (
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
                        title={savedNotes.has(player.id) ? "View/edit saved note" : "Add notes about this player"}
                      >
                        {savedNotes.has(player.id) ? (
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
                        Notes {savedNotes.has(player.id) ? '(Previously saved)' : '(Optional)'}
                      </Label>
                      <Textarea
                        id={`notes-${player.id}`}
                        placeholder="e.g., Strong defender, good in the air, interested in Spain..."
                        value={notes[player.id] || ''}
                        onChange={(e) => setNotes(prev => ({ ...prev,[player.id]: e.target.value }))}
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
              {!loadingMore && displayedPlayers.length >= filteredPlayers.length && filteredPlayers.length > 50 && (
                <div className="flex justify-center items-center py-4">
                  <span className="text-sm text-muted-foreground">All {filteredPlayers.length} players loaded</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground flex-shrink-0">
          <p>💡 Tip: Save notes for players you're interested in - they'll appear first in the list. Add notes without adding to roster to track prospects.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
