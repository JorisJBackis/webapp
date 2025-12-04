"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface SquadPosition {
  position: string
  player_count: number
  avg_age: number
  avg_market_value: number
  expiring_contracts: number
}

interface RecommendedPlayer {
  player_id: number
  player_name: string
  position: string
  age: number
  market_value: number | null
  contract_expires: string | null
  height: number | null
  foot: string | null
  nationality: string | null
  reason: string
}

interface NotRecommendedPlayer {
  player_id: number
  player_name: string
  position: string
  age: number
  market_value: number | null
  reason: string
}

interface Recommendation {
  club_id: number
  club_name: string
  competition_name: string | null
  country: string | null
  squad_analysis: SquadPosition[]
  recommended_players: RecommendedPlayer[]
  not_recommended_players: NotRecommendedPlayer[]
}

interface SmartRecommendationsCardProps {
  recommendation: Recommendation
}

export default function SmartRecommendationsCard({ recommendation }: SmartRecommendationsCardProps) {
  const [showSquadAnalysis, setShowSquadAnalysis] = useState(false)
  const [showNotRecommended, setShowNotRecommended] = useState(false)

  const formatCurrency = (value: number | null) => {
    if (value == null) return 'N/A'
    return `€${value.toLocaleString()}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const getSquadGaps = () => {
    if (!recommendation.squad_analysis) return []
    return recommendation.squad_analysis.filter(pos =>
      pos.player_count <= 1 || pos.expiring_contracts > 0
    )
  }

  const squadGaps = getSquadGaps()

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        {/* Club Header */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{recommendation.club_name}</h3>
              <div className="flex gap-2 mt-1">
                {recommendation.competition_name && (
                  <Badge variant="secondary">
                    {recommendation.competition_name}
                  </Badge>
                )}
                {recommendation.country && (
                  <Badge variant="outline">
                    {recommendation.country}
                  </Badge>
                )}
              </div>
            </div>
            {recommendation.recommended_players && recommendation.recommended_players.length > 0 && (
              <Badge className="bg-green-600">
                {recommendation.recommended_players.length} Match{recommendation.recommended_players.length !== 1 ? 'es' : ''}
              </Badge>
            )}
          </div>

          {/* Squad Gaps Summary */}
          {squadGaps.length > 0 && (
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Squad Gaps Identified: {squadGaps.length} position{squadGaps.length !== 1 ? 's' : ''}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {squadGaps.map(gap => (
                  <Badge key={gap.position} variant="outline" className="text-xs">
                    {gap.position}: {gap.player_count} player{gap.player_count !== 1 ? 's' : ''}
                    {gap.expiring_contracts > 0 && ` (${gap.expiring_contracts} expiring)`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Squad Analysis (Collapsible) */}
        {recommendation.squad_analysis && recommendation.squad_analysis.length > 0 && (
          <Collapsible open={showSquadAnalysis} onOpenChange={setShowSquadAnalysis} className="mb-4">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Squad Composition
                {showSquadAnalysis ? (
                  <ChevronUp className="h-4 w-4 ml-auto" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-auto" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Position</th>
                      <th className="text-center p-2">Players</th>
                      <th className="text-center p-2">Avg Age</th>
                      <th className="text-center p-2">Avg Value</th>
                      <th className="text-center p-2">Expiring</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendation.squad_analysis.map(pos => (
                      <tr key={pos.position} className="border-t">
                        <td className="p-2 font-medium">{pos.position}</td>
                        <td className="text-center p-2">
                          <Badge variant={pos.player_count <= 1 ? 'destructive' : 'secondary'}>
                            {pos.player_count}
                          </Badge>
                        </td>
                        <td className="text-center p-2">{pos.avg_age?.toFixed(1) || 'N/A'}</td>
                        <td className="text-center p-2">{formatCurrency(pos.avg_market_value)}</td>
                        <td className="text-center p-2">
                          {pos.expiring_contracts > 0 ? (
                            <Badge variant="outline" className="text-amber-600">
                              {pos.expiring_contracts}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Recommended Players */}
        {recommendation.recommended_players && recommendation.recommended_players.length > 0 ? (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Your Players That Make Sense ({recommendation.recommended_players.length})
            </h4>
            <div className="space-y-2">
              {recommendation.recommended_players.map(player => (
                <div
                  key={player.player_id}
                  className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium">{player.player_name}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="secondary">{player.position}</Badge>
                        <Badge variant="outline">{player.age} years</Badge>
                        {player.market_value && (
                          <Badge variant="outline">{formatCurrency(player.market_value)}</Badge>
                        )}
                        {player.height && (
                          <Badge variant="outline">{player.height} cm</Badge>
                        )}
                        {player.foot && (
                          <Badge variant="outline">{player.foot}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-green-900 dark:text-green-100">
                    <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p className="font-medium">{player.reason}</p>
                  </div>
                  {player.contract_expires && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Contract expires: {formatDate(player.contract_expires)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              None of your roster players are a good match for this club's current needs
            </p>
          </div>
        )}

        {/* Not Recommended Players (Collapsible) */}
        {recommendation.not_recommended_players && recommendation.not_recommended_players.length > 0 && (
          <Collapsible open={showNotRecommended} onOpenChange={setShowNotRecommended}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                <XCircle className="h-4 w-4 mr-2" />
                Players Not Recommended ({recommendation.not_recommended_players.length})
                {showNotRecommended ? (
                  <ChevronUp className="h-4 w-4 ml-auto" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-auto" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="space-y-2">
                {recommendation.not_recommended_players.map(player => (
                  <div
                    key={player.player_id}
                    className="p-3 bg-muted/50 border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">{player.player_name}</p>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">{player.position}</Badge>
                        <Badge variant="outline" className="text-xs">{player.age} yrs</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{player.reason}</p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button size="sm" className="flex-1">
            Contact Club
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            View Full Squad
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
