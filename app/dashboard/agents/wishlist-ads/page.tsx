"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, PlusCircle, Building2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import WishlistClubCard, { WishlistClub, WishlistPosition, MatchingPlayerPreview } from '@/components/agents/wishlist-club-card'
import WishlistClubFormModal from '@/components/agents/wishlist-club-form-modal'
import WishlistPositionFormModal from '@/components/agents/wishlist-position-form-modal'
import WishlistMatchesModal, { MatchedPlayer } from '@/components/agents/wishlist-matches-modal'

export default function AgentWishlistAdsPage() {
  // Auth and basic state
  const [agentId, setAgentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Clubs state
  const [clubs, setClubs] = useState<WishlistClub[]>([])
  const [clubsLoading, setClubsLoading] = useState(false)

  // Club modal state
  const [showClubModal, setShowClubModal] = useState(false)
  const [clubToEdit, setClubToEdit] = useState<WishlistClub | null>(null)

  // Position modal state
  const [showPositionModal, setShowPositionModal] = useState(false)
  const [selectedClubForPosition, setSelectedClubForPosition] = useState<WishlistClub | null>(null)
  const [positionToEdit, setPositionToEdit] = useState<WishlistPosition | null>(null)

  // Matches modal state
  const [showMatchesModal, setShowMatchesModal] = useState(false)
  const [selectedClubForMatches, setSelectedClubForMatches] = useState<WishlistClub | null>(null)
  const [selectedPositionForMatches, setSelectedPositionForMatches] = useState<WishlistPosition | null>(null)
  const [matchedPlayers, setMatchedPlayers] = useState<MatchedPlayer[]>([])
  const [matchesLoading, setMatchesLoading] = useState(false)

  // Fetch agent ID on mount
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
        }
      } else {
        setError("You must be logged in")
      }
      setLoading(false)
    }

    getAgentId()
  }, [supabase])

  // Fetch clubs when agent ID is available
  useEffect(() => {
    if (agentId) {
      fetchClubs()
    }
  }, [agentId])

  // Fetch matching players for a position
  const fetchPositionPreviews = async (
    club: WishlistClub,
    position: WishlistPosition
  ): Promise<MatchingPlayerPreview[]> => {
    if (!agentId || !supabase) return []

    try {
      const { data, error: fetchError } = await supabase.rpc('get_wishlist_matching_players_v2', {
        p_agent_id: agentId,
        p_base_filters: club.base_filters || {},
        p_position_filters: position.filters || {}
      })

      if (fetchError) throw fetchError

      // Return top 10 players sorted by match_score (already sorted by DB)
      return (data || []).slice(0, 10).map((p: any) => ({
        player_id: p.player_id,
        player_name: p.player_name,
        picture_url: p.picture_url,
        match_score: p.match_score
      }))
    } catch (err) {
      console.error('Error fetching position previews:', err)
      return []
    }
  }

  // Fetch clubs with positions
  const fetchClubs = async () => {
    if (!agentId || !supabase) return

    setClubsLoading(true)
    try {
      console.log('[Clubs] Fetching clubs for agent:', agentId)

      const { data, error: fetchError } = await supabase.rpc('get_agent_wishlist_clubs_with_positions', {
        p_agent_id: agentId
      })

      console.log('[Clubs] Response:', { data, error: fetchError })

      if (fetchError) throw fetchError

      const clubsData: WishlistClub[] = data || []

      // Fetch player previews for each position in parallel
      const enrichedClubs = await Promise.all(
        clubsData.map(async (club) => {
          const enrichedPositions = await Promise.all(
            club.positions.map(async (position) => {
              const matching_players = await fetchPositionPreviews(club, position)
              return {
                ...position,
                matching_players,
                matching_player_count: matching_players.length
              }
            })
          )
          return {
            ...club,
            positions: enrichedPositions
          }
        })
      )

      setClubs(enrichedClubs)
    } catch (err: any) {
      console.error('Error fetching clubs:', err)
      toast({
        title: "Error",
        description: "Failed to load clubs",
        variant: "destructive"
      })
    } finally {
      setClubsLoading(false)
    }
  }

  // Handle club saved
  const handleClubSaved = async () => {
    await fetchClubs()
  }

  // Handle position saved
  const handlePositionSaved = async (position: WishlistPosition) => {
    await fetchClubs()
    // Find the club and auto-open matches modal
    if (selectedClubForPosition) {
      await handleViewMatches(selectedClubForPosition, position)
    }
  }

  // Delete a club
  const handleDeleteClub = async (clubId: number) => {
    if (!supabase) return

    try {
      const { error: deleteError } = await supabase
        .from('agent_wishlist_clubs')
        .delete()
        .eq('id', clubId)

      if (deleteError) throw deleteError

      toast({
        title: "Success",
        description: "Club deleted successfully"
      })

      await fetchClubs()
    } catch (err: any) {
      console.error('Error deleting club:', err)
      toast({
        title: "Error",
        description: "Failed to delete club",
        variant: "destructive"
      })
    }
  }

  // Delete a position
  const handleDeletePosition = async (positionId: number) => {
    if (!supabase) return

    try {
      const { error: deleteError } = await supabase
        .from('agent_wishlists')
        .delete()
        .eq('id', positionId)

      if (deleteError) throw deleteError

      toast({
        title: "Success",
        description: "Position deleted successfully"
      })

      await fetchClubs()
    } catch (err: any) {
      console.error('Error deleting position:', err)
      toast({
        title: "Error",
        description: "Failed to delete position",
        variant: "destructive"
      })
    }
  }

  // View matches for a position
  const handleViewMatches = async (club: WishlistClub, position: WishlistPosition) => {
    if (!agentId || !supabase) return

    setSelectedClubForMatches(club)
    setSelectedPositionForMatches(position)
    setMatchesLoading(true)
    setShowMatchesModal(true)

    try {
      console.log('[Matches] Fetching matches for position:', position.id)

      const { data, error: fetchError } = await supabase.rpc('get_wishlist_matching_players_v2', {
        p_agent_id: agentId,
        p_base_filters: club.base_filters || {},
        p_position_filters: position.filters || {}
      })

      console.log('[Matches] Response:', { data, error: fetchError })

      if (fetchError) throw fetchError

      // Map the result to match expected interface (player_position -> position)
      const mappedData = (data || []).map((p: any) => ({
        ...p,
        position: p.player_position
      }))

      setMatchedPlayers(mappedData)
    } catch (err: any) {
      console.error('Error fetching matches:', err)
      toast({
        title: "Error",
        description: "Failed to load matching players",
        variant: "destructive"
      })
    } finally {
      setMatchesLoading(false)
    }
  }

  // Loading state
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

  // Error state
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
        <h1 className="text-3xl font-bold tracking-tight text-primary">Club Wishlists</h1>
        <p className="text-muted-foreground">
          Create club requests with multiple positions and find matching players in your roster
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your Clubs ({clubs.length})</CardTitle>
            <CardDescription>
              Add clubs with base filters, then add position-specific requirements
            </CardDescription>
          </div>
          <Button onClick={() => setShowClubModal(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Club
          </Button>
        </CardHeader>
        <CardContent>
          {clubsLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : clubs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No clubs yet</p>
              <p>Add your first club to start creating position wishlists</p>
            </div>
          ) : (
            <div className="space-y-4">
              {clubs.map((club) => (
                <WishlistClubCard
                  key={club.id}
                  club={club}
                  onEditClub={(c) => {
                    setClubToEdit(c)
                    setShowClubModal(true)
                  }}
                  onDeleteClub={handleDeleteClub}
                  onAddPosition={(c) => {
                    setSelectedClubForPosition(c)
                    setPositionToEdit(null)
                    setShowPositionModal(true)
                  }}
                  onEditPosition={(c, p) => {
                    setSelectedClubForPosition(c)
                    setPositionToEdit(p)
                    setShowPositionModal(true)
                  }}
                  onDeletePosition={handleDeletePosition}
                  onViewMatches={handleViewMatches}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Club Form Modal */}
      <WishlistClubFormModal
        isOpen={showClubModal}
        onClose={() => {
          setShowClubModal(false)
          setClubToEdit(null)
        }}
        agentId={agentId}
        clubToEdit={clubToEdit}
        onClubSaved={handleClubSaved}
      />

      {/* Position Form Modal */}
      <WishlistPositionFormModal
        isOpen={showPositionModal}
        onClose={() => {
          setShowPositionModal(false)
          setSelectedClubForPosition(null)
          setPositionToEdit(null)
        }}
        agentId={agentId}
        club={selectedClubForPosition}
        positionToEdit={positionToEdit}
        onPositionSaved={handlePositionSaved}
      />

      {/* Matches Modal */}
      <WishlistMatchesModal
        isOpen={showMatchesModal}
        onClose={() => {
          setShowMatchesModal(false)
          setSelectedClubForMatches(null)
          setSelectedPositionForMatches(null)
          setMatchedPlayers([])
        }}
        wishlist={selectedPositionForMatches ? {
          id: selectedPositionForMatches.id,
          agent_id: agentId || '',
          name: `${selectedClubForMatches?.name} - ${selectedPositionForMatches.name}`,
          club_logo_url: selectedClubForMatches?.club_logo_url || null,
          filters: selectedPositionForMatches.filters,
          created_at: selectedPositionForMatches.created_at,
          updated_at: selectedPositionForMatches.created_at
        } : null}
        matchedPlayers={matchedPlayers}
        loading={matchesLoading}
      />
    </div>
  )
}
