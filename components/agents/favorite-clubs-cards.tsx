"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Trash2,
  Edit,
  Save,
  X,
  ExternalLink,
  Building2,
  Users,
  TrendingUp,
  Euro,
  Calendar
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
import type { FavoriteClub } from '@/app/dashboard/agents/clubs/page'
import { getCountryFlag } from '@/lib/utils/country-flags'
import ClubPlayersModal from './club-players-modal'

interface FavoriteClubsCardsProps {
  clubs: FavoriteClub[]
  onClubRemoved: (clubId: number) => void
  onNotesUpdated?: (clubId: number, newNotes: string) => void
}

export default function FavoriteClubsCards({ clubs, onClubRemoved, onNotesUpdated }: FavoriteClubsCardsProps) {
  const [editingNotes, setEditingNotes] = useState<number | null>(null)
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [removingClub, setRemovingClub] = useState<number | null>(null)
  const [clubToRemove, setClubToRemove] = useState<FavoriteClub | null>(null)
  const [selectedClub, setSelectedClub] = useState<FavoriteClub | null>(null)
  const [showPlayersModal, setShowPlayersModal] = useState(false)

  const supabase = createClient()

  const handleStartEditNotes = (club: FavoriteClub) => {
    setEditingNotes(club.club_id)
    setNotesValue(club.notes || '')
  }

  const handleCancelEditNotes = () => {
    setEditingNotes(null)
    setNotesValue('')
  }

  const handleSaveNotes = async (clubId: number) => {
    try {
      setSavingNotes(true)

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update notes using the add_favorite_club function (it upserts)
      const { error } = await supabase.rpc('add_favorite_club', {
        p_agent_id: user.id,
        p_club_id: clubId,
        p_notes: notesValue || null
      })

      if (error) throw error

      // Notify parent if callback provided
      if (onNotesUpdated) {
        onNotesUpdated(clubId, notesValue)
      }

      setEditingNotes(null)
      setNotesValue('')
    } catch (err: any) {
      console.error('Error saving notes:', err)
      alert('Failed to save notes: ' + err.message)
    } finally {
      setSavingNotes(false)
    }
  }

  const handleRemoveClub = async () => {
    if (!clubToRemove) return

    try {
      setRemovingClub(clubToRemove.club_id)

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('remove_favorite_club', {
        p_agent_id: user.id,
        p_club_id: clubToRemove.club_id
      })

      if (error) throw error

      if (data === false) {
        throw new Error('Club was not found in your favorites')
      }

      onClubRemoved(clubToRemove.club_id)
      setClubToRemove(null)
    } catch (err: any) {
      console.error('Error removing club:', err)
      alert('Failed to remove club: ' + (err.message || 'Unknown error'))
    } finally {
      setRemovingClub(null)
    }
  }

  const formatMarketValue = (value: number | null) => {
    if (!value) return 'N/A'
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`
    return `€${value}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const handleViewPlayers = (club: FavoriteClub) => {
    setSelectedClub(club)
    setShowPlayersModal(true)
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clubs.map((club) => (
          <Card
            key={club.favorite_id}
            className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col cursor-pointer"
            onClick={() => handleViewPlayers(club)}
          >
            <CardContent className="p-0 flex flex-col flex-1">
              {/* Header with club logo */}
              <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-6">
                <div className="flex items-start gap-4">
                  {/* Club Logo - Clickable */}
                  <div className="flex-shrink-0">
                    {club.club_transfermarkt_url ? (
                      <a
                        href={club.club_transfermarkt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:opacity-80 transition-opacity"
                      >
                        {club.club_logo_url ? (
                          <img
                            src={club.club_logo_url}
                            alt={club.club_name}
                            className="w-24 h-24 object-contain border-2 border-background shadow-md cursor-pointer rounded-lg bg-white p-2"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md cursor-pointer">
                            <Building2 className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </a>
                    ) : (
                      <>
                        {club.club_logo_url ? (
                          <img
                            src={club.club_logo_url}
                            alt={club.club_name}
                            className="w-24 h-24 object-contain border-2 border-background shadow-md rounded-lg bg-white p-2"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md">
                            <Building2 className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Club Info */}
                  <div className="flex-1 min-w-0">
                    {/* Club Name - Clickable */}
                    {club.club_transfermarkt_url ? (
                      <a
                        href={club.club_transfermarkt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        <h3 className="font-bold text-lg truncate mb-1">{club.club_name}</h3>
                      </a>
                    ) : (
                      <h3 className="font-bold text-lg truncate mb-1">{club.club_name}</h3>
                    )}

                    {/* Country */}
                    {club.country && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <span className="text-lg">{getCountryFlag(club.country)}</span>
                        <span>{club.country}</span>
                      </div>
                    )}

                    {/* League & Tier */}
                    {club.league_name && (
                      <div className="flex items-center gap-2">
                        {club.league_transfermarkt_url ? (
                          <a
                            href={club.league_transfermarkt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            <Badge variant="secondary" className="text-xs">
                              {club.league_name}
                            </Badge>
                          </a>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {club.league_name}
                          </Badge>
                        )}
                        {club.league_tier && (
                          <Badge variant="outline" className="text-xs">
                            Tier {club.league_tier}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Transfermarkt Link */}
                  {club.club_transfermarkt_url && (
                    <a
                      href={club.club_transfermarkt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
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
                {/* Top Section - Stats */}
                <div className="space-y-3 pb-3">
                  {/* Squad Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{club.squad_size} players</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      <span>{club.squad_avg_age ? `${club.squad_avg_age.toFixed(1)} yrs` : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Euro className="h-3 w-3" />
                      <span title="Total Market Value">{formatMarketValue(club.total_market_value_eur)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Euro className="h-3 w-3 opacity-50" />
                      <span title="Avg Market Value" className="text-xs">{formatMarketValue(club.avg_market_value_eur)}/p</span>
                    </div>
                  </div>

                  {/* Added Date */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Added {formatDate(club.added_at)}</span>
                  </div>
                </div>

                {/* Bottom Section - Notes and Actions - Always at bottom */}
                <div className="mt-auto pt-4 space-y-2 border-t" onClick={(e) => e.stopPropagation()}>
                  {/* Notes Section */}
                  <div>
                    {editingNotes === club.club_id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          placeholder="Add notes about this club..."
                          rows={3}
                          className="text-sm resize-none"
                          disabled={savingNotes}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSaveNotes(club.club_id)
                            }}
                            disabled={savingNotes}
                            className="flex-1"
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCancelEditNotes()
                            }}
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
                          {club.notes || 'No notes yet'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {editingNotes !== club.club_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartEditNotes(club)
                        }}
                        className="flex-1"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit Notes
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        setClubToRemove(club)
                      }}
                      disabled={removingClub === club.club_id}
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

      {/* Remove club confirmation dialog */}
      <AlertDialog open={!!clubToRemove} onOpenChange={(open) => !open && setClubToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Club from Favorites?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{clubToRemove?.club_name}</strong> from your favorite clubs?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!removingClub}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveClub}
              disabled={!!removingClub}
              className="bg-destructive hover:bg-destructive/90"
            >
              {removingClub ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Club Players Modal */}
      <ClubPlayersModal
        isOpen={showPlayersModal}
        onClose={() => {
          setShowPlayersModal(false)
          setSelectedClub(null)
        }}
        clubId={selectedClub?.club_id || null}
        clubName={selectedClub?.club_name || ''}
        clubLogoUrl={selectedClub?.club_logo_url || null}
      />
    </>
  )
}
