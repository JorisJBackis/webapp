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
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, User, Ruler, Euro, Calendar, ExternalLink, AlertCircle } from 'lucide-react'
import { getCountryFlag } from '@/lib/utils/country-flags'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ClubPlayer {
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
}

interface ClubPlayersModalProps {
  isOpen: boolean
  onClose: () => void
  clubId: number | null
  clubName: string
  clubLogoUrl: string | null
}

export default function ClubPlayersModal({ isOpen, onClose, clubId, clubName, clubLogoUrl }: ClubPlayersModalProps) {
  const [players, setPlayers] = useState<ClubPlayer[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [positionFilter, setPositionFilter] = useState('all')

  const supabase = createClient()

  useEffect(() => {
    if (!isOpen || !clubId) return

    const fetchPlayers = async () => {
      try {
        setLoading(true)

        const { data, error } = await supabase
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
            transfermarkt_url
          `)
          .eq('club_id', clubId)
          .order('market_value_eur', { ascending: false, nullsFirst: false })

        if (error) throw error

        setPlayers(data || [])
      } catch (err) {
        console.error('Error fetching club players:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [isOpen, clubId, supabase])

  const uniquePositions = [...new Set(players.map(p => p.main_position).filter(Boolean))].sort()

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPosition = positionFilter === 'all' || player.main_position === positionFilter
    return matchesSearch && matchesPosition
  })

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

  const handleClose = () => {
    setSearchTerm('')
    setPositionFilter('all')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            {clubLogoUrl && (
              <img src={clubLogoUrl} alt={clubName} className="w-12 h-12 object-contain" />
            )}
            <div>
              <DialogTitle>{clubName} - Squad</DialogTitle>
              <DialogDescription>
                {loading ? 'Loading...' : `${filteredPlayers.length} of ${players.length} players`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0">
          <div>
            <Label htmlFor="player-search">Search</Label>
            <Input
              id="player-search"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="position-filter">Position</Label>
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger id="position-filter">
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
        </div>

        {/* Players Grid */}
        <div className="overflow-y-auto flex-1 min-h-0 pr-2 -mr-2">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No players found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
              {filteredPlayers.map((player) => (
                <Card key={player.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    {/* Header with player photo */}
                    <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-4">
                      <div className="flex items-start gap-3">
                        {/* Player Photo - Clickable */}
                        <div className="flex-shrink-0">
                          {player.transfermarkt_url ? (
                            <a
                              href={player.transfermarkt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block hover:opacity-80 transition-opacity"
                            >
                              {player.picture_url ? (
                                <img
                                  src={player.picture_url}
                                  alt={player.name}
                                  className="w-16 h-16 rounded-lg object-cover border-2 border-background shadow-md cursor-pointer"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md cursor-pointer">
                                  <User className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                            </a>
                          ) : (
                            <>
                              {player.picture_url ? (
                                <img
                                  src={player.picture_url}
                                  alt={player.name}
                                  className="w-16 h-16 rounded-lg object-cover border-2 border-background shadow-md"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md">
                                  <User className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          {/* Player Name - Clickable */}
                          {player.transfermarkt_url ? (
                            <a
                              href={player.transfermarkt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              <h4 className="font-bold text-sm truncate">{player.name}</h4>
                            </a>
                          ) : (
                            <h4 className="font-bold text-sm truncate">{player.name}</h4>
                          )}

                          {/* Position & Age */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge className="bg-primary text-primary-foreground text-xs">
                              {player.main_position || 'Unknown'}
                            </Badge>
                            {player.age && (
                              <Badge variant="secondary" className="text-xs">
                                {player.age} yrs
                              </Badge>
                            )}
                          </div>

                          {/* Nationality */}
                          {player.nationality && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <span>{getCountryFlag(player.nationality)}</span>
                              <span className="truncate">{player.nationality}</span>
                            </div>
                          )}
                        </div>

                        {/* Transfermarkt Link */}
                        {player.transfermarkt_url && (
                          <a
                            href={player.transfermarkt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0"
                          >
                            <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-3 space-y-2">
                      {/* Player Stats */}
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Ruler className="h-3 w-3" />
                          <span>{player.height ? `${player.height} cm` : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <span className="text-xs">⚽</span>
                          <span>{player.foot || 'N/A'}</span>
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
                      <div className="flex flex-wrap gap-1">
                        {player.is_eu_passport && (
                          <Badge variant="outline" className="text-xs">
                            🇪🇺 EU
                          </Badge>
                        )}
                        {isContractExpiringSoon(player.contract_expires) && (
                          <Badge variant="destructive" className="text-xs flex items-center gap-1">
                            <AlertCircle className="h-2 w-2" />
                            Expiring Soon
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
