"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, AlertCircle, UserPlus } from 'lucide-react'
import RosterCards from '@/components/agents/roster-cards'
import AddRosterPlayerModal from '@/components/agents/add-roster-player-modal'

export type RosterPlayer = {
  roster_id: number
  player_id: number
  player_name: string
  age: number | null
  position: string | null
  club_id: number | null
  club_name: string | null
  nationality: string | null
  height: number | null
  foot: string | null
  contract_expires: string | null
  market_value_eur: number | null
  is_eu_passport: boolean | null
  agent_notes: string | null
  added_at: string
  updated_at: string
  // New fields
  picture_url: string | null
  player_transfermarkt_url: string | null
  club_logo_url: string | null
  club_transfermarkt_url: string | null
  club_country: string | null
  club_avg_market_value_eur: number | null
  league_id: string | null
  league_name: string | null
  league_tier: number | null
  league_country: string | null
  league_transfermarkt_url: string | null
  // Original values
  original_age: number | null
  original_position: string | null
  original_nationality: string | null
  original_height: number | null
  original_foot: string | null
  original_contract_expires: string | null
  original_market_value_eur: number | null
  // Override indicators
  has_age_override: boolean
  has_position_override: boolean
  has_nationality_override: boolean
  has_height_override: boolean
  has_foot_override: boolean
  has_contract_override: boolean
  has_value_override: boolean
}

export default function AgentRosterPage() {
  const [roster, setRoster] = useState<RosterPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [agentId, setAgentId] = useState<string | null>(null)

  const supabase = createClient()

  // Fetch agent ID
  useEffect(() => {
    const getAgentId = async () => {
      if (!supabase) return
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Verify user is an agent
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single()

        if (profile?.user_type === 'agent') {
          setAgentId(user.id)
        } else {
          setError("You must be registered as an agent to access this page")
          setLoading(false)
        }
      } else {
        setError("You must be logged in")
        setLoading(false)
      }
    }

    getAgentId()
  }, [supabase])

  // Fetch roster
  useEffect(() => {
    if (!agentId) return

    const fetchRoster = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!supabase) return

        console.log('[Roster] Fetching roster for agent:', agentId)

        const { data, error: rpcError } = await supabase.rpc('get_agent_roster', {
          p_agent_id: agentId
        })

        console.log('[Roster] RPC response:', { data, error: rpcError })

        if (rpcError) {
          console.error('[Roster] RPC Error details:', {
            message: rpcError.message,
            details: rpcError.details,
            hint: rpcError.hint,
            code: rpcError.code
          })
          throw rpcError
        }

        setRoster(data || [])
      } catch (err: any) {
        console.error('[Roster] Error fetching roster:', {
          error: err,
          message: err?.message,
          details: err?.details,
          hint: err?.hint
        })
        setError(`Failed to load your roster: ${err?.message || 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchRoster()
  }, [agentId, supabase])

  const handlePlayerAdded = () => {
    // Refresh roster to get the newly added player
    handleRosterRefresh()
  }

  const handlePlayerRemoved = (playerId: number) => {
    setRoster(prev => prev.filter(p => p.player_id !== playerId))
  }

  const handleNotesUpdated = (playerId: number, newNotes: string) => {
    setRoster(prev => prev.map(p =>
      p.player_id === playerId
        ? { ...p, agent_notes: newNotes, updated_at: new Date().toISOString() }
        : p
    ))
  }

  const handleRosterRefresh = async () => {
    if (!agentId || !supabase) return

    try {
      console.log('[Roster] Refreshing roster data...')

      const { data, error: rpcError } = await supabase.rpc('get_agent_roster', {
        p_agent_id: agentId
      })

      if (rpcError) {
        console.error('[Roster] Refresh error:', rpcError)
        throw rpcError
      }

      setRoster(data || [])
      console.log('[Roster] Roster refreshed successfully')
    } catch (err: any) {
      console.error('[Roster] Error refreshing roster:', err)
      // Silently fail - data is already loaded
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">My Roster</h1>
          <p className="text-muted-foreground">Manage your player roster and track their information</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="bg-primary hover:bg-primary/90">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Player
        </Button>
      </div>

      {roster.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No players in your roster yet</p>
            <p className="mb-4">Start building your roster by adding players</p>
            <Button onClick={() => setIsAddModalOpen(true)} variant="outline">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Your First Player
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {roster.length} {roster.length === 1 ? 'player' : 'players'} in your roster
            </p>
          </div>
          <RosterCards
            roster={roster}
            onPlayerRemoved={handlePlayerRemoved}
            onNotesUpdated={handleNotesUpdated}
            onRosterRefresh={handleRosterRefresh}
          />
        </div>
      )}

      <AddRosterPlayerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onPlayerAdded={handlePlayerAdded}
      />
    </div>
  )
}
