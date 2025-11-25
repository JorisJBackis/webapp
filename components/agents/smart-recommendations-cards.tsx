"use client"

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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

// Skeleton card for loading state
function RecommendationCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-16 h-16 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
          <div className="w-48 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-6 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Component for each recommendation - uses data from recommendation directly (no extra API calls!)
function RecommendationCard({
  rec,
  clubContacts
}: {
  rec: SmartRecommendation
  clubContacts: ClubContact[]
}) {
  // Build player data directly from recommendation - NO API CALLS NEEDED!
  const agentPlayerData: PlayerCardData = useMemo(() => ({
    player_id: rec.player_id,
    player_name: rec.player_name,
    player_transfermarkt_url: rec.player_transfermarkt_url,
    picture_url: rec.player_picture_url,
    position: rec.player_position,
    age: rec.player_age,
    nationality: rec.player_nationality,
    club_name: null, // Player's current club not needed for comparison
    club_logo_url: null,
    club_transfermarkt_url: null,
    club_avg_market_value: null,
    league_name: null,
    league_tier: null,
    league_country: null,
    league_transfermarkt_url: null,
    height: null,
    foot: null,
    market_value: rec.player_market_value,
    contract_expires: rec.player_contract_expires,
    is_eu_passport: null
  }), [rec])

  // Build expiring players data from match_reasons
  const expiringPlayersData: Record<string, PlayerCardData> = useMemo(() => {
    const map: Record<string, PlayerCardData> = {}
    if (rec.match_reasons.expiring_players) {
      rec.match_reasons.expiring_players.forEach(p => {
        map[p.name] = {
          player_id: 0,
          player_name: p.name,
          player_transfermarkt_url: null,
          picture_url: null,
          position: rec.player_position, // Same position
          age: p.age,
          nationality: null,
          club_name: rec.club_name,
          club_logo_url: rec.club_logo_url,
          club_transfermarkt_url: rec.club_transfermarkt_url,
          club_avg_market_value: rec.club_avg_market_value,
          league_name: rec.league_name,
          league_tier: rec.league_tier,
          league_country: rec.club_country,
          league_transfermarkt_url: null,
          height: null,
          foot: null,
          market_value: p.market_value,
          contract_expires: p.contract_expires,
          is_eu_passport: null
        }
      })
    }
    return map
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
                <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                {rec.match_reasons.expiring_players.slice(0, 2).map((expiringPlayer, idx) => {
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
                    <span className="font-semibold text-red-700">100% squad leaving - total replacement needed (+40 pts)</span>
                  </div>
                )}
                {rec.match_reasons.urgency_most_leaving && !rec.match_reasons.urgency_total_replacement && (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-3 w-3 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span className="font-semibold text-orange-700">Most leaving ({rec.match_reasons.turnover_percentage}%) - {rec.match_reasons.expiring_contracts_in_position}/{rec.match_reasons.position_count} players (+25 pts)</span>
                  </div>
                )}
                {rec.match_reasons.urgency_half_leaving && !rec.match_reasons.urgency_most_leaving && !rec.match_reasons.urgency_total_replacement && (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-3 w-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span className="font-medium text-yellow-700">Need replacement ({rec.match_reasons.turnover_percentage}%) (+15 pts)</span>
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
                    <span>Perfect market fit (+30 pts)</span>
                  </div>
                )}

                {/* Multiple Openings */}
                {rec.match_reasons.multiple_openings_massive && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="font-semibold">{rec.match_reasons.expiring_contracts_in_position} players leaving (+25 pts)</span>
                  </div>
                )}

                {/* Imminent Free */}
                {rec.match_reasons.imminent_free && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Free in {Math.round(rec.match_reasons.details.months_until_free)} month{Math.round(rec.match_reasons.details.months_until_free) !== 1 ? 's' : ''} (+25 pts)</span>
                  </div>
                )}

                {/* Nationality */}
                {rec.match_reasons.same_country && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Same nationality (+20 pts)</span>
                  </div>
                )}

                {/* Age Profile */}
                {rec.match_reasons.age_fits_profile && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Age fits squad (+15 pts)</span>
                  </div>
                )}

                {/* Prime Age */}
                {rec.match_reasons.age_prime && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Prime age 23-28 (+15 pts)</span>
                  </div>
                )}

                {/* Nordic Neighbor */}
                {rec.match_reasons.nordic_neighbor && !rec.match_reasons.same_country && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Nordic neighbor (+10 pts)</span>
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
                          <a href={`mailto:${contact.email}`} className="text-primary hover:underline truncate">
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <a href={`tel:${contact.phone}`} className="text-primary hover:underline truncate">
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
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg">
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
  const [clubContactsMap, setClubContactsMap] = useState<Record<number, ClubContact[]>>({})
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [displayCount, setDisplayCount] = useState(3)

  const supabase = createClient()

  // Batch fetch all club contacts in ONE query
  useEffect(() => {
    const fetchAllContacts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoadingContacts(false)
          return
        }

        // Get unique club IDs
        const clubIds = [...new Set(recommendations.map(r => r.club_id))]

        // Fetch all contacts in ONE query
        const { data: favoriteClubs } = await supabase
          .from('agent_favorite_clubs')
          .select('club_id, contacts')
          .eq('agent_id', user.id)
          .in('club_id', clubIds)

        // Build map
        const contactsMap: Record<number, ClubContact[]> = {}
        favoriteClubs?.forEach(fc => {
          if (fc.contacts && Array.isArray(fc.contacts)) {
            contactsMap[fc.club_id] = fc.contacts
          }
        })

        setClubContactsMap(contactsMap)
      } catch (error) {
        console.error('[Recommendations] Error fetching contacts:', error)
      } finally {
        setLoadingContacts(false)
      }
    }

    if (recommendations.length > 0) {
      fetchAllContacts()
    } else {
      setLoadingContacts(false)
    }
  }, [recommendations, supabase])

  // Progressive loading: show first 3 immediately, then load more on scroll
  const visibleRecommendations = recommendations.slice(0, displayCount)
  const hasMore = displayCount < recommendations.length

  // Load more when scrolling near bottom
  useEffect(() => {
    if (!hasMore) return

    const handleScroll = () => {
      const scrolledToBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 800
      if (scrolledToBottom && hasMore) {
        setDisplayCount(prev => Math.min(prev + 5, recommendations.length))
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasMore, recommendations.length])

  // Show skeletons while loading contacts (but cards render immediately!)
  if (loadingContacts && recommendations.length > 0) {
    return (
      <div className="space-y-6">
        {recommendations.slice(0, 3).map((rec) => (
          <RecommendationCard
            key={rec.recommendation_id}
            rec={rec}
            clubContacts={[]}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {visibleRecommendations.map((rec) => (
        <RecommendationCard
          key={rec.recommendation_id}
          rec={rec}
          clubContacts={clubContactsMap[rec.club_id] || []}
        />
      ))}

      {hasMore && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Scroll for more... ({displayCount}/{recommendations.length})
        </div>
      )}
    </div>
  )
}
