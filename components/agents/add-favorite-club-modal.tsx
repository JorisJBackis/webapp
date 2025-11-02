"use client"

import { useState, useEffect } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2, Building2, Plus, Check } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

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

export default function AddFavoriteClubModal({ isOpen, onClose, onClubAdded }: AddFavoriteClubModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [competitionFilter, setCompetitionFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const [clubs, setClubs] = useState<Club[]>([])
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([])
  const [favoritedClubIds, setFavoritedClubIds] = useState<Set<number>>(new Set())
  const [leagueOptions, setLeagueOptions] = useState<LeagueOption[]>([])
  const [countries, setCountries] = useState<string[]>([])
  const [expandedClubId, setExpandedClubId] = useState<number | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [addingClubId, setAddingClubId] = useState<number | null>(null)

  const supabase = createClient()

  // Fetch all clubs and favorited clubs
  useEffect(() => {
    if (!isOpen) return

    const fetchData = async () => {
      try {
        setLoading(true)

        if (!supabase) return

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch all clubs with league info
        const { data: clubsData, error: clubsError } = await supabase
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
        const { data: favoritedData, error: favoritedError } = await supabase.rpc('get_agent_favorite_clubs', {
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
        const leaguesMap = new Map<string, number>()
        availableClubs.forEach(club => {
          if (club.league_name && club.league_tier) {
            leaguesMap.set(club.league_name, club.league_tier)
          }
        })

        const uniqueLeagues = Array.from(leaguesMap.entries())
          .map(([name, tier]) => ({ name, tier }))
          .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name))

        const uniqueCountries = [...new Set(
          availableClubs
            .map(c => c.country)
            .filter(Boolean) as string[]
        )].sort()

        setLeagueOptions(uniqueLeagues)
        setCountries(uniqueCountries)
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isOpen, supabase])

  // Reset league filter when country changes
  useEffect(() => {
    setCompetitionFilter('all')
  }, [countryFilter])

  // Get filtered leagues based on selected country
  const filteredLeagues = countryFilter === 'all'
    ? leagueOptions
    : (() => {
        const leaguesMap = new Map<string, number>()
        clubs
          .filter(club => club.country === countryFilter)
          .forEach(club => {
            if (club.league_name && club.league_tier) {
              leaguesMap.set(club.league_name, club.league_tier)
            }
          })
        return Array.from(leaguesMap.entries())
          .map(([name, tier]) => ({ name, tier }))
          .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name))
      })()

  // Apply filters
  useEffect(() => {
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
      filtered = filtered.filter(club =>
        club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        club.league_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredClubs(filtered)
  }, [clubs, competitionFilter, countryFilter, searchTerm])

  const handleAddClub = async (club: Club) => {
    try {
      setAddingClubId(club.id)

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.rpc('add_favorite_club', {
        p_agent_id: user.id,
        p_club_id: club.id,
        p_notes: notes[club.id] || null
      })

      if (error) throw error

      // Success - remove from list and update parent
      setClubs(prev => prev.filter(c => c.id !== club.id))
      setFavoritedClubIds(prev => new Set([...prev, club.id]))
      setExpandedClubId(null)
      setNotes(prev => {
        const newNotes = { ...prev }
        delete newNotes[club.id]
        return newNotes
      })

      // Notify parent to refresh
      onClubAdded()

      // Show success toast
      toast.success(`${club.name} added to favorites!`)
    } catch (err: any) {
      console.error('Error adding club:', err)
      alert('Failed to add club: ' + err.message)
    } finally {
      setAddingClubId(null)
    }
  }

  const handleToggleNotes = (clubId: number) => {
    setExpandedClubId(expandedClubId === clubId ? null : clubId)
  }

  const handleClose = () => {
    setSearchTerm('')
    setCompetitionFilter('all')
    setCountryFilter('all')
    setExpandedClubId(null)
    setNotes({})
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add Club to Favorites</DialogTitle>
          <DialogDescription>
            Filter by country first, then narrow down by league. Click "+ Note" to add optional notes.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="search">Search clubs</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="country">Country</Label>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger id="country">
                <SelectValue placeholder="All countries" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map(country => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="league">League</Label>
            <Select value={competitionFilter} onValueChange={setCompetitionFilter}>
              <SelectTrigger id="league">
                <SelectValue placeholder="All leagues" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">All Leagues</SelectItem>
                {filteredLeagues.map(league => (
                  <SelectItem key={league.name} value={league.name}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs text-muted-foreground">Tier {league.tier}</span>
                      <span>·</span>
                      <span>{league.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        <div className="text-sm text-muted-foreground mb-2">
          {loading ? 'Loading...' : `${filteredClubs.length} clubs found`}
        </div>

        <ScrollArea className="h-[400px] border rounded-md">
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
              {filteredClubs.map(club => (
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
                        disabled={addingClubId === club.id}
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
                        onChange={(e) => setNotes(prev => ({ ...prev, [club.id]: e.target.value }))}
                        rows={2}
                        className="mt-1 text-sm resize-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="text-xs text-muted-foreground">
          <p>💡 Tip: Click "+ Note" to add notes before adding, or edit them later in My Clubs</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
