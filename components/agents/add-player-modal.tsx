"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, UserPlus, CheckCircle2 } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { RosterPlayer } from '@/app/dashboard/agents/roster/page'

interface AddPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  onPlayerAdded: (player: RosterPlayer) => void
  agentId: string
  existingPlayerIds: number[]
}

type PlayerSearchResult = {
  id: number
  name: string
  age: number | null
  main_position: string | null
  club_id: number | null
  nationality: string | null
  height: number | null
  foot: string | null
  contract_expires: string | null
  market_value_eur: number | null
  is_eu_passport: boolean | null
}

export default function AddPlayerModal({
  isOpen,
  onClose,
  onPlayerAdded,
  agentId,
  existingPlayerIds
}: AddPlayerModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [positionFilter, setPositionFilter] = useState('all')
  const [euPassportFilter, setEuPassportFilter] = useState('all')
  const [players, setPlayers] = useState<PlayerSearchResult[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<number | null>(null)
  const [addedPlayerIds, setAddedPlayerIds] = useState<Set<number>>(new Set())

  const supabase = createClient()

  // Fetch players when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPlayers()
      setAddedPlayerIds(new Set()) // Reset added players when opening
    }
  }, [isOpen])

  // Filter players based on search term and filters
  useEffect(() => {
    let filtered = players

    // Search by name
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by position
    if (positionFilter !== 'all') {
      filtered = filtered.filter(p => p.main_position === positionFilter)
    }

    // Filter by EU passport
    if (euPassportFilter !== 'all') {
      const hasPassport = euPassportFilter === 'yes'
      filtered = filtered.filter(p => p.is_eu_passport === hasPassport)
    }

    // Exclude players already in roster or just added
    filtered = filtered.filter(p =>
      !existingPlayerIds.includes(p.id) && !addedPlayerIds.has(p.id)
    )

    setFilteredPlayers(filtered)
  }, [searchTerm, positionFilter, euPassportFilter, players, existingPlayerIds, addedPlayerIds])

  const fetchPlayers = async () => {
    try {
      setLoading(true)

      if (!supabase) return

      const { data, error } = await supabase
        .from('players_transfermarkt')
        .select('id, name, age, main_position, club_id, nationality, height, foot, contract_expires, market_value_eur, is_eu_passport')
        .order('name')
        .limit(500) // Limit for performance

      if (error) throw error

      setPlayers(data || [])
    } catch (err: any) {
      console.error('Error fetching players:', err)
      alert('Failed to load players')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPlayer = async (player: PlayerSearchResult) => {
    try {
      setAdding(player.id)

      if (!supabase) return

      // Add player to roster
      const { error: addError } = await supabase.rpc('add_player_to_roster', {
        p_agent_id: agentId,
        p_player_id: player.id,
        p_notes: null
      })

      if (addError) {
        console.error('Add player error:', addError)
        throw addError
      }

      // Fetch the full player data with club info for the roster
      const { data: fullData, error: fetchError } = await supabase.rpc('get_agent_roster', {
        p_agent_id: agentId
      })

      if (fetchError) {
        console.error('Fetch roster error:', fetchError)
        throw fetchError
      }

      // Find the newly added player
      const newPlayer = fullData?.find((p: RosterPlayer) => p.player_id === player.id)

      if (newPlayer) {
        // Mark player as added so it disappears from the list
        setAddedPlayerIds(prev => new Set([...prev, player.id]))
        onPlayerAdded(newPlayer)
        // Show success feedback
        // Could add a toast notification here in the future
      } else {
        throw new Error('Player was added but not found in roster')
      }
    } catch (err: any) {
      console.error('Error adding player:', err)
      alert('Failed to add player: ' + err.message)
    } finally {
      setAdding(null)
    }
  }

  const formatCurrency = (value: number | null) => {
    if (value == null) return '-'
    return `€${value.toLocaleString()}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Player to Roster</DialogTitle>
          <DialogDescription>
            Search and add players from the database to your roster
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search by name</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Player name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="position">Position</Label>
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  <SelectItem value="Goalkeeper">Goalkeeper</SelectItem>
                  <SelectItem value="Centre Back">Centre Back</SelectItem>
                  <SelectItem value="Full Back">Full Back</SelectItem>
                  <SelectItem value="Defensive Midfielder">Defensive Midfielder</SelectItem>
                  <SelectItem value="Central Midfielder">Central Midfielder</SelectItem>
                  <SelectItem value="Attacking Midfielder">Attacking Midfielder</SelectItem>
                  <SelectItem value="Winger">Winger</SelectItem>
                  <SelectItem value="Centre Forward">Centre Forward</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="eu-passport">EU Passport</Label>
              <Select value={euPassportFilter} onValueChange={setEuPassportFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="yes">EU Passport</SelectItem>
                  <SelectItem value="no">No EU Passport</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading players...
              </div>
            ) : (
              <p>Found {filteredPlayers.length} players</p>
            )}
          </div>

          {/* Player table */}
          <div className="flex-1 overflow-auto rounded-md border">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg mb-2">No players found</p>
                <p>Try adjusting your search criteria</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Nationality</TableHead>
                    <TableHead>Height</TableHead>
                    <TableHead>Foot</TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>EU</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{player.main_position || '-'}</Badge>
                      </TableCell>
                      <TableCell>{player.age ?? '-'}</TableCell>
                      <TableCell>{player.nationality || '-'}</TableCell>
                      <TableCell>{player.height ? `${player.height} cm` : '-'}</TableCell>
                      <TableCell>{player.foot || '-'}</TableCell>
                      <TableCell>{formatDate(player.contract_expires)}</TableCell>
                      <TableCell>{formatCurrency(player.market_value_eur)}</TableCell>
                      <TableCell>
                        {player.is_eu_passport === true ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : player.is_eu_passport === false ? (
                          '-'
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleAddPlayer(player)}
                          disabled={adding === player.id}
                        >
                          {adding === player.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Add
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}