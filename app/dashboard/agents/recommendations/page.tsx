"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle, TrendingUp, Building2, ChevronDown, Sparkles } from 'lucide-react'
import SmartRecommendationsCards from '@/components/agents/smart-recommendations-cards'
import AlgorithmSettingsModal, { AlgorithmWeights } from '@/components/agents/algorithm-settings-modal'
import PresetCards, { PresetName } from '@/components/agents/preset-cards'

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
  player_sofascore_id: number | null
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
    nordic_neighbor?: boolean
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
      picture_url?: string | null
      transfermarkt_url?: string | null
      sofascore_id?: number | null
    }>
    contract_timing_perfect: boolean
    contract_timing_good: boolean
    market_fit_perfect: boolean
    age_very_young?: boolean
    age_young?: boolean
    age_prime: boolean
    age_prospect?: boolean
    age_fits_profile: boolean
    squad_avg_age_in_position: number | null
    imminent_free: boolean
    club_avg_market_value: number | null
    league_avg_market_value: number | null
    player_current_league_value: number | null
    // Performance metrics
    injury_reliability?: boolean
    availability_pct?: number
    low_playing_time?: boolean
    recent_form?: boolean
    versatility?: boolean
    positions_count?: number
    discipline_issue?: boolean
    red_cards?: number
    sofascore_rating?: number
    high_rating?: boolean
    top_percentile?: boolean
    goal_contributions?: number
    duel_dominance?: boolean
    duel_pct?: number
    passing_quality?: boolean
    pass_accuracy?: number
    is_eu_passport?: boolean
    details: {
      player_contract_expires: string
      months_until_free: number
    }
  }
}

// Preset weight configurations matching the modal
const PRESET_WEIGHTS: Record<PresetName, AlgorithmWeights> = {
  balanced: {
    sameLeague: 30, contractTimingPerfect: 40, contractTimingGood: 25, imminentFree: 25,
    squadTurnoverUrgency: 30, multipleOpenings: 20, marketFitPerfect: 30, sameCountry: 20,
    ageVeryYoung: 30, ageYoung: 20, agePrime: 10, ageFitsSquad: 15,
    injuryReliability: 25, lowPlayingTime: 15, recentForm: 15, versatility: 20, disciplinePenalty: 20,
    sofascoreRating: 25, topPercentile: 20, goalContributions: 20, duelDominance: 15, passingQuality: 15
  },
  young_prospects: {
    sameLeague: 20, contractTimingPerfect: 40, contractTimingGood: 25, imminentFree: 20,
    squadTurnoverUrgency: 30, multipleOpenings: 20, marketFitPerfect: 30, sameCountry: 20,
    ageVeryYoung: 100, ageYoung: 60, agePrime: 10, ageFitsSquad: 10,
    injuryReliability: 25, lowPlayingTime: 20, recentForm: 15, versatility: 25, disciplinePenalty: 20,
    sofascoreRating: 25, topPercentile: 20, goalContributions: 20, duelDominance: 15, passingQuality: 15
  },
  safe_placements: {
    sameLeague: 30, contractTimingPerfect: 40, contractTimingGood: 25, imminentFree: 25,
    squadTurnoverUrgency: 30, multipleOpenings: 20, marketFitPerfect: 50, sameCountry: 20,
    ageVeryYoung: 30, ageYoung: 30, agePrime: 40, ageFitsSquad: 20,
    injuryReliability: 80, lowPlayingTime: 10, recentForm: 15, versatility: 20, disciplinePenalty: 60,
    sofascoreRating: 25, topPercentile: 20, goalContributions: 20, duelDominance: 15, passingQuality: 15
  },
  hot_form: {
    sameLeague: 30, contractTimingPerfect: 40, contractTimingGood: 25, imminentFree: 25,
    squadTurnoverUrgency: 30, multipleOpenings: 20, marketFitPerfect: 30, sameCountry: 20,
    ageVeryYoung: 30, ageYoung: 30, agePrime: 30, ageFitsSquad: 15,
    injuryReliability: 25, lowPlayingTime: 10, recentForm: 50, versatility: 20, disciplinePenalty: 20,
    sofascoreRating: 80, topPercentile: 40, goalContributions: 60, duelDominance: 30, passingQuality: 25
  }
}

