"use client"

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Loader2, ExternalLink, Check, X, ArrowUpDown } from "lucide-react"
import { AgentWishlist } from './wishlist-form-modal'
import WishlistFilterSummary from './wishlist-filter-summary'
import { getCountryFlag } from '@/lib/utils/country-flags'

// Type for matched player data from RPC function
export interface MatchedPlayer {
  player_id: number
  player_name: string
  position: string | null
  age: number | null
  height: number | null
  foot: string | null
  nationality: string | null
  is_eu_passport: boolean | null
  league_tier: number | null
  league_name: string | null
  league_country: string | null
  contract_expires: string | null
  market_value_eur: number | null
  club_name: string | null
  club_logo_url: string | null
  picture_url: string | null
  transfermarkt_url: string | null
  match_score: number
  matched_filters: Record<string, boolean>
  total_filter_count: number
}

interface WishlistMatchesModalProps {
  isOpen: boolean
  onClose: () => void
  wishlist: AgentWishlist | null
  matchedPlayers: MatchedPlayer[]
  loading: boolean
}

// Format market value for display
function formatMarketValue(value: number | null): string {
  if (value == null) return '-'
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`
  }
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(0)}K`
  }
  return `€${value}`
}

// Get badge variant based on score
function getScoreBadgeVariant(score: number): "default" | "secondary" | "destructive" | "outline" {
  if (score >= 80) return "default"
  if (score >= 50) return "secondary"
  return "destructive"
}

// Get badge class based on score for custom colors
function getScoreBadgeClass(score: number): string {
  if (score >= 80) return "bg-green-500 hover:bg-green-600"
  if (score >= 50) return "bg-yellow-500 hover:bg-yellow-600 text-black"
  return "bg-red-500 hover:bg-red-600"
}

type SortField = 'match_score' | 'player_name' | 'age' | 'market_value_eur'
type SortDirection = 'asc' | 'desc'

export default function WishlistMatchesModal({
  isOpen,
  onClose,
  wishlist,
  matchedPlayers,
  loading
}: WishlistMatchesModalProps) {
  const [sortField, setSortField] = useState<SortField>('match_score')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [minScoreFilter, setMinScoreFilter] = useState<string>('0')

  // Get selected positions from wishlist filters
  const selectedPositions = wishlist?.filters?.positions || []

  // Sort and filter players - PRIMARY: position match, SECONDARY: by match score
  const filteredAndSortedPlayers = useMemo(() => {
    let players = [...matchedPlayers]

    // Apply minimum score filter
    const minScore = parseInt(minScoreFilter)
    if (minScore > 0) {
      players = players.filter(p => p.match_score >= minScore)
    }

    // Sort players: position matches FIRST, then by score
    players.sort((a, b) => {
      // Primary sort: players matching selected position come first
      if (selectedPositions.length > 0) {
        const aMatchesPosition = selectedPositions.includes(a.position || '')
        const bMatchesPosition = selectedPositions.includes(b.position || '')

        if (aMatchesPosition && !bMatchesPosition) return -1
        if (!aMatchesPosition && bMatchesPosition) return 1
      }

      // Secondary sort: by match score (highest first)
      if (a.match_score !== b.match_score) {
        return b.match_score - a.match_score
      }

      // Tertiary sort: by name
      return (a.player_name || '').localeCompare(b.player_name || '')
    })

    return players
  }, [matchedPlayers, minScoreFilter, selectedPositions])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection(field === 'player_name' ? 'asc' : 'desc')
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {wishlist?.club_logo_url && (
              <img
                src={wishlist.club_logo_url}
                alt=""
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            )}
            {wishlist?.name} - Matching Players
          </DialogTitle>
          <DialogDescription>
            Players from your roster that match the wishlist criteria
          </DialogDescription>
        </DialogHeader>

        {/* Filters Summary */}
        {wishlist && (
          <div className="py-2 border-b">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>Active filters:</span>
            </div>
            <WishlistFilterSummary filters={wishlist.filters} />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Min Score:</span>
              <Select value={minScoreFilter} onValueChange={setMinScoreFilter}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All</SelectItem>
                  <SelectItem value="50">50%+</SelectItem>
                  <SelectItem value="75">75%+</SelectItem>
                  <SelectItem value="100">100%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {filteredAndSortedPlayers.length} of {matchedPlayers.length} players
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAndSortedPlayers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">No matching players found</p>
              <p>Try adjusting your filters or add more players to your roster</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('match_score')}
                    >
                      <div className="flex items-center gap-1">
                        Score
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('player_name')}
                    >
                      <div className="flex items-center gap-1">
                        Player
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('age')}
                    >
                      <div className="flex items-center gap-1">
                        Age
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead>Nationality</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('market_value_eur')}
                    >
                      <div className="flex items-center gap-1">
                        Value
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead className="text-center">Filter Matches</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedPlayers.map((player) => (
                    <TableRow key={player.player_id}>
                      <TableCell>
                        <Badge className={getScoreBadgeClass(player.match_score)}>
                          {player.match_score}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {player.picture_url && (
                            <img
                              src={player.picture_url}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          )}
                          <div>
                            <div className="font-medium flex items-center gap-1">
                              {player.player_name}
                              {player.transfermarkt_url && (
                                <a
                                  href={player.transfermarkt_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-primary"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            {player.height && (
                              <div className="text-xs text-muted-foreground">
                                {player.height} cm • {player.foot || 'N/A'}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{player.position || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>{player.age ?? '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {player.club_logo_url && (
                            <img
                              src={player.club_logo_url}
                              alt=""
                              className="h-5 w-5 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          )}
                          <div className="text-sm">
                            <div>{player.club_name || 'Unknown'}</div>
                            {player.league_name && (
                              <div className="text-xs text-muted-foreground">
                                {player.league_name}
                                {player.league_tier && ` (T${player.league_tier})`}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span>{getCountryFlag(player.nationality || '')}</span>
                          <span className="text-sm">{player.nationality || '-'}</span>
                          {player.is_eu_passport && (
                            <Badge variant="outline" className="ml-1 text-xs">EU</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatMarketValue(player.market_value_eur)}</TableCell>
                      <TableCell>
                        {player.contract_expires
                          ? new Date(player.contract_expires).toLocaleDateString()
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {Object.entries(player.matched_filters).map(([key, matched]) => {
                            // Only show filters that were actually set
                            if (key === 'position' && wishlist?.filters.positions?.length) {
                              return (
                                <span key={key} title={`Position: ${matched ? 'Match' : 'No match'}`}>
                                  {matched ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <X className="h-4 w-4 text-red-500" />
                                  )}
                                </span>
                              )
                            }
                            if (key === 'age_min' && wishlist?.filters.age_min != null) {
                              return (
                                <span key={key} title={`Age min: ${matched ? 'Match' : 'No match'}`}>
                                  {matched ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <X className="h-4 w-4 text-red-500" />
                                  )}
                                </span>
                              )
                            }
                            if (key === 'age_max' && wishlist?.filters.age_max != null) {
                              return (
                                <span key={key} title={`Age max: ${matched ? 'Match' : 'No match'}`}>
                                  {matched ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <X className="h-4 w-4 text-red-500" />
                                  )}
                                </span>
                              )
                            }
                            // Add more filter checks as needed
                            return null
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
