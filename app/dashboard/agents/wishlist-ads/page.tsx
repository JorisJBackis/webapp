"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, PlusCircle } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import WishlistFormModal, { AgentWishlist } from '@/components/agents/wishlist-form-modal'
import WishlistListTable from '@/components/agents/wishlist-list-table'
import WishlistMatchesModal, { MatchedPlayer } from '@/components/agents/wishlist-matches-modal'

export default function AgentWishlistAdsPage() {
  // Auth and basic state
  const [agentId, setAgentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Wishlist state
  const [wishlists, setWishlists] = useState<AgentWishlist[]>([])
  const [wishlistsLoading, setWishlistsLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [wishlistToEdit, setWishlistToEdit] = useState<AgentWishlist | null>(null)
  const [showMatchesModal, setShowMatchesModal] = useState(false)
  const [selectedWishlist, setSelectedWishlist] = useState<AgentWishlist | null>(null)
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

  // Fetch wishlists when agent ID is available
  useEffect(() => {
    if (agentId) {
      fetchWishlists()
    }
  }, [agentId])

  // Fetch wishlists
  const fetchWishlists = async () => {
    if (!agentId || !supabase) return

    setWishlistsLoading(true)
    try {
      console.log('[Wishlists] Fetching wishlists for agent:', agentId)

      const { data, error: fetchError } = await supabase.rpc('get_agent_wishlists_with_counts', {
        p_agent_id: agentId
      })

      console.log('[Wishlists] Response:', { data, error: fetchError })

      if (fetchError) throw fetchError
      setWishlists(data || [])
    } catch (err: any) {
      console.error('Error fetching wishlists:', err)
      toast({
        title: "Error",
        description: "Failed to load wishlists",
        variant: "destructive"
      })
    } finally {
      setWishlistsLoading(false)
    }
  }

  // Handle wishlist saved (create or edit)
  const handleWishlistSaved = async (wishlist: AgentWishlist) => {
    await fetchWishlists()
    // Auto-open matches modal per requirements
    await handleViewMatches(wishlist)
  }

  // View matching players for a wishlist
  const handleViewMatches = async (wishlist: AgentWishlist) => {
    if (!agentId || !supabase) return

    setSelectedWishlist(wishlist)
    setMatchesLoading(true)
    setShowMatchesModal(true)

    try {
      console.log('[Matches] Fetching matches for wishlist:', wishlist.id)

      const { data, error: fetchError } = await supabase.rpc('get_wishlist_matching_players', {
        p_agent_id: agentId,
        p_filters: wishlist.filters
      })

      console.log('[Matches] Response:', { data, error: fetchError })

      if (fetchError) throw fetchError
      setMatchedPlayers(data || [])
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

  // Delete a wishlist
  const handleDeleteWishlist = async (wishlistId: number) => {
    if (!supabase) return

    try {
      const { error: deleteError } = await supabase
        .from('agent_wishlists')
        .delete()
        .eq('id', wishlistId)

      if (deleteError) throw deleteError

      toast({
        title: "Success",
        description: "Wishlist deleted successfully"
      })

      await fetchWishlists()
    } catch (err: any) {
      console.error('Error deleting wishlist:', err)
      toast({
        title: "Error",
        description: "Failed to delete wishlist",
        variant: "destructive"
      })
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
          Create wishlists with club requirements and find matching players in your roster
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your Wishlists ({wishlists.length})</CardTitle>
            <CardDescription>
              Create wishlists with filters to find matching players in your roster
            </CardDescription>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Wishlist
          </Button>
        </CardHeader>
        <CardContent>
          {wishlistsLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <WishlistListTable
              wishlists={wishlists}
              onEdit={(wishlist) => setWishlistToEdit(wishlist)}
              onDelete={handleDeleteWishlist}
              onViewMatches={handleViewMatches}
            />
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Wishlist Modal */}
      <WishlistFormModal
        isOpen={showCreateModal || !!wishlistToEdit}
        onClose={() => {
          setShowCreateModal(false)
          setWishlistToEdit(null)
        }}
        agentId={agentId}
        wishlistToEdit={wishlistToEdit}
        onWishlistSaved={handleWishlistSaved}
      />

      {/* Matches Modal */}
      <WishlistMatchesModal
        isOpen={showMatchesModal}
        onClose={() => {
          setShowMatchesModal(false)
          setSelectedWishlist(null)
          setMatchedPlayers([])
        }}
        wishlist={selectedWishlist}
        matchedPlayers={matchedPlayers}
        loading={matchesLoading}
      />
    </div>
  )
}
