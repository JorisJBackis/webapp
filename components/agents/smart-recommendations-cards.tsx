"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  User,
  Mail,
  Phone,
  Briefcase,
  Send
} from 'lucide-react'
import type { SmartRecommendation } from '@/app/dashboard/agents/recommendations/page'
import PlayerComparisonCard, { type PlayerCardData } from './player-comparison-card'
import { Button } from '@/components/ui/button'
import { getCountryFlag } from '@/lib/utils/country-flags'

interface ClubContact {
  name: string | null
  email: string | null
  phone: string | null
  role: string | null
}

interface SmartRecommendationsCardsProps {
  recommendations: SmartRecommendation[]
}

// Component for each recommendation - fetches full player data
function RecommendationCard({ rec }: { rec: SmartRecommendation }) {
  const [agentPlayerData, setAgentPlayerData] = useState<PlayerCardData | null>(null)
  const [expiringPlayersData, setExpiringPlayersData] = useState<Record<string, PlayerCardData>>({})
  const [clubContacts, setClubContacts] = useState<ClubContact[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        setLoading(true)

        // Get current user (agent)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch full data for agent's player with separate queries
        const { data: playerData, error: playerError } = await supabase
          .from('players_transfermarkt')
          .select('*')
          .eq('id', rec.player_id)
          .single()

        if (playerError) {
          console.error('[Recommendations] Error fetching player:', playerError)
        }

        // Fetch agent overrides for this player
        const { data: overrideData } = await supabase
          .from('agent_player_overrides')
          .select('*')
          .eq('agent_id', user.id)
          .eq('player_id', rec.player_id)
          .maybeSingle()

        if (playerData) {
          // Apply overrides using COALESCE pattern (override takes priority)
          const finalPosition = overrideData?.position_override ?? playerData.main_position
          const finalAge = overrideData?.age_override ?? playerData.age
          const finalHeight = overrideData?.height_override ?? playerData.height
          const finalFoot = overrideData?.foot_override ?? playerData.foot
          const finalNationality = overrideData?.nationality_override ?? playerData.nationality
          const finalContractExpires = overrideData?.contract_expires_override ?? playerData.contract_expires
          const finalMarketValue = overrideData?.market_value_override ?? playerData.market_value_eur

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
            position: finalPosition,
            age: finalAge,
            nationality: finalNationality,
            club_name: clubData?.name,
            club_logo_url: clubData?.logo_url,
            club_transfermarkt_url: clubData?.transfermarkt_url,
            club_avg_market_value: clubData?.avg_market_value_eur,
            league_name: leagueData?.name,
            league_tier: leagueData?.tier,
            league_country: leagueData?.country,
            league_transfermarkt_url: leagueData?.transfermarkt_url,
            height: finalHeight,
            foot: finalFoot,
            market_value: finalMarketValue,
            contract_expires: finalContractExpires,
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
                club_avg_market_value: clubData?.avg_market_value_eur,
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

        // Fetch club contacts from agent_favorite_clubs
        const { data: favoriteClubData } = await supabase
          .from('agent_favorite_clubs')
          .select('contacts')
          .eq('agent_id', user.id)
          .eq('club_id', rec.club_id)
          .maybeSingle()

        if (favoriteClubData && favoriteClubData.contacts) {
          setClubContacts(Array.isArray(favoriteClubData.contacts) ? favoriteClubData.contacts : [])
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

  const formatMarketValue = (value: number | null) => {
    if (!value) return 'N/A'
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`
    return `€${value}`
  }

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading player smart recommendations...</span>
          </div>
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

                {/* Country, League & Tier on same line */}
                <div className="flex items-center gap-2 mb-2">
                  {rec.club_country && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <span className="text-base">{getCountryFlag(rec.club_country)}</span>
                      <span>{rec.club_country}</span>
                    </div>
                  )}
                  {rec.league_name && (
                    <>
                      <Badge variant="outline" className="text-xs border-2">
                        {rec.league_name}
                      </Badge>
                      {rec.league_tier && (
                        <Badge variant="outline" className="text-xs">
                          Tier {rec.league_tier}
                        </Badge>
                      )}
                      {rec.club_avg_market_value && (
                        <Badge variant="outline" className="text-xs">
                          {formatMarketValue(rec.club_avg_market_value)}/p
                        </Badge>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Looking for: <span className="font-medium text-foreground">{rec.player_position}</span></p>
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
                {/* Contract Timing - KILLER FEATURE */}
                {rec.match_reasons.contract_timing_perfect && rec.match_reasons.expiring_players && rec.match_reasons.expiring_players.length > 0 && (() => {
                  // Calculate actual difference between the two contracts
                  const agentContractDate = new Date(rec.player_contract_expires)
                  const expiringContractDate = new Date(rec.match_reasons.expiring_players[0].contract_expires)
                  const daysDiff = Math.abs((agentContractDate.getTime() - expiringContractDate.getTime()) / (1000 * 60 * 60 * 24))
                  const monthsDiff = Math.round(daysDiff / 30.44)

                  return (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="font-semibold text-green-700">
                        Perfect timing - {monthsDiff === 0 ? 'contracts expire same day' : `expires ${monthsDiff} month${monthsDiff !== 1 ? 's' : ''} apart`} (+40 pts)
                      </span>
                    </div>
                  )
                })()}
                {rec.match_reasons.contract_timing_good && !rec.match_reasons.contract_timing_perfect && rec.match_reasons.expiring_players && rec.match_reasons.expiring_players.length > 0 && (() => {
                  // Calculate actual difference between the two contracts
                  const agentContractDate = new Date(rec.player_contract_expires)
                  const expiringContractDate = new Date(rec.match_reasons.expiring_players[0].contract_expires)
                  const daysDiff = Math.abs((agentContractDate.getTime() - expiringContractDate.getTime()) / (1000 * 60 * 60 * 24))
                  const monthsDiff = Math.round(daysDiff / 30.44)

                  return (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="font-medium">
                        Good timing - expires {monthsDiff} month{monthsDiff !== 1 ? 's' : ''} apart (+25 pts)
                      </span>
                    </div>
                  )
                })()}

                {/* Squad Turnover Urgency */}
                {rec.match_reasons.urgency_total_replacement && (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-3 w-3 text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="font-semibold text-red-700">100% squad leaving in this position - total replacement needed (+40 pts)</span>
                  </div>
                )}
                {rec.match_reasons.urgency_most_leaving && !rec.match_reasons.urgency_total_replacement && (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-3 w-3 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span className="font-semibold text-orange-700">Most squad leaving this position ({rec.match_reasons.turnover_percentage}%) - {rec.match_reasons.expiring_contracts_in_position}/{rec.match_reasons.position_count} players (+25 pts)</span>
                  </div>
                )}
                {rec.match_reasons.urgency_half_leaving && !rec.match_reasons.urgency_most_leaving && !rec.match_reasons.urgency_total_replacement && (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-3 w-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span className="font-medium text-yellow-700">Need replacement ({rec.match_reasons.turnover_percentage}%) - {rec.match_reasons.expiring_contracts_in_position}/{rec.match_reasons.position_count} players leaving this position (+15 pts)</span>
                  </div>
                )}

                {/* Same League */}
                {rec.match_reasons.same_league && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Same league - realistic move (+30 pts)</span>
                  </div>
                )}

                {/* Market Fit */}
                {rec.match_reasons.market_fit_perfect && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Perfect market fit - ideal price range (+30 pts)</span>
                  </div>
                )}
                {/* Multiple Openings */}
                {rec.match_reasons.multiple_openings_massive && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="font-semibold">Multiple openings - {rec.match_reasons.expiring_contracts_in_position} players leaving (+25 pts)</span>
                  </div>
                )}
                {rec.match_reasons.multiple_openings_great && !rec.match_reasons.multiple_openings_massive && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="font-semibold">Multiple openings - 4 players leaving (+20 pts)</span>
                  </div>
                )}
                {rec.match_reasons.multiple_openings_good && !rec.match_reasons.multiple_openings_great && !rec.match_reasons.multiple_openings_massive && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Multiple openings - 3 players leaving (+15 pts)</span>
                  </div>
                )}

                {/* Imminent Free */}
                {rec.match_reasons.imminent_free && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Free agent in {Math.round(rec.match_reasons.details.months_until_free)} month{Math.round(rec.match_reasons.details.months_until_free) !== 1 ? 's' : ''} - Urgent (+25 pts)</span>
                  </div>
                )}

                {/* Nationality */}
                {rec.match_reasons.same_country && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Same nationality - easy integration (+20 pts)</span>
                  </div>
                )}

                {/* Age Profile */}
                {rec.match_reasons.age_fits_profile && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>
                      Age fits squad profile - {rec.match_reasons.squad_avg_age_in_position?.toFixed(1)} avg (+15 pts)
                    </span>
                  </div>
                )}

                {/* Prime Age */}
                {rec.match_reasons.age_prime && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Prime age (23-28) - peak performance (+15 pts)</span>
                  </div>
                )}

                {/* Young Prospect */}
                {rec.match_reasons.age_prospect && !rec.match_reasons.age_prime && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Young prospect (19-22) - development potential (+10 pts)</span>
                  </div>
                )}

                {/* Nordic Neighbor */}
                {rec.match_reasons.nordic_neighbor && !rec.match_reasons.same_country && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Nordic neighbor - similar culture (+10 pts)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Club Contacts Section */}
            {clubContacts.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-3">Club Contacts</h4>
                <div className="space-y-2">
                  {clubContacts.map((contact, index) => (
                    <div
                      key={index}
                      className="text-xs p-2 bg-background rounded border space-y-1"
                    >
                      {contact.name && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">{contact.name}</span>
                        </div>
                      )}
                      {contact.role && (
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-muted-foreground truncate">{contact.role}</span>
                        </div>
                      )}
                      {contact.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-primary hover:underline truncate"
                          >
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <a
                            href={`tel:${contact.phone}`}
                            className="text-primary hover:underline truncate"
                          >
                            {contact.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Club Button */}
            <div className="mt-6">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <Send className="h-4 w-4 mr-2" />
                Contact Club!
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SmartRecommendationsCards({ recommendations }: SmartRecommendationsCardsProps) {
  const [displayCount, setDisplayCount] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  const visibleRecommendations = recommendations.slice(0, displayCount)
  const hasMore = displayCount < recommendations.length

  // Staggered initial load: 1 -> 2 -> 3
  useEffect(() => {
    if (displayCount === 1 && recommendations.length > 1) {
      const timer = setTimeout(() => setDisplayCount(2), 500)
      return () => clearTimeout(timer)
    }
    if (displayCount === 2 && recommendations.length > 2) {
      const timer = setTimeout(() => setDisplayCount(3), 500)
      return () => clearTimeout(timer)
    }
  }, [displayCount, recommendations.length])

  // Infinite scroll: load 10 more when trigger element enters viewport
  useEffect(() => {
    if (displayCount < 3 || !hasMore || isLoading) return

    // Calculate trigger index: 5 cards from bottom, but at least index 0
    const triggerIndex = Math.max(0, displayCount - 5)
    const triggerElement = document.querySelector(`[data-recommendation-index="${triggerIndex}"]`)

    if (!triggerElement) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !isLoading) {
            setIsLoading(true)
            // Load 10 more cards
            setTimeout(() => {
              setDisplayCount(prev => Math.min(prev + 10, recommendations.length))
              setIsLoading(false)
            }, 300)
          }
        })
      },
      { rootMargin: '400px' } // Start loading when 400px away
    )

    observer.observe(triggerElement)

    return () => {
      observer.disconnect()
    }
  }, [displayCount, hasMore, isLoading, recommendations.length])

  return (
    <div className="space-y-6">
      {visibleRecommendations.map((rec, index) => (
        <div key={rec.recommendation_id} data-recommendation-index={index}>
          <RecommendationCard rec={rec} />
        </div>
      ))}

      {isLoading && hasMore && (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading more recommendations...</span>
          </div>
        </div>
      )}

      {!hasMore && recommendations.length > 1 && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          All {recommendations.length} recommendations loaded
        </div>
      )}
    </div>
  )
}
