"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Building2,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Euro,
  ExternalLink
} from 'lucide-react'
import type { SmartRecommendation } from '@/app/dashboard/agents/opportunities/page'
import { getCountryFlag } from '@/lib/utils/country-flags'

interface SmartRecommendationsCardsProps {
  recommendations: SmartRecommendation[]
}

export default function SmartRecommendationsCards({ recommendations }: SmartRecommendationsCardsProps) {
  const formatMarketValue = (value: number | null) => {
    if (!value) return 'N/A'
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`
    return `€${value}`
  }

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

  return (
    <div className="space-y-6">
      {recommendations.map((rec) => (
        <Card key={rec.recommendation_id} className="overflow-hidden hover:shadow-lg transition-shadow">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
              {/* LEFT: Player Info */}
              <div className="p-6 border-r bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-start gap-4">
                  {/* Player Photo */}
                  <div className="flex-shrink-0">
                    {rec.player_transfermarkt_url ? (
                      <a
                        href={rec.player_transfermarkt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:opacity-80 transition-opacity"
                      >
                        {rec.player_picture_url ? (
                          <img
                            src={rec.player_picture_url}
                            alt={rec.player_name}
                            className="w-20 h-20 rounded-lg object-cover border-2 border-background shadow-md cursor-pointer"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md cursor-pointer">
                            <User className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                      </a>
                    ) : (
                      <>
                        {rec.player_picture_url ? (
                          <img
                            src={rec.player_picture_url}
                            alt={rec.player_name}
                            className="w-20 h-20 rounded-lg object-cover border-2 border-background shadow-md"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md">
                            <User className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Player Details */}
                  <div className="flex-1 min-w-0">
                    {rec.player_transfermarkt_url ? (
                      <a
                        href={rec.player_transfermarkt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        <h3 className="font-bold text-lg mb-1">{rec.player_name}</h3>
                      </a>
                    ) : (
                      <h3 className="font-bold text-lg mb-1">{rec.player_name}</h3>
                    )}

                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge className="bg-primary text-primary-foreground">
                        {rec.player_position}
                      </Badge>
                      <Badge variant="secondary">
                        {rec.player_age} years
                      </Badge>
                    </div>

                    {rec.player_nationality && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <span className="text-lg">{getCountryFlag(rec.player_nationality)}</span>
                        <span>{rec.player_nationality}</span>
                      </div>
                    )}

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Euro className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{formatMarketValue(rec.player_market_value)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Free agent: {formatDate(rec.player_contract_expires)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* MIDDLE: Club Info */}
              <div className="p-6 border-r">
                <div className="flex items-start gap-4">
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
                      {rec.match_reasons.expiring_contracts_in_position > 0 && (
                        <div>
                          <p className="text-red-600 font-medium mb-3 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Could replace {rec.match_reasons.expiring_contracts_in_position} player{rec.match_reasons.expiring_contracts_in_position !== 1 ? 's' : ''}
                          </p>
                          {rec.match_reasons.expiring_players && rec.match_reasons.expiring_players.length > 0 && (
                            <div className="space-y-4">
                              {rec.match_reasons.expiring_players.map((expiringPlayer, idx) => (
                                <div key={idx} className="space-y-3">
                                  {/* Comparison Label */}
                                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                    <div className="h-px bg-border flex-1" />
                                    <span>REPLACEMENT OPPORTUNITY #{idx + 1}</span>
                                    <div className="h-px bg-border flex-1" />
                                  </div>

                                  {/* Player Comparison Cards */}
                                  <div className="grid grid-cols-2 gap-3">
                                    {/* Expiring Player Card */}
                                    <Card className="overflow-hidden border-red-200 dark:border-red-800">
                                      <CardContent className="p-0">
                                        {/* Header */}
                                        <div className="relative bg-red-50 dark:bg-red-950/20 p-3 border-b border-red-200 dark:border-red-800">
                                          <div className="flex items-center justify-between mb-2">
                                            <Badge variant="destructive" className="text-xs">
                                              EXPIRING PLAYER
                                            </Badge>
                                            <span className="text-xs text-red-600 dark:text-red-400">
                                              Expires {new Date(expiringPlayer.contract_expires).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                            </span>
                                          </div>
                                          <div className="flex items-start gap-2">
                                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md flex-shrink-0">
                                              <User className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <h4 className="font-bold text-sm truncate">{expiringPlayer.name}</h4>
                                              <div className="flex flex-wrap gap-1 mt-1">
                                                <Badge className="bg-primary text-primary-foreground text-xs">
                                                  {rec.player_position}
                                                </Badge>
                                                <Badge variant="secondary" className="text-xs">
                                                  {expiringPlayer.age} yrs
                                                </Badge>
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="p-3 space-y-2">
                                          <div className="grid grid-cols-1 gap-1 text-xs">
                                            <div className="flex items-center justify-between">
                                              <span className="text-muted-foreground flex items-center gap-1">
                                                <Euro className="h-3 w-3" />
                                                Market Value
                                              </span>
                                              <span className="font-medium">{formatMarketValue(expiringPlayer.market_value)}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                              <span className="text-muted-foreground flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                Age
                                              </span>
                                              <span className="font-medium">{expiringPlayer.age} years</span>
                                            </div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>

                                    {/* Your Player Card */}
                                    <Card className="overflow-hidden border-green-200 dark:border-green-800">
                                      <CardContent className="p-0">
                                        {/* Header */}
                                        <div className="relative bg-green-50 dark:bg-green-950/20 p-3 border-b border-green-200 dark:border-green-800">
                                          <div className="flex items-center justify-between mb-2">
                                            <Badge className="bg-green-600 text-white text-xs">
                                              YOUR PLAYER
                                            </Badge>
                                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                              Free {formatDate(rec.player_contract_expires)}
                                            </span>
                                          </div>
                                          <div className="flex items-start gap-2">
                                            {/* Player Photo - Clickable */}
                                            <div className="flex-shrink-0">
                                              {rec.player_transfermarkt_url ? (
                                                <a
                                                  href={rec.player_transfermarkt_url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="block hover:opacity-80 transition-opacity"
                                                >
                                                  {rec.player_picture_url ? (
                                                    <img
                                                      src={rec.player_picture_url}
                                                      alt={rec.player_name}
                                                      className="w-12 h-12 rounded-lg object-cover border-2 border-background shadow-md cursor-pointer"
                                                    />
                                                  ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md cursor-pointer">
                                                      <User className="h-6 w-6 text-muted-foreground" />
                                                    </div>
                                                  )}
                                                </a>
                                              ) : (
                                                <>
                                                  {rec.player_picture_url ? (
                                                    <img
                                                      src={rec.player_picture_url}
                                                      alt={rec.player_name}
                                                      className="w-12 h-12 rounded-lg object-cover border-2 border-background shadow-md"
                                                    />
                                                  ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md">
                                                      <User className="h-6 w-6 text-muted-foreground" />
                                                    </div>
                                                  )}
                                                </>
                                              )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                              {/* Player Name - Clickable */}
                                              {rec.player_transfermarkt_url ? (
                                                <a
                                                  href={rec.player_transfermarkt_url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="hover:underline"
                                                >
                                                  <h4 className="font-bold text-sm truncate">{rec.player_name}</h4>
                                                </a>
                                              ) : (
                                                <h4 className="font-bold text-sm truncate">{rec.player_name}</h4>
                                              )}

                                              <div className="flex flex-wrap gap-1 mt-1">
                                                <Badge className="bg-primary text-primary-foreground text-xs">
                                                  {rec.player_position}
                                                </Badge>
                                                <Badge variant="secondary" className="text-xs">
                                                  {rec.player_age} yrs
                                                </Badge>
                                              </div>
                                            </div>

                                            {/* External Link */}
                                            {rec.player_transfermarkt_url && (
                                              <a
                                                href={rec.player_transfermarkt_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-shrink-0"
                                              >
                                                <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                              </a>
                                            )}
                                          </div>
                                        </div>

                                        {/* Stats with Comparison */}
                                        <div className="p-3 space-y-2">
                                          <div className="grid grid-cols-1 gap-1 text-xs">
                                            <div className="flex items-center justify-between">
                                              <span className="text-muted-foreground flex items-center gap-1">
                                                <Euro className="h-3 w-3" />
                                                Market Value
                                              </span>
                                              <span className={`font-medium ${(rec.player_market_value || 0) > (expiringPlayer.market_value || 0) ? 'text-green-600 dark:text-green-400' : ''}`}>
                                                {formatMarketValue(rec.player_market_value)}
                                                {(rec.player_market_value || 0) > (expiringPlayer.market_value || 0) && ' ✓'}
                                              </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                              <span className="text-muted-foreground flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                Age
                                              </span>
                                              <span className={`font-medium ${rec.player_age < expiringPlayer.age ? 'text-green-600 dark:text-green-400' : ''}`}>
                                                {rec.player_age} years
                                                {rec.player_age < expiringPlayer.age && ' ✓'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
      ))}
    </div>
  )
}
