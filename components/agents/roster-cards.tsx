"use client"

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Trash2,
  Edit,
  Save,
  X,
  ExternalLink,
  User,
  Calendar,
  Euro,
  Ruler,
  MapPin,
  Filter,
  AlertCircle
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { RosterPlayer } from '@/app/dashboard/agents/roster/page'
import { getCountryFlag } from '@/lib/utils/country-flags'

interface RosterCardsProps {
  roster: RosterPlayer[]
  onPlayerRemoved: (playerId: number) => void
  onNotesUpdated: (playerId: number, newNotes: string) => void
}

export default function RosterCards({ roster, onPlayerRemoved, onNotesUpdated }: RosterCardsProps) {
  const [editingNotes, setEditingNotes] = useState<number | null>(null)
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [removingPlayer, setRemovingPlayer] = useState<number | null>(null)
  const [playerToRemove, setPlayerToRemove] = useState<RosterPlayer | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [positionFilter, setPositionFilter] = useState('all')
  const [euPassportFilter, setEuPassportFilter] = useState('all')
  const [tierFilter, setTierFilter] = useState('all')

  const supabase = createClient()

  // Get unique positions and tiers for filters
  const uniquePositions = useMemo(() => {
    const positions = [...new Set(roster.map(p => p.position).filter(Boolean))]
    return positions.sort()
  }, [roster])

  const uniqueTiers = useMemo(() => {
    const tiers = [...new Set(roster.map(p => p.league_tier).filter(Boolean))]
    return tiers.sort((a, b) => a! - b!)
  }, [roster])

  // Apply filters
  const filteredRoster = useMemo(() => {
    let filtered = roster

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.club_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nationality?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Position filter
    if (positionFilter !== 'all') {
      filtered = filtered.filter(p => p.position === positionFilter)
    }

    // EU Passport filter
    if (euPassportFilter === 'yes') {
      filtered = filtered.filter(p => p.is_eu_passport === true)
    } else if (euPassportFilter === 'no') {
      filtered = filtered.filter(p => p.is_eu_passport === false)
    }

    // Tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter(p => p.league_tier === parseInt(tierFilter))
    }

    return filtered
  }, [roster, searchTerm, positionFilter, euPassportFilter, tierFilter])

  const handleStartEditNotes = (player: RosterPlayer) => {
    setEditingNotes(player.player_id)
    setNotesValue(player.agent_notes || '')
  }

  const handleCancelEditNotes = () => {
    setEditingNotes(null)
    setNotesValue('')
  }

  const handleSaveNotes = async (playerId: number) => {
    try {
      setSavingNotes(true)

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('agent_rosters')
        .update({ notes: notesValue || null, updated_at: new Date().toISOString() })
        .eq('agent_id', user.id)
        .eq('player_id', playerId)

      if (error) throw error

      onNotesUpdated(playerId, notesValue)
      setEditingNotes(null)
      setNotesValue('')
    } catch (err: any) {
      console.error('Error saving notes:', err)
      alert('Failed to save notes: ' + err.message)
    } finally {
      setSavingNotes(false)
    }
  }

  const handleRemovePlayer = async () => {
    if (!playerToRemove) return

    try {
      setRemovingPlayer(playerToRemove.player_id)

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.rpc('remove_player_from_roster', {
        p_agent_id: user.id,
        p_player_id: playerToRemove.player_id
      })

      if (error) throw error

      onPlayerRemoved(playerToRemove.player_id)
      setPlayerToRemove(null)
    } catch (err: any) {
      console.error('Error removing player:', err)
      alert('Failed to remove player: ' + err.message)
    } finally {
      setRemovingPlayer(null)
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

  const isContractExpiringSoon = (contractExpires: string | null): boolean => {
    if (!contractExpires) return false
    const expiryDate = new Date(contractExpires)
    const sixMonthsFromNow = new Date()
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
    return expiryDate <= sixMonthsFromNow && expiryDate >= new Date()
  }

  return (
    <>
      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border">
        <div>
          <Label htmlFor="search" className="text-xs">Search</Label>
          <Input
            id="search"
            placeholder="Player, club, nationality..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9"
          />
        </div>

        <div>
          <Label htmlFor="position" className="text-xs">Position</Label>
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger id="position" className="h-9">
              <SelectValue placeholder="All positions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              {uniquePositions.map(pos => (
                <SelectItem key={pos} value={pos!}>{pos}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="eu-passport" className="text-xs">EU Passport</Label>
          <Select value={euPassportFilter} onValueChange={setEuPassportFilter}>
            <SelectTrigger id="eu-passport" className="h-9">
              <SelectValue placeholder="All players" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Players</SelectItem>
              <SelectItem value="yes">🇪🇺 EU Passport</SelectItem>
              <SelectItem value="no">Non-EU</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="tier" className="text-xs">League Tier</Label>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger id="tier" className="h-9">
              <SelectValue placeholder="All tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              {uniqueTiers.map(tier => (
                <SelectItem key={tier} value={tier!.toString()}>
                  Tier {tier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground mb-4">
        Showing {filteredRoster.length} of {roster.length} players
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoster.map((player) => (
          <Card key={player.player_id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
            <CardContent className="p-0 flex flex-col flex-1">
              {/* Header with player photo */}
              <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-6">
                <div className="flex items-start gap-4">
                  {/* Player Photo - Clickable */}
                  <div className="flex-shrink-0">
                    {player.player_transfermarkt_url ? (
                      <a
                        href={player.player_transfermarkt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:opacity-80 transition-opacity"
                      >
                        {player.picture_url ? (
                          <img
                            src={player.picture_url}
                            alt={player.player_name}
                            className="w-24 h-24 rounded-lg object-cover border-2 border-background shadow-md cursor-pointer"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md cursor-pointer">
                            <User className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </a>
                    ) : (
                      <>
                        {player.picture_url ? (
                          <img
                            src={player.picture_url}
                            alt={player.player_name}
                            className="w-24 h-24 rounded-lg object-cover border-2 border-background shadow-md"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md">
                            <User className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    {/* Player Name - Clickable */}
                    {player.player_transfermarkt_url ? (
                      <a
                        href={player.player_transfermarkt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        <h3 className="font-bold text-lg truncate mb-1">{player.player_name}</h3>
                      </a>
                    ) : (
                      <h3 className="font-bold text-lg truncate mb-1">{player.player_name}</h3>
                    )}

                    {/* Position & Age */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge className="bg-primary text-primary-foreground">
                        {player.position || 'Unknown'}
                      </Badge>
                      <Badge variant="secondary">
                        {player.age} years
                      </Badge>
                    </div>

                    {/* Nationality */}
                    {player.nationality && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <span className="text-lg">{getCountryFlag(player.nationality)}</span>
                        <span>{player.nationality}</span>
                      </div>
                    )}
                  </div>

                  {/* Transfermarkt Link */}
                  {player.player_transfermarkt_url && (
                    <a
                      href={player.player_transfermarkt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0"
                    >
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="p-4 flex flex-col flex-1">
                {/* Top Section - Club and Stats */}
                <div className="space-y-3 pb-3">
                  {/* Current Club */}
                  {player.club_name && (
                    <div className="flex items-center gap-2 pb-3 border-b">
                    {/* Club Logo - Clickable */}
                    {player.club_logo_url && (
                      <>
                        {player.club_transfermarkt_url ? (
                          <a
                            href={player.club_transfermarkt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 hover:opacity-80 transition-opacity"
                          >
                            <img
                              src={player.club_logo_url}
                              alt={player.club_name}
                              className="w-6 h-6 object-contain cursor-pointer"
                            />
                          </a>
                        ) : (
                          <img
                            src={player.club_logo_url}
                            alt={player.club_name}
                            className="w-6 h-6 object-contain"
                          />
                        )}
                      </>
                    )}
                    <div className="flex-1 min-w-0">
                      {/* Club Name - Clickable */}
                      {player.club_transfermarkt_url ? (
                        <a
                          href={player.club_transfermarkt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          <p className="font-medium text-sm truncate">{player.club_name}</p>
                        </a>
                      ) : (
                        <p className="font-medium text-sm truncate">{player.club_name}</p>
                      )}
                      {/* League Name - Clickable */}
                      {player.league_name && (
                        <>
                          {player.league_transfermarkt_url ? (
                            <a
                              href={player.league_transfermarkt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                <span>{getCountryFlag(player.league_country || player.club_country)}</span>
                                <span>{player.league_name}</span>
                              </p>
                            </a>
                          ) : (
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <span>{getCountryFlag(player.league_country || player.club_country)}</span>
                              <span>{player.league_name}</span>
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {player.league_tier && (
                      <Badge variant="secondary" className="text-xs">
                        Tier {player.league_tier}
                      </Badge>
                      )}
                    </div>
                  )}

                  {/* Player Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Ruler className="h-3 w-3" />
                      <span>{player.height ? `${player.height} cm` : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <span className="text-xs">⚽</span>
                      <span>{player.foot || 'N/A'} foot</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Euro className="h-3 w-3" />
                      <span>{formatMarketValue(player.market_value_eur)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span className="text-xs">{formatDate(player.contract_expires)}</span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    {player.is_eu_passport && (
                      <Badge variant="outline" className="text-xs w-fit">
                        🇪🇺 EU Passport
                      </Badge>
                    )}
                    {isContractExpiringSoon(player.contract_expires) && (
                      <Badge variant="destructive" className="text-xs w-fit flex items-center gap-1">
                        <AlertCircle className="h-2 w-2" />
                        Expiring Soon
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Bottom Section - Notes and Actions - Always at bottom */}
                <div className="mt-auto pt-4 space-y-2 border-t">
                  {/* Notes Section */}
                  <div>
                    {editingNotes === player.player_id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          placeholder="Add notes about this player..."
                          rows={3}
                          className="text-sm resize-none"
                          disabled={savingNotes}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveNotes(player.player_id)}
                            disabled={savingNotes}
                            className="flex-1"
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEditNotes}
                            disabled={savingNotes}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                        <p className="text-sm min-h-[3rem] p-2 bg-muted/30 rounded border">
                          {player.agent_notes || 'No notes yet'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {editingNotes !== player.player_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartEditNotes(player)}
                        className="flex-1"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit Notes
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setPlayerToRemove(player)}
                      disabled={removingPlayer === player.player_id}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Remove player confirmation dialog */}
      <AlertDialog open={!!playerToRemove} onOpenChange={(open) => !open && setPlayerToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Player from Roster?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{playerToRemove?.player_name}</strong> from your roster?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!removingPlayer}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemovePlayer}
              disabled={!!removingPlayer}
              className="bg-destructive hover:bg-destructive/90"
            >
              {removingPlayer ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
