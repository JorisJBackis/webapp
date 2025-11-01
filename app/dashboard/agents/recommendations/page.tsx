"use client"

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, AlertCircle, TrendingUp, Building2 } from 'lucide-react'
import SmartRecommendationsCards from '@/components/agents/smart-recommendations-cards'

interface SmartRecommendation {
  recommendation_id: string
  player_id: number
  player_name: string
  player_age: number
  player_position: string
  player_nationality: string | null
  player_contract_expires: string
  player_market_value: number | null
  player_picture_url: string | null
  player_transfermarkt_url: string | null
  club_id: number
  club_name: string
  club_logo_url: string | null
  club_transfermarkt_url: string | null
  league_name: string | null
  league_tier: number | null
  match_score: number
  match_reasons: {
    same_league: boolean
    same_tier: boolean
    same_country: boolean
    exact_position: boolean
    contract_expiring_soon: boolean
    has_squad_need: boolean
    same_nationality: boolean
    age_fits_profile: boolean
    position_shortage: number
    expiring_contracts_in_position: number
    squad_avg_age_in_position: number | null
    expiring_players: Array<{
      name: string
      age: number
      contract_expires: string
      market_value: number | null
    }>
    details: {
      player_contract_expires: string
      months_until_free: number
    }
  }
}

export default function SmartRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([])
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

  // Fetch smart recommendations
  useEffect(() => {
    if (!agentId) return

    const fetchRecommendations = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!supabase) return

        console.log('[Smart Recommendations] Fetching for agent:', agentId)

        const { data, error: rpcError } = await supabase.rpc('get_smart_recommendations', {
          p_agent_id: agentId
        })

        console.log('[Smart Recommendations] Response:', { data, error: rpcError })

        if (rpcError) {
          console.error('[Smart Recommendations] Full Error:', JSON.stringify(rpcError, null, 2))
          console.error('[Smart Recommendations] Error message:', rpcError.message)
          console.error('[Smart Recommendations] Error details:', rpcError.details)
          console.error('[Smart Recommendations] Error hint:', rpcError.hint)
          throw rpcError
        }

        setRecommendations(data || [])
      } catch (err: any) {
        console.error('Error fetching recommendations:', err)
        setError('Failed to load recommendations')
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [agentId, supabase])

  // Calculate stats (must be before early returns)
  const stats = useMemo(() => {
    const uniquePlayers = new Set(recommendations.map(r => r.player_id)).size
    const uniqueClubs = new Set(recommendations.map(r => r.club_id)).size
    const avgScore = recommendations.length > 0
      ? Math.round(recommendations.reduce((sum, r) => sum + r.match_score, 0) / recommendations.length)
      : 0

    return { uniquePlayers, uniqueClubs, avgScore, totalMatches: recommendations.length }
  }, [recommendations])

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
        <h1 className="text-3xl font-bold tracking-tight text-primary">Smart Recommendations</h1>
        <p className="text-muted-foreground">
          High-quality matches between your roster players and club needs
        </p>
      </div>

      {/* Stats Cards */}
      {recommendations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Matches</p>
                  <p className="text-2xl font-bold">{stats.totalMatches}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Players Matched</p>
                  <p className="text-2xl font-bold">{stats.uniquePlayers}</p>
                </div>
                <Building2 className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Clubs Interested</p>
                  <p className="text-2xl font-bold">{stats.uniqueClubs}</p>
                </div>
                <Building2 className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Match Score</p>
                  <p className="text-2xl font-bold">{stats.avgScore}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {recommendations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No recommendations found</p>
            <p className="mb-4">
              Make sure you have:
            </p>
            <ul className="text-sm space-y-1">
              <li>✓ Players in your roster with contracts expiring within 6 months</li>
              <li>✓ Favorite clubs added</li>
              <li>✓ Clubs in the same league/tier as your players</li>
            </ul>
          </CardContent>
        </Card>
      ) : (
        <SmartRecommendationsCards recommendations={recommendations} />
      )}
    </div>
  )
}
