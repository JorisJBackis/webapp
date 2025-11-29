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
  User,
  Calendar,
  Euro,
  Plus,
  Check,
  Loader2
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
import type { ProspectPlayer } from '@/app/dashboard/agents/prospects/page'
import { getCountryFlag } from '@/lib/utils/country-flags'
import { getPlayerImageUrl } from '@/lib/utils'
import { toast } from 'sonner'

interface ProspectCardsProps {
  prospects: ProspectPlayer[]
  onProspectRemoved: (playerId: number) => void
  onNotesUpdated?: (playerId: number, newNotes: string) => void
  onPlayerAddedToRoster?: (playerId: number) => void
}

export default function ProspectCards({ prospects, onProspectRemoved, onNotesUpdated, onPlayerAddedToRoster }: ProspectCardsProps) {
  const [editingNotes, setEditingNotes] = useState<number | null>(null)
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [removingProspect, setRemovingProspect] = useState<number | null>(null)
  const [prospectToRemove, setProspectToRemove] = useState<ProspectPlayer | null>(null)
  const [addingToRoster, setAddingToRoster] = useState<number | null>(null)

  const supabase = createClient()

  const handleStartEditNotes = (prospect: ProspectPlayer) => {
    setEditingNotes(prospect.id)
    setNotesValue(prospect.notes || '')
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

      // Update notes
      const { error } = await supabase
        .from('agent_player_notes')
        .update({
          notes: notesValue || null,
          updated_at: new Date().toISOString()
        })
        .eq('agent_id', user.id)
        .eq('player_id', playerId)

      if (error) throw error

      // Notify parent if callback provided
      if (onNotesUpdated) {
        onNotesUpdated(playerId, notesValue)
      }

      setEditingNotes(null)
      setNotesValue('')
      toast.success('Notes updated')
    } catch (err: any) {
      console.error('Error saving notes:', err)
      alert('Failed to save notes: ' + err.message)
    } finally {
      setSavingNotes(false)
    }
  }

  const handleRemoveProspect = async () => {
    if (!prospectToRemove) return

    try {
      setRemovingProspect(prospectToRemove.id)

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Delete the note
      const { error } = await supabase
        .from('agent_player_notes')
        .delete()
        .eq('agent_id', user.id)
        .eq('player_id', prospectToRemove.id)

      if (error) throw error

      onProspectRemoved(prospectToRemove.id)
      setProspectToRemove(null)
      toast.success('Prospect removed')
    } catch (err: any) {
      console.error('Error removing prospect:', err)
      alert('Failed to remove prospect: ' + (err.message || 'Unknown error'))
    } finally {
      setRemovingProspect(null)
    }
  }

  const handleAddToRoster = async (prospect: ProspectPlayer) => {
    try {
      setAddingToRoster(prospect.id)

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Add to roster with notes
      const { error } = await supabase
        .from('agent_rosters')
        .insert({
          agent_id: user.id,
          player_id: prospect.id,
          notes: prospect.notes
        })

      if (error) throw error

      // Delete from prospects
      await supabase
        .from('agent_player_notes')
        .delete()
        .eq('agent_id', user.id)
        .eq('player_id', prospect.id)

      // Notify parent
      if (onPlayerAddedToRoster) {
        onPlayerAddedToRoster(prospect.id)
      }

      toast.success(`${prospect.name} added to roster!`)
    } catch (err: any) {
      console.error('Error adding to roster:', err)
      alert('Failed to add to roster: ' + err.message)
    } finally {
      setAddingToRoster(null)
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

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {prospects.map((prospect) => (
          <Card
            key={prospect.id}
            className="overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all flex flex-col"
          >
            <CardContent className="p-0 flex flex-col flex-1">
              {/* Header with player photo */}
              <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-6">
                <div className="flex items-start gap-4">
                  {/* Player Photo */}
                  <div className="flex-shrink-0">
                    {prospect.transfermarkt_url ? (
                      <a
                        href={prospect.transfermarkt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:opacity-80 transition-opacity"
                      >
                        {getPlayerImageUrl(prospect.picture_url, prospect.sofascore_id) ? (
                          <img
                            src={getPlayerImageUrl(prospect.picture_url, prospect.sofascore_id)!}
                            alt={prospect.name}
                            className="w-24 h-24 object-cover rounded-lg border-2 border-background shadow-md cursor-pointer"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md cursor-pointer">
                            <User className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </a>
                    ) : (
                      <>
                        {getPlayerImageUrl(prospect.picture_url, prospect.sofascore_id) ? (
                          <img
                            src={getPlayerImageUrl(prospect.picture_url, prospect.sofascore_id)!}
                            alt={prospect.name}
                            className="w-24 h-24 object-cover rounded-lg border-2 border-background shadow-md"
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
                    {/* Player Name */}
                    {prospect.transfermarkt_url ? (
                      <a
                        href={prospect.transfermarkt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        <h3 className="font-bold text-lg truncate mb-1">{prospect.name}</h3>
                      </a>
                    ) : (
                      <h3 className="font-bold text-lg truncate mb-1">{prospect.name}</h3>
                    )}

                    {/* Position & Age */}
                    <div className="flex items-center gap-2 mb-2">
                      {prospect.main_position && (
                        <Badge variant="default" className="text-xs">
                          {prospect.main_position}
                        </Badge>
                      )}
                      {prospect.age && (
                        <span className="text-sm text-muted-foreground">{prospect.age} yrs</span>
                      )}
                    </div>

                    {/* Nationality */}
                    {prospect.nationality && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                        <span className="text-lg">{getCountryFlag(prospect.nationality)}</span>
                        <span>{prospect.nationality}</span>
                      </div>
                    )}

                    {/* Club */}
                    {prospect.club_name && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        {prospect.club_logo_url && (
                          <img
                            src={prospect.club_logo_url}
                            alt={prospect.club_name}
                            className="w-4 h-4 object-contain"
                          />
                        )}
                        <span>{prospect.club_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Transfermarkt Link */}
                  {prospect.transfermarkt_url && (
                    <a
                      href={prospect.transfermarkt_url}
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
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  {prospect.market_value_eur && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Euro className="h-3 w-3" />
                      <span>{formatMarketValue(prospect.market_value_eur)}</span>
                    </div>
                  )}
                  {prospect.contract_expires && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(prospect.contract_expires)}</span>
                    </div>
                  )}
                  {prospect.league_name && (
                    <div className="col-span-2">
                      <Badge variant="outline" className="text-xs">
                        {prospect.league_name}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Notes Section */}
                <div className="mt-auto pt-4 space-y-3 border-t">
                  <div>
                    {editingNotes === prospect.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          placeholder="Add notes about this prospect..."
                          rows={3}
                          className="text-sm resize-none"
                          disabled={savingNotes}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveNotes(prospect.id)}
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
                        <div
                          onClick={() => handleStartEditNotes(prospect)}
                          className="text-sm min-h-[3rem] p-2 bg-muted/30 rounded border cursor-text hover:bg-muted/50 transition-colors"
                        >
                          {prospect.notes || <span className="text-muted-foreground italic">Click to edit notes...</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleAddToRoster(prospect)}
                      disabled={addingToRoster === prospect.id}
                      className="flex-1"
                    >
                      {addingToRoster === prospect.id ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Check className="h-3 w-3 mr-1" />
                      )}
                      Add to Roster
                    </Button>
                    {editingNotes !== prospect.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartEditNotes(prospect)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setProspectToRemove(prospect)}
                      disabled={removingProspect === prospect.id}
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

      {/* Remove prospect confirmation dialog */}
      <AlertDialog open={!!prospectToRemove} onOpenChange={(open) => !open && setProspectToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Prospect?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{prospectToRemove?.name}</strong> from your prospects?
              This will delete your saved notes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!removingProspect}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveProspect}
              disabled={!!removingProspect}
              className="bg-destructive hover:bg-destructive/90"
            >
              {removingProspect ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
