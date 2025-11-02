"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  TrendingUp,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import type { SmartRecommendation } from '@/app/dashboard/agents/recommendations/page'
import { getCountryFlag } from '@/lib/utils/country-flags'
import PlayerComparisonCard, { type PlayerCardData } from './player-comparison-card'

interface SmartRecommendationsCardsProps {
  recommendations: SmartRecommendation[]
}

// Component for each recommendation - fetches full player data
function RecommendationCard({ rec }: { rec: SmartRecommendation }) {
  const [agentPlayerData, setAgentPlayerData] = useState<PlayerCardData | null>(null)
  const [expiringPlayersData, setExpiringPlayersData] = useState<Record<string, PlayerCardData>>({})
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        setLoading(true)

        // Fetch full data for agent's player with separate queries
        const { data: playerData, error: playerError } = await supabase
          .from('players_transfermarkt')
          .select('*')
          .eq('id', rec.player_id)
          .single()

        if (playerError) {
          console.error('[Recommendations] Error fetching player:', playerError)
        }

        if (playerData) {
          // Fetch club data
          let clubData = null
          let leagueData = null

          if (playerData.club_id) {
            const { data: club } = await supabase
              .from('clubs_transfermarkt')
              .select('*')
              .eq('id', playerData.club_id)
              .single()

            clubData = club

            // Fetch league data
            if (club?.league_id) {
              const { data: league } = await supabase
                .from('leagues_transfermarkt')
                .select('*')
                .eq('id', club.league_id)
                .single()

              leagueData = league
            }
          }

          setAgentPlayerData({
            player_id: playerData.id,
            player_name: playerData.name,
            player_transfermarkt_url: playerData.transfermarkt_url,
            picture_url: playerData.picture_url,
            position: playerData.main_position,
            age: playerData.age,
            nationality: playerData.nationality,
            club_name: clubData?.name,
            club_logo_url: clubData?.logo_url,
            club_transfermarkt_url: clubData?.transfermarkt_url,
            league_name: leagueData?.name,
            league_tier: leagueData?.tier,
            league_country: leagueData?.country,
            league_transfermarkt_url: leagueData?.transfermarkt_url,
            height: playerData.height,
            foot: playerData.foot,
            market_value: playerData.market_value_eur,
            contract_expires: playerData.contract_expires,
            is_eu_passport: playerData.is_eu_passport
          })
        }

        // Fetch full data for expiring players
        if (rec.match_reasons.expiring_players && rec.match_reasons.expiring_players.length > 0) {
          const expiringPlayerNames = rec.match_reasons.expiring_players.map(p => p.name)

          const { data: expiringData, error: expiringError } = await supabase
            .from('players_transfermarkt')
            .select('*')
            .eq('club_id', rec.club_id)
            .in('name', expiringPlayerNames)

          if (expiringError) {
            console.error('[Recommendations] Error fetching expiring players:', expiringError)
          }

          if (expiringData && expiringData.length > 0) {
            const expiringMap: Record<string, PlayerCardData> = {}

            // Fetch club data (same for all expiring players since they're from the same club)
            const { data: clubData } = await supabase
              .from('clubs_transfermarkt')
              .select('*')
              .eq('id', rec.club_id)
              .single()

            // Fetch league data
            let leagueData = null
            if (clubData?.league_id) {
              const { data: league } = await supabase
                .from('leagues_transfermarkt')
                .select('*')
                .eq('id', clubData.league_id)
                .single()

              leagueData = league
            }

            expiringData.forEach((player: any) => {
              expiringMap[player.name] = {
                player_id: player.id,
                player_name: player.name,
                player_transfermarkt_url: player.transfermarkt_url,
                picture_url: player.picture_url,
                position: player.main_position,
                age: player.age,
                nationality: player.nationality,
                club_name: clubData?.name,
                club_logo_url: clubData?.logo_url,
                club_transfermarkt_url: clubData?.transfermarkt_url,
                league_name: leagueData?.name,
                league_tier: leagueData?.tier,
                league_country: leagueData?.country,
                league_transfermarkt_url: leagueData?.transfermarkt_url,
                height: player.height,
                foot: player.foot,
                market_value: player.market_value_eur,
                contract_expires: player.contract_expires,
                is_eu_passport: player.is_eu_passport
              }
            })
            setExpiringPlayersData(expiringMap)
          }
        }
      } catch (error) {
        console.error('[Recommendations] Error fetching player data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayerData()
  }, [rec])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric'
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400'
    if (score >= 50) return 'text-blue-600 dark:text-blue-400'
    return 'text-orange-600 dark:text-orange-400'
  }

  const getScoreBadgeColor = (score: number) => {
    if (score >= 70) return 'bg-green-500'
    if (score >= 50) return 'bg-blue-500'
    return 'bg-orange-500'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'Excellent Match'
    if (score >= 50) return 'Good Match'
    return 'Potential Match'
  }

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-12 text-center text-muted-foreground">
          Loading player details...
        </CardContent>
      </Card>
    )
  }

  if (!agentPlayerData) {
    return null
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* LEFT & MIDDLE: Club Info with Player Comparisons (2 columns) */}
          <div className="lg:col-span-2 p-6 border-r">
            <div className="flex items-start gap-4 mb-6">
              {/* Club Logo */}
              <div className="flex-shrink-0">
                {rec.club_transfermarkt_url ? (
                  <a
                    href={rec.club_transfermarkt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:opacity-80 transition-opacity"
                  >
                    {rec.club_logo_url ? (
                      <img
                        src={rec.club_logo_url}
                        alt={rec.club_name}
                        className="w-16 h-16 object-contain border-2 border-background shadow-md rounded-lg bg-white p-2 cursor-pointer"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md cursor-pointer">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </a>
                ) : (
                  <>
                    {rec.club_logo_url ? (
                      <img
                        src={rec.club_logo_url}
                        alt={rec.club_name}
                        className="w-16 h-16 object-contain border-2 border-background shadow-md rounded-lg bg-white p-2"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Club Details */}
              <div className="flex-1 min-w-0">
                {rec.club_transfermarkt_url ? (
                  <a
                    href={rec.club_transfermarkt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    <h3 className="font-bold text-lg mb-1">{rec.club_name}</h3>
                  </a>
                ) : (
                  <h3 className="font-bold text-lg mb-1">{rec.club_name}</h3>
                )}

                {rec.league_name && (
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {rec.league_name}
                    </Badge>
                    {rec.league_tier && (
                      <Badge variant="outline" className="text-xs">
                        Tier {rec.league_tier}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Looking for: <span className="font-medium text-foreground">{rec.player_position}</span></p>
                  {rec.match_reasons.position_shortage <= 2 && (
                    <p className="text-orange-600 font-medium">
                      ⚠️ Only {rec.match_reasons.position_shortage} player{rec.match_reasons.position_shortage !== 1 ? 's' : ''} in position
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Player Comparisons */}
            {rec.match_reasons.expiring_contracts_in_position > 0 && rec.match_reasons.expiring_players && rec.match_reasons.expiring_players.length > 0 && (
              <div className="space-y-4">
                {rec.match_reasons.expiring_players.map((expiringPlayer, idx) => {
                  const expiringPlayerFullData = expiringPlayersData[expiringPlayer.name]

                  if (!expiringPlayerFullData) return null

                  return (
                    <div key={idx} className="space-y-3">
                      {/* Comparison Label */}
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <div className="h-px bg-border flex-1" />
                        <span>REPLACEMENT OPPORTUNITY #{idx + 1}</span>
                        <div className="h-px bg-border flex-1" />
                      </div>

                      {/* Player Comparison Cards */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Expiring Player Card */}
                        <PlayerComparisonCard
                          player={expiringPlayerFullData}
                          variant="expiring"
                          contractInfo={`Expires ${formatDate(expiringPlayer.contract_expires)}`}
                        />

                        {/* Your Player Card */}
                        <PlayerComparisonCard
                          player={agentPlayerData}
                          variant="your-player"
                          contractInfo={`Free ${formatDate(rec.player_contract_expires)}`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* RIGHT: Match Analysis */}
          <div className="p-6 bg-muted/30">
            {/* Match Score */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Match Score</span>
                <span className={`text-2xl font-bold ${getScoreColor(rec.match_score)}`}>
                  {rec.match_score}
                </span>
              </div>
              <Badge className={`w-full justify-center ${getScoreBadgeColor(rec.match_score)}`}>
                <TrendingUp className="h-3 w-3 mr-1" />
                {getScoreLabel(rec.match_score)}
              </Badge>
            </div>

            {/* Why This Match */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Why This Match Works
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Same league & tier - realistic move</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Contract expires in {Math.round(rec.match_reasons.details.months_until_free)} month{Math.round(rec.match_reasons.details.months_until_free) !== 1 ? 's' : ''} - free transfer</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Exact position match - {rec.player_position}</span>
                </div>
                {rec.match_reasons.has_squad_need && (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-3 w-3 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span className="font-medium">Club has urgent need in this position</span>
                  </div>
                )}
                {rec.match_reasons.same_nationality && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Same nationality - easy integration</span>
                  </div>
                )}
                {rec.match_reasons.age_fits_profile && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>
                      Age fits squad profile ({rec.match_reasons.squad_avg_age_in_position?.toFixed(1)} avg)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SmartRecommendationsCards({ recommendations }: SmartRecommendationsCardsProps) {
  return (
    <div className="space-y-6">
      {recommendations.map((rec) => (
        <RecommendationCard key={rec.recommendation_id} rec={rec} />
      ))}
    </div>
  )
}
