"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, Eye, Building2, Edit, Save, X } from 'lucide-react'
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
import { useRouter } from 'next/navigation'

interface FavoriteClub {
  favorite_id: number
  club_id: number
  club_name: string
  logo_url: string | null
  league_name: string | null
  country: string | null
  notes: string | null
  added_at: string
  squad_size: number
}

interface FavoriteClubsTableProps {
  clubs: FavoriteClub[]
  onClubRemoved: (clubId: number) => void
  onNotesUpdated?: (clubId: number, newNotes: string) => void
}

export default function FavoriteClubsTable({ clubs, onClubRemoved, onNotesUpdated }: FavoriteClubsTableProps) {
  const [removingClub, setRemovingClub] = useState<number | null>(null)
  const [clubToRemove, setClubToRemove] = useState<FavoriteClub | null>(null)
  const [editingNotesClubId, setEditingNotesClubId] = useState<number | null>(null)
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [localClubs, setLocalClubs] = useState<FavoriteClub[]>(clubs)
  const router = useRouter()
  const supabase = createClient()

  // Update local state when props change
  useEffect(() => {
    setLocalClubs(clubs)
  }, [clubs])

  const handleStartEditNotes = (club: FavoriteClub) => {
    setEditingNotesClubId(club.club_id)
    setNotesValue(club.notes || '')
  }

  const handleCancelEditNotes = () => {
    setEditingNotesClubId(null)
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

      // Update local state optimistically
      setLocalClubs(prev => prev.map(club =>
        club.club_id === clubId
          ? { ...club, notes: notesValue || null }
          : club
      ))

      // Clear editing state
      setEditingNotesClubId(null)
      setNotesValue('')

      // Notify parent if callback provided
      if (onNotesUpdated) {
        onNotesUpdated(clubId, notesValue)
      }
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

      console.log('[FavoriteClubsTable] Removing club:', {
        userId: user.id,
        clubId: clubToRemove.club_id,
        clubName: clubToRemove.club_name
      })

      const { data, error } = await supabase.rpc('remove_favorite_club', {
        p_agent_id: user.id,
        p_club_id: clubToRemove.club_id
      })

      console.log('[FavoriteClubsTable] Remove response:', { data, error })

      if (error) {
        console.error('[FavoriteClubsTable] Supabase error:', error)
        throw error
      }

      if (data === false) {
        throw new Error('Club was not found in your favorites')
      }

      console.log('[FavoriteClubsTable] Club removed successfully')
      onClubRemoved(clubToRemove.club_id)
      setClubToRemove(null)
    } catch (err: any) {
      console.error('[FavoriteClubsTable] Error removing club:', err)
      console.error('[FavoriteClubsTable] Error details:', {
        message: err.message,
        name: err.name,
        stack: err.stack,
        raw: err
      })
      alert('Failed to remove club: ' + (err.message || 'Unknown error'))
    } finally {
      setRemovingClub(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const handleViewRecommendations = (clubId: number) => {
    // Navigate to recommendations page with club filter
    router.push(`/dashboard/agents/recommendations?club=${clubId}`)
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Club</TableHead>
              <TableHead>League</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Squad Size</TableHead>
              <TableHead>Added</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localClubs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No favorite clubs yet</p>
                  <p>Add clubs you work with to see smart recommendations</p>
                </TableCell>
              </TableRow>
            ) : (
              localClubs.map((club) => (
                <TableRow key={club.favorite_id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {club.logo_url ? (
                        <img
                          src={club.logo_url}
                          alt={club.club_name}
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="font-medium">{club.club_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {club.league_name ? (
                      <Badge variant="secondary">{club.league_name}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{club.country || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{club.squad_size} players</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(club.added_at)}
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    {editingNotesClubId === club.club_id ? (
                      <div className="flex gap-2 items-start">
                        <Textarea
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          placeholder="Add notes..."
                          rows={2}
                          className="text-sm resize-none"
                          disabled={savingNotes}
                        />
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSaveNotes(club.club_id)}
                            disabled={savingNotes}
                            className="h-7 w-7 p-0"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEditNotes}
                            disabled={savingNotes}
                            className="h-7 w-7 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <p className="text-sm text-muted-foreground flex-1" title={club.notes || undefined}>
                          {club.notes || 'No notes'}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStartEditNotes(club)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewRecommendations(club.club_id)}
                        title="View smart recommendations for this club"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setClubToRemove(club)}
                        disabled={removingClub === club.club_id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
    </>
  )
}
