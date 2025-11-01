"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, AlertCircle, Plus, Building2 } from 'lucide-react'
import FavoriteClubsCards from '@/components/agents/favorite-clubs-cards'
import AddFavoriteClubModal from '@/components/agents/add-favorite-club-modal'

export interface FavoriteClub {
  favorite_id: number
  club_id: number
  club_name: string
  club_logo_url: string | null
  club_transfermarkt_url: string | null
  country: string | null
  league_name: string | null
  league_tier: number | null
  league_transfermarkt_url: string | null
  total_market_value_eur: number | null
  avg_market_value_eur: number | null
  squad_avg_age: number | null
  squad_size: number
  notes: string | null
  added_at: string
}

export default function AgentClubsPage() {
  const [clubs, setClubs] = useState<FavoriteClub[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

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

  // Fetch favorite clubs
  const fetchFavoriteClubs = async () => {
    if (!agentId) return

    try {
      setLoading(true)
      setError(null)

      if (!supabase) return

      console.log('[My Clubs] Fetching favorite clubs for agent:', agentId)

      const { data, error: fetchError } = await supabase.rpc('get_agent_favorite_clubs', {
        p_agent_id: agentId
      })

      console.log('[My Clubs] Response:', { data, error: fetchError })

      if (fetchError) {
        console.error('[My Clubs] Error:', fetchError)
        throw fetchError
      }

      setClubs(data || [])
    } catch (err: any) {
      console.error('Error fetching favorite clubs:', err)
      setError('Failed to load favorite clubs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (agentId) {
      fetchFavoriteClubs()
    }
  }, [agentId, supabase])

  const handleClubAdded = () => {
    // Refresh the list
    fetchFavoriteClubs()
    setShowAddModal(false)
  }

  const handleClubRemoved = (clubId: number) => {
    // Remove from local state
    setClubs(prev => prev.filter(club => club.club_id !== clubId))
  }

  const handleNotesUpdated = (clubId: number, newNotes: string) => {
    // Update local state
    setClubs(prev => prev.map(club =>
      club.club_id === clubId
        ? { ...club, notes: newNotes }
        : club
    ))
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">My Clubs</h1>
          <p className="text-muted-foreground">
            Manage clubs you work with and get smart player recommendations
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Add Club
        </Button>
      </div>

      {clubs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No clubs in your favorites yet</p>
            <p className="mb-4">Start building your network by adding clubs you work with</p>
            <Button onClick={() => setShowAddModal(true)} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Club
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              {clubs.length} {clubs.length === 1 ? 'club' : 'clubs'} in your network
            </p>
          </div>
          <FavoriteClubsCards
            clubs={clubs}
            onClubRemoved={handleClubRemoved}
            onNotesUpdated={handleNotesUpdated}
          />
        </div>
      )}

      <AddFavoriteClubModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onClubAdded={handleClubAdded}
      />
    </div>
  )
}
