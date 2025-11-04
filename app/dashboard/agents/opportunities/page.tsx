"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import OpportunitiesTable from '@/components/agents/opportunities-table'
import type { Database } from '@/lib/supabase/database.types'

type RecruitmentNeed = Database['public']['Functions']['get_recruitment_needs']['Returns'][number]

export type OpportunityWithMatches = RecruitmentNeed & {
  matched_players: MatchedPlayer[]
}

export type MatchedPlayer = {
  player_id: number
  player_name: string
  match_reasons: {
    position_match: boolean
    age_match: boolean
    height_match: boolean
    foot_match: boolean
    player_position: string | null
    player_age: number | null
    player_height: number | null
    player_foot: string | null
  }
}

export default function AgentOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<OpportunityWithMatches[]>([])
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

  // Fetch opportunities and matches
  useEffect(() => {
    if (!agentId) return

    const fetchOpportunities = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!supabase) return

        console.log('[Opportunities] Fetching for agent:', agentId)

        // Fetch all recruitment needs
        const { data: needs, error: needsError } = await supabase.rpc('get_recruitment_needs', {
          p_requesting_club_id: 1 // Dummy value, agents see all needs
        })

        console.log('[Opportunities] Needs response:', { data: needs, error: needsError })

        if (needsError) {
          console.error('[Opportunities] Needs error:', needsError)
          throw needsError
        }

        // Fetch matches for agent's roster
        const { data: matches, error: matchesError } = await supabase.rpc('match_roster_with_needs', {
          p_agent_id: agentId
        })

        console.log('[Opportunities] Matches response:', { data: matches, error: matchesError })

        if (matchesError) {
          console.error('[Opportunities] Matches error:', matchesError)
          throw matchesError
        }

        // Group matches by need_id
        const matchesByNeed: Record<number, MatchedPlayer[]> = {}
        if (matches) {
          matches.forEach((match: any) => {
            if (!matchesByNeed[match.need_id]) {
              matchesByNeed[match.need_id] = []
            }
            matchesByNeed[match.need_id].push({
              player_id: match.matched_player_id,
              player_name: match.matched_player_name,
              match_reasons: match.match_reasons
            })
          })
        }

        // Helper function to calculate match quality score
        const calculateMatchScore = (matchReasons: any): number => {
          let score = 0

          // Position: exact = 1.0, semi = 0.5, none = 0
          if (matchReasons.position_match_type === 'exact') score += 1.0
          else if (matchReasons.position_match_type === 'semi') score += 0.5

          // Age: exact = 1.0, none = 0
          if (matchReasons.age_match_type === 'exact') score += 1.0

          // Height: exact = 1.0, none = 0
          if (matchReasons.height_match_type === 'exact') score += 1.0

          // Foot: exact = 1.0, none = 0
          if (matchReasons.foot_match_type === 'exact') score += 1.0

          return score
        }

        // Combine needs with their matches and sort players within each opportunity
        const opportunitiesWithMatches: OpportunityWithMatches[] = (needs || []).map(need => {
          const players = matchesByNeed[need.need_id] || []

          // Sort players by match quality (best first: 4.0, 3.5, 3.0, etc.)
          players.sort((a, b) => {
            const scoreA = calculateMatchScore(a.match_reasons)
            const scoreB = calculateMatchScore(b.match_reasons)
            return scoreB - scoreA // Higher scores first
          })

          return {
            ...need,
            matched_players: players
          }
        })

        // Sort opportunities by: 1) Number of matches, 2) Most recent
        opportunitiesWithMatches.sort((a, b) => {
          // First sort by number of matches (descending)
          const matchDiff = b.matched_players.length - a.matched_players.length
          if (matchDiff !== 0) return matchDiff

          // If same number of matches, sort by date (most recent first)
          return new Date(b.need_created_at).getTime() - new Date(a.need_created_at).getTime()
        })

        setOpportunities(opportunitiesWithMatches)
      } catch (err: any) {
        console.error('Error fetching opportunities:', err)
        setError('Failed to load opportunities')
      } finally {
        setLoading(false)
      }
    }

    fetchOpportunities()
  }, [agentId, supabase])

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
        <h1 className="text-3xl font-bold tracking-tight text-primary">Ads</h1>
        <p className="text-muted-foreground">
          Browse club recruitment needs and see which of your roster players are a match
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recruitment Needs ({opportunities.length})</CardTitle>
          <CardDescription>
            Clubs looking for players - your matching roster players are highlighted
          </CardDescription>
        </CardHeader>
        <CardContent>
          {opportunities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">No active recruitment needs found</p>
              <p>Check back later for new opportunities</p>
            </div>
          ) : (
            <OpportunitiesTable opportunities={opportunities} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