export default function SmartRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState<PresetName>('balanced')
  const [usingV2, setUsingV2] = useState(true)
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
          // Load saved preset preference
          const { data: prefs } = await supabase
            .from('agent_algorithm_weights')
            .select('preset_name')
            .eq('agent_id', user.id)
            .single()
          if (prefs?.preset_name && prefs.preset_name !== 'custom') {
            setSelectedPreset(prefs.preset_name as PresetName)
          }
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

  // Fetch recommendations with optional temp weights for live preview
  const fetchRecommendations = useCallback(async (
    pageNum: number,
    append: boolean = false,
    tempWeights?: AlgorithmWeights
  ) => {
    try {
      if (pageNum === 0 && !tempWeights) {
        setLoading(true)
      } else if (tempWeights) {
        setIsRecalculating(true)
      } else {
        setLoadingMore(true)
      }
      setError(null)

      if (!supabase || !agentId) return

      console.log('[Smart Recommendations] Fetching page:', pageNum, 'for agent:', agentId, tempWeights ? 'with custom weights' : '')

      // Try v2 function first
      let data: SmartRecommendation[] | null = null
      let rpcError: any = null

      if (usingV2) {
        const result = await supabase.rpc('get_smart_recommendations_v2_paginated', {
          p_agent_id: agentId,
          p_limit: PAGE_SIZE,
          p_offset: pageNum * PAGE_SIZE,
          p_temp_weights: tempWeights || null
        })
        data = result.data
        rpcError = result.error
      }

      // Fallback to v1 if v2 fails
      if (rpcError || !usingV2) {
        if (rpcError?.message?.includes('function') || rpcError?.code === '42883') {
          console.log('[Smart Recommendations] V2 not available, falling back to v1')
          setUsingV2(false)

          // Try paginated v1
          const fallbackResult = await supabase.rpc('get_smart_recommendations_nordic_paginated', {
            p_agent_id: agentId,
            p_limit: PAGE_SIZE,
            p_offset: pageNum * PAGE_SIZE
          })

          if (fallbackResult.error) {
            // Try non-paginated v1
            const fallback2 = await supabase.rpc('get_smart_recommendations_nordic', {
              p_agent_id: agentId
            })
            if (fallback2.error) throw fallback2.error
            data = fallback2.data
            setHasMore(false)
          } else {
            data = fallbackResult.data
          }
        } else if (rpcError) {
          throw rpcError
        }
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
      setIsRecalculating(false)
    }
  }, [supabase, agentId, usingV2])

  // Initial fetch
  useEffect(() => {
    if (!agentId) return
    fetchRecommendations(0)
  }, [agentId, fetchRecommendations])

  // Load more function
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchRecommendations(page + 1, true)
    }
  }

  // Handle preset selection from cards
  const handlePresetSelect = useCallback(async (preset: PresetName) => {
    setSelectedPreset(preset)
    const weights = PRESET_WEIGHTS[preset]

    // Save preset and fetch with new weights
    if (agentId) {
      await supabase
        .from('agent_algorithm_weights')
        .upsert({
          agent_id: agentId,
          preset_name: preset,
          weights: weights,
          updated_at: new Date().toISOString()
        })
    }

    fetchRecommendations(0, false, weights)
  }, [agentId, supabase, fetchRecommendations])

  // Handle live weight changes from modal
  const handleWeightsChange = useCallback((weights: AlgorithmWeights) => {
    setSelectedPreset('balanced') // Reset to custom when manually changing
    fetchRecommendations(0, false, weights)
  }, [fetchRecommendations])

  // Handle successful save from modal
  const handleApplySuccess = useCallback(() => {
    fetchRecommendations(0)
  }, [fetchRecommendations])

  // Calculate stats
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
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Smart Recommendations</h1>
          <p className="text-muted-foreground">
            High-quality matches between your roster players and club needs
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isRecalculating && (
            <Badge variant="secondary" className="animate-pulse">
              <Sparkles className="h-3 w-3 mr-1" />
              Recalculating...
            </Badge>
          )}
          <AlgorithmSettingsModal
            agentId={agentId || undefined}
            onWeightsChange={handleWeightsChange}
            onApplySuccess={handleApplySuccess}
          />
        </div>
      </div>

      {/* Preset Cards */}
      {usingV2 && (
        <PresetCards
          selectedPreset={selectedPreset}
          onPresetSelect={handlePresetSelect}
          isRecalculating={isRecalculating}
        />
      )}

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
              <li>Players in your roster with contracts expiring within 6 months</li>
              <li>Favorite clubs added</li>
              <li>Players valued in range (Fortis Nova range)</li>
              <li>Clubs must have expiring contracts in same position</li>
            </ul>
          </CardContent>
        </Card>
      ) : (
        <>
          <SmartRecommendationsCards
            recommendations={recommendations}
            isRecalculating={isRecalculating}
          />

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
