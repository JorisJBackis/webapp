"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, AlertCircle, User, FileText } from 'lucide-react'
import ProspectCards from '@/components/agents/prospect-cards'

export interface ProspectPlayer {
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
  sofascore_id: number | null
  transfermarkt_url: string | null
  player_agent: string | null
  club_id: number | null
  club_name: string | null
  club_logo_url: string | null
  league_name: string | null
  league_country: string | null
  notes: string
  note_created_at: string
}

export default function AgentProspectsPage() {
  const [prospects, setProspects] = useState<ProspectPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

  // Fetch prospects (players with saved notes)
  const fetchProspects = async () => {
    if (!agentId) return

    try {
      setLoading(true)
      setError(null)

      if (!supabase) return

      console.log('[Prospects] Fetching prospects for agent:', agentId)

      // Get all player notes
      const { data: notesData, error: notesError } = await supabase
        .from('agent_player_notes')
        .select('player_id, notes, created_at')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })

      if (notesError) throw notesError

      if (!notesData || notesData.length === 0) {
        setProspects([])
        setLoading(false)
        return
      }

      const playerIds = notesData.map(note => note.player_id)

      // Fetch player details for all noted players
      const { data: playersData, error: playersError } = await supabase
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
          sofascore_id,
          transfermarkt_url,
          player_agent,
          club_id,
          clubs_transfermarkt(
            name,
            logo_url,
            leagues_transfermarkt(
              name,
              country
            )
          )
        `)
        .in('id', playerIds)

      if (playersError) throw playersError

      // Merge players with their notes
      const prospectsWithNotes = (playersData || []).map((player: any) => {
        const noteData = notesData.find(n => n.player_id === player.id)
        return {
          id: player.id,
          name: player.name,
          age: player.age,
          main_position: player.main_position,
          nationality: player.nationality,
          height: player.height,
          foot: player.foot,
          contract_expires: player.contract_expires,
          market_value_eur: player.market_value_eur,
          is_eu_passport: player.is_eu_passport,
          picture_url: player.picture_url,
          sofascore_id: player.sofascore_id,
          transfermarkt_url: player.transfermarkt_url,
          player_agent: player.player_agent,
          club_id: player.club_id,
          club_name: player.clubs_transfermarkt?.name || null,
          club_logo_url: player.clubs_transfermarkt?.logo_url || null,
          league_name: player.clubs_transfermarkt?.leagues_transfermarkt?.name || null,
          league_country: player.clubs_transfermarkt?.leagues_transfermarkt?.country || null,
          notes: noteData?.notes || '',
          note_created_at: noteData?.created_at || ''
        }
      })

      setProspects(prospectsWithNotes)
    } catch (err: any) {
      console.error('Error fetching prospects:', err)
      setError('Failed to load prospects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (agentId) {
      fetchProspects()
    }
  }, [agentId, supabase])

  const handleProspectRemoved = (playerId: number) => {
    // Remove from local state
    setProspects(prev => prev.filter(p => p.id !== playerId))
  }

  const handleNotesUpdated = (playerId: number, newNotes: string) => {
    // Update local state
    setProspects(prev => prev.map(p =>
      p.id === playerId
        ? { ...p, notes: newNotes }
        : p
    ))
  }

  const handlePlayerAddedToRoster = (playerId: number) => {
    // Remove from prospects when added to roster
    setProspects(prev => prev.filter(p => p.id !== playerId))
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary">My Prospects</h1>
        <p className="text-muted-foreground">
          Players you've saved notes for - track your scouting targets
        </p>
      </div>

      {prospects.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No prospects saved yet</p>
            <p className="mb-4">When you add players, save notes for players you're interested in to track them here</p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              {prospects.length} {prospects.length === 1 ? 'prospect' : 'prospects'} tracked
            </p>
          </div>
          <ProspectCards
            prospects={prospects}
            onProspectRemoved={handleProspectRemoved}
            onNotesUpdated={handleNotesUpdated}
            onPlayerAddedToRoster={handlePlayerAddedToRoster}
          />
        </div>
      )}
    </div>
  )
}
