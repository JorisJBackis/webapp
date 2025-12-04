"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Trash2, Save, Edit, X, CheckCircle2, RotateCcw } from 'lucide-react'
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

interface RosterTableProps {
  roster: RosterPlayer[]
  onPlayerRemoved: (playerId: number) => void
  onNotesUpdated: (playerId: number, newNotes: string) => void
  onRosterRefresh: () => void
}

export default function RosterTable({ roster, onPlayerRemoved, onNotesUpdated, onRosterRefresh }: RosterTableProps) {
  const [editingNotes, setEditingNotes] = useState<number | null>(null)
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [removingPlayer, setRemovingPlayer] = useState<number | null>(null)
  const [playerToRemove, setPlayerToRemove] = useState<RosterPlayer | null>(null)

  // Field editing state
  const [editingField, setEditingField] = useState<{ playerId: number; field: string } | null>(null)
  const [fieldValue, setFieldValue] = useState<string>('')
  const [savingField, setSavingField] = useState(false)

  const supabase = createClient()

  const handleStartEdit = (player: RosterPlayer) => {
    setEditingNotes(player.player_id)
    setNotesValue(player.agent_notes || '')
  }

  const handleCancelEdit = () => {
    setEditingNotes(null)
    setNotesValue('')
  }

  const handleSaveNotes = async (playerId: number) => {
    try {
      setSavingNotes(true)

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('update_roster_notes', {
        p_agent_id: user.id,
        p_player_id: playerId,
        p_notes: notesValue
      })

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

      const { data, error } = await supabase.rpc('remove_player_from_roster', {
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

  const handleStartFieldEdit = (playerId: number, field: string, currentValue: any) => {
    setEditingField({ playerId, field })

    // For date fields, ensure we use YYYY-MM-DD format
    if (field === 'contract' && currentValue) {
      // Convert to YYYY-MM-DD if it's not already
      try {
        const date = new Date(currentValue)
        const yyyy = date.getFullYear()
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const dd = String(date.getDate()).padStart(2, '0')
        setFieldValue(`${yyyy}-${mm}-${dd}`)
      } catch {
        setFieldValue(currentValue?.toString() || '')
      }
    } else {
      setFieldValue(currentValue?.toString() || '')
    }
  }

  const handleCancelFieldEdit = () => {
    setEditingField(null)
    setFieldValue('')
  }

  const handleResetField = async (playerId: number, field: string) => {
    try {
      setSavingField(true)

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.rpc('reset_player_override_field', {
        p_agent_id: user.id,
        p_player_id: playerId,
        p_field: field
      })

      if (error) throw error

      // Refresh the roster data
      onRosterRefresh()
    } catch (err: any) {
      console.error('Error resetting field:', err)
      alert('Failed to reset field: ' + err.message)
    } finally {
      setSavingField(false)
    }
  }

  const handleSaveField = async () => {
    if (!editingField) return

    try {
      setSavingField(true)

      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Prepare parameters based on field type
      const params: any = {
        p_agent_id: user.id,
        p_player_id: editingField.playerId,
        p_position: null,
        p_age: null,
        p_height: null,
        p_foot: null,
        p_nationality: null,
        p_contract_expires: null,
        p_market_value: null
      }

      // Set the specific field value
      if (editingField.field === 'position') {
        params.p_position = fieldValue || null
      } else if (editingField.field === 'age') {
        params.p_age = fieldValue ? parseInt(fieldValue) : null
      } else if (editingField.field === 'height') {
        params.p_height = fieldValue ? parseInt(fieldValue) : null
      } else if (editingField.field === 'foot') {
        params.p_foot = fieldValue || null
      } else if (editingField.field === 'nationality') {
        params.p_nationality = fieldValue || null
      } else if (editingField.field === 'contract') {
        params.p_contract_expires = fieldValue || null
      } else if (editingField.field === 'value') {
        params.p_market_value = fieldValue ? parseInt(fieldValue) : null
      }

      const { error } = await supabase.rpc('upsert_player_override', params)

      if (error) throw error

      // Refresh the roster data
      setEditingField(null)
      setFieldValue('')
      onRosterRefresh()
    } catch (err: any) {
      console.error('Error saving field:', err)
      alert('Failed to save field: ' + err.message)
    } finally {
      setSavingField(false)
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

  const renderEditableCell = (
    playerId: number,
    field: string,
    value: any,
    hasOverride: boolean,
    originalValue: any,
    suffix?: string
  ) => {
    const isEditing = editingField?.playerId === playerId && editingField?.field === field
    const displayValue = value ?? '-'
    const originalDisplayValue = originalValue ?? 'N/A'

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input
            value={fieldValue}
            onChange={(e) => setFieldValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveField()
              if (e.key === 'Escape') handleCancelFieldEdit()
            }}
            className="h-7 text-sm"
            autoFocus
            disabled={savingField}
          />
          <Button
            size="sm"
            onClick={handleSaveField}
            disabled={savingField}
            className="h-7 w-7 p-0"
          >
            <Save className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancelFieldEdit}
            disabled={savingField}
            className="h-7 w-7 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )
    }

    const tooltipText = hasOverride
      ? `Original: ${originalDisplayValue}${suffix || ''} (Double-click to edit, click ⟲ to reset)`
      : 'Double-click to edit'

    return (
      <div className="flex items-center gap-1">
        <span
          onDoubleClick={() => handleStartFieldEdit(playerId, field, value)}
          className="cursor-pointer hover:bg-muted px-2 py-1 rounded inline-flex items-center gap-1"
          title={tooltipText}
        >
          {hasOverride && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" title="Edited by you" />
          )}
          {displayValue === '-' ? (
            <span className="text-muted-foreground">{displayValue}</span>
          ) : (
            `${displayValue}${suffix || ''}`
          )}
        </span>
        {hasOverride && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleResetField(playerId, field)}
            className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
            title="Reset to original value"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Club</TableHead>
              <TableHead>Nationality</TableHead>
              <TableHead>Height</TableHead>
              <TableHead>Foot</TableHead>
              <TableHead>Contract</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>EU</TableHead>
              <TableHead className="w-[300px]">Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roster.map((player) => (
              <TableRow key={player.roster_id}>
                <TableCell className="font-medium">{player.player_name}</TableCell>
                <TableCell>
                  {editingField?.playerId === player.player_id && editingField?.field === 'position' ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={fieldValue}
                        onChange={(e) => setFieldValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveField()
                          if (e.key === 'Escape') handleCancelFieldEdit()
                        }}
                        className="h-7 text-sm"
                        autoFocus
                        disabled={savingField}
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveField}
                        disabled={savingField}
                        className="h-7 w-7 p-0"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelFieldEdit}
                        disabled={savingField}
                        className="h-7 w-7 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Badge
                        variant="secondary"
                        onDoubleClick={() => handleStartFieldEdit(player.player_id, 'position', player.position)}
                        className="cursor-pointer hover:bg-muted inline-flex items-center gap-1"
                        title={player.has_position_override ? `Original: ${player.original_position || 'N/A'}` : 'Double-click to edit'}
                      >
                        {player.has_position_override && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" title="Edited by you" />
                        )}
                        {player.position || '-'}
                      </Badge>
                      {player.has_position_override && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleResetField(player.player_id, 'position')}
                          className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                          title="Reset to original value"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>{renderEditableCell(player.player_id, 'age', player.age, player.has_age_override, player.original_age)}</TableCell>
                <TableCell>{player.club_name || '-'}</TableCell>
                <TableCell>{renderEditableCell(player.player_id, 'nationality', player.nationality, player.has_nationality_override, player.original_nationality)}</TableCell>
                <TableCell>{renderEditableCell(player.player_id, 'height', player.height, player.has_height_override, player.original_height, ' cm')}</TableCell>
                <TableCell>{renderEditableCell(player.player_id, 'foot', player.foot, player.has_foot_override, player.original_foot)}</TableCell>
                <TableCell>
                  {editingField?.playerId === player.player_id && editingField?.field === 'contract' ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="date"
                        value={fieldValue}
                        onChange={(e) => setFieldValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveField()
                          if (e.key === 'Escape') handleCancelFieldEdit()
                        }}
                        className="h-7 text-sm"
                        autoFocus
                        disabled={savingField}
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveField}
                        disabled={savingField}
                        className="h-7 w-7 p-0"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelFieldEdit}
                        disabled={savingField}
                        className="h-7 w-7 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span
                        onDoubleClick={() => handleStartFieldEdit(player.player_id, 'contract', player.contract_expires)}
                        className="cursor-pointer hover:bg-muted px-2 py-1 rounded inline-flex items-center gap-1"
                        title={player.has_contract_override ? `Original: ${formatDate(player.original_contract_expires)}` : 'Double-click to edit'}
                      >
                        {player.has_contract_override && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" title="Edited by you" />
                        )}
                        {formatDate(player.contract_expires)}
                      </span>
                      {player.has_contract_override && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleResetField(player.player_id, 'contract')}
                          className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                          title="Reset to original value"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {editingField?.playerId === player.player_id && editingField?.field === 'value' ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={fieldValue}
                        onChange={(e) => setFieldValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveField()
                          if (e.key === 'Escape') handleCancelFieldEdit()
                        }}
                        className="h-7 text-sm"
                        autoFocus
                        disabled={savingField}
                        placeholder="Value in EUR"
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveField}
                        disabled={savingField}
                        className="h-7 w-7 p-0"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelFieldEdit}
                        disabled={savingField}
                        className="h-7 w-7 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span
                        onDoubleClick={() => handleStartFieldEdit(player.player_id, 'value', player.market_value_eur)}
                        className="cursor-pointer hover:bg-muted px-2 py-1 rounded inline-flex items-center gap-1"
                        title={player.has_value_override ? `Original: ${formatCurrency(player.original_market_value_eur)}` : 'Double-click to edit'}
                      >
                        {player.has_value_override && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" title="Edited by you" />
                        )}
                        {formatCurrency(player.market_value_eur)}
                      </span>
                      {player.has_value_override && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleResetField(player.player_id, 'value')}
                          className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                          title="Reset to original value"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {player.is_eu_passport === true ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : player.is_eu_passport === false ? (
                    <X className="h-4 w-4 text-red-600" />
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {editingNotes === player.player_id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={notesValue}
                        onChange={(e) => setNotesValue(e.target.value)}
                        placeholder="Add notes about this player..."
                        rows={3}
                        className="resize-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveNotes(player.player_id)}
                          disabled={savingNotes}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={savingNotes}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <p className="text-sm text-muted-foreground flex-1">
                        {player.agent_notes || 'No notes'}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartEdit(player)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setPlayerToRemove(player)}
                    disabled={removingPlayer === player.player_id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
