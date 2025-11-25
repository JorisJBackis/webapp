"use client"

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, AlertCircle, TrendingUp, Building2, ChevronDown } from 'lucide-react'
import SmartRecommendationsCards from '@/components/agents/smart-recommendations-cards'
import AlgorithmSettingsModal from '@/components/agents/algorithm-settings-modal'

export interface SmartRecommendation {
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
  club_country: string | null
  club_avg_market_value: number | null
  league_name: string | null
  league_tier: number | null
  league_avg_market_value: number | null
  match_score: number
  match_reasons: {
    same_league: boolean
    same_country: boolean
    nordic_neighbor: boolean
    position_match: boolean
    position_count: number
    expiring_contracts_in_position: number
    turnover_percentage: number
    urgency_total_replacement: boolean
    urgency_most_leaving: boolean
    urgency_half_leaving: boolean
    multiple_openings_massive: boolean
    multiple_openings_great: boolean
    multiple_openings_good: boolean
    expiring_players: Array<{
      name: string
      age: number
      contract_expires: string
      market_value: number | null
      months_diff: number
    }>
    contract_timing_perfect: boolean
    contract_timing_good: boolean
    market_fit_perfect: boolean
    age_prime: boolean
    age_prospect: boolean
    age_fits_profile: boolean
    squad_avg_age_in_position: number | null
    imminent_free: boolean
    club_avg_market_value: number | null
    league_avg_market_value: number | null
    player_current_league_value: number | null
    details: {
      player_contract_expires: string
      months_until_free: number
    }
  }
}

export default function SmartRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

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

  // Fetch smart recommendations with pagination
  const fetchRecommendations = async (pageNum: number, append: boolean = false) => {
    try {
      if (pageNum === 0) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError(null)

      if (!supabase || !agentId) return

      console.log('[Smart Recommendations] Fetching page:', pageNum, 'for agent:', agentId)

      const { data, error: rpcError } = await supabase.rpc('get_smart_recommendations_nordic_paginated', {
        p_agent_id: agentId,
        p_limit: PAGE_SIZE,
        p_offset: pageNum * PAGE_SIZE
      })

      console.log('[Smart Recommendations] Response:', { count: data?.length, error: rpcError })

      if (rpcError) {
        // Fallback to non-paginated version if paginated doesn't exist
        if (rpcError.message?.includes('function') || rpcError.code === '42883') {
          console.log('[Smart Recommendations] Falling back to non-paginated version')
          const { data: fallbackData, error: fallbackError } = await supabase.rpc('get_smart_recommendations_nordic', {
            p_agent_id: agentId
          })
          if (fallbackError) throw fallbackError
          setRecommendations(fallbackData || [])
          setHasMore(false)
          return
        }
        throw rpcError
      }

      const newData = data || []

      if (append) {
        setRecommendations(prev => [...prev, ...newData])
      } else {
        setRecommendations(newData)
      }

      setHasMore(newData.length === PAGE_SIZE)
      setPage(pageNum)
    } catch (err: any) {
      console.error('Error fetching recommendations:', err)
      setError('Failed to load recommendations')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    if (!agentId) return
    fetchRecommendations(0)
  }, [agentId, supabase])

  // Load more function
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchRecommendations(page + 1, true)
    }
  }

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
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Smart Recommendations</h1>
          <p className="text-muted-foreground">
            High-quality matches between your roster players and club needs
          </p>
        </div>
        <AlgorithmSettingsModal />
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
              <li>✓ Favorite clubs added (Nordic leagues: FIN, NOR, SWE top 2 tiers)</li>
              <li>✓ Players valued ≤€150k (Fortis Nova range)</li>
              <li>✓ Clubs must have expiring contracts in same position (contract timing match)</li>
            </ul>
          </CardContent>
        </Card>
      ) : (
        <>
          <SmartRecommendationsCards recommendations={recommendations} />

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                size="lg"
                onClick={loadMore}
                disabled={loadingMore}
                className="min-w-[200px]"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Load More
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
