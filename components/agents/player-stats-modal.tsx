"use client"

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TrendingUpIcon, TrendingDownIcon, TargetIcon, Loader2, AlertCircle } from 'lucide-react'
import Image from 'next/image'

// Types
interface PlayerStats {
  footyLabsScore: number
  goals: number
  assists: number
  appearances: number
  minutesPlayed: number
  matchesStarted: number
  accuratePassesPercentage: number
  totalDuelsWonPercentage: number
  successfulDribblesPercentage: number
  aerialDuelsWonPercentage: number
  ballRecovery: number
  keyPasses: number
  shotsOnTarget: number
  totalShots: number
  goalConversionPercentage: number
  clearances: number
  totalCross: number
  accurateCrossesPercentage: number
  yellowCards: number
  redCards: number
  fouls: number
  wasFouled: number
}

interface StatConfig {
  key: keyof PlayerStats
  label: string
  format: (value: number) => string
  higherIsBetter: boolean
}

interface PlayerStatsModalProps {
  isOpen: boolean
  onClose: () => void
  player: {
    player_id: number
    player_name: string
    picture_url: string | null
    position: string | null
    age: number | null
    nationality: string | null
    club_name: string | null
    club_logo_url: string | null
    market_value_eur: number | null
    sf_data: any
    league_name: string | null
  } | null
}

// Stat configurations
const statConfigs: StatConfig[] = [
  { key: 'footyLabsScore', label: 'FootyLabs Score', format: (v) => v.toFixed(2), higherIsBetter: true },
  { key: 'goals', label: 'Goals', format: (v) => v.toString(), higherIsBetter: true },
  { key: 'assists', label: 'Assists', format: (v) => v.toString(), higherIsBetter: true },
  { key: 'appearances', label: 'Appearances', format: (v) => v.toString(), higherIsBetter: true },
  { key: 'minutesPlayed', label: 'Minutes Played', format: (v) => v.toString(), higherIsBetter: true },
  { key: 'accuratePassesPercentage', label: 'Pass Accuracy', format: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
  { key: 'totalDuelsWonPercentage', label: 'Duels Won', format: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
  { key: 'successfulDribblesPercentage', label: 'Dribbles Success', format: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
  { key: 'aerialDuelsWonPercentage', label: 'Aerial Duels', format: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
  { key: 'ballRecovery', label: 'Ball Recoveries', format: (v) => v.toString(), higherIsBetter: true },
  { key: 'keyPasses', label: 'Key Passes', format: (v) => v.toString(), higherIsBetter: true },
  { key: 'shotsOnTarget', label: 'Shots on Target', format: (v) => v.toString(), higherIsBetter: true },
  { key: 'clearances', label: 'Clearances', format: (v) => v.toString(), higherIsBetter: true },
  { key: 'accurateCrossesPercentage', label: 'Crossing Accuracy', format: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
  { key: 'yellowCards', label: 'Yellow Cards', format: (v) => v.toString(), higherIsBetter: false },
  { key: 'redCards', label: 'Red Cards', format: (v) => v.toString(), higherIsBetter: false },
]

// League ID to tournament name mapping
const leagueToTournament: { [key: string]: string[] } = {
  'Allsvenskan': ['Allsvenskan'],
  'Superettan': ['Superettan'],
  'Eliteserien': ['Eliteserien'],
  'OBOS-ligaen': ['OBOS-ligaen', '1. Division'],
  'Veikkausliiga': ['Veikkausliiga'],
  'Ykkösliiga': ['Ykkösliiga', 'Ykkönen'],
  'Virsliga': ['Virsliga'],
}

// Helper function to extract stats from sf_data
function extractSeasonStats(sfData: any, leagueName: string | null): PlayerStats | null {
  if (!sfData || !leagueName) return null

  // Get possible tournament names for this league
  const possibleTournaments = leagueToTournament[leagueName] || [leagueName]

  // sf_data structure: { "player_id": { "tournament_name": "...", "seasons": { "season_id": {...} } } }
  for (const playerId in sfData) {
    const playerData = sfData[playerId]

    // Check if this tournament matches any of the possible names
    if (possibleTournaments.some(t => playerData.tournament_name?.includes(t)) && playerData.seasons) {
      // Get the most recent season (highest season ID)
      const seasonIds = Object.keys(playerData.seasons)
      if (seasonIds.length === 0) continue

      // Sort season IDs numerically and get the latest
      const latestSeasonId = seasonIds.sort((a, b) => parseInt(b) - parseInt(a))[0]
      const seasonData = playerData.seasons[latestSeasonId]
      const stats = seasonData.statistics

      if (!stats) continue

      return {
        footyLabsScore: stats.rating || 0,
        goals: stats.goals || 0,
        assists: stats.assists || 0,
        appearances: stats.appearances || 0,
        minutesPlayed: stats.minutesPlayed || 0,
        matchesStarted: stats.matchesStarted || 0,
        accuratePassesPercentage: stats.accuratePassesPercentage || 0,
        totalDuelsWonPercentage: stats.totalDuelsWonPercentage || 0,
        successfulDribblesPercentage: stats.successfulDribblesPercentage || 0,
        aerialDuelsWonPercentage: stats.aerialDuelsWonPercentage || 0,
        ballRecovery: stats.ballRecovery || 0,
        keyPasses: stats.keyPasses || 0,
        shotsOnTarget: stats.shotsOnTarget || 0,
        totalShots: stats.totalShots || 0,
        goalConversionPercentage: stats.goalConversionPercentage || 0,
        clearances: stats.clearances || 0,
        totalCross: stats.totalCross || 0,
        accurateCrossesPercentage: stats.accurateCrossesPercentage || 0,
        yellowCards: stats.yellowCards || 0,
        redCards: stats.redCards || 0,
        fouls: stats.fouls || 0,
        wasFouled: stats.wasFouled || 0,
      }
    }
  }

  // Fallback: try to find any tournament data
  for (const playerId in sfData) {
    const playerData = sfData[playerId]
    if (playerData.seasons) {
      const seasonIds = Object.keys(playerData.seasons)
      if (seasonIds.length === 0) continue

      const latestSeasonId = seasonIds.sort((a, b) => parseInt(b) - parseInt(a))[0]
      const seasonData = playerData.seasons[latestSeasonId]
      const stats = seasonData.statistics

      if (!stats) continue

      return {
        footyLabsScore: stats.rating || 0,
        goals: stats.goals || 0,
        assists: stats.assists || 0,
        appearances: stats.appearances || 0,
        minutesPlayed: stats.minutesPlayed || 0,
        matchesStarted: stats.matchesStarted || 0,
        accuratePassesPercentage: stats.accuratePassesPercentage || 0,
        totalDuelsWonPercentage: stats.totalDuelsWonPercentage || 0,
        successfulDribblesPercentage: stats.successfulDribblesPercentage || 0,
        aerialDuelsWonPercentage: stats.aerialDuelsWonPercentage || 0,
        ballRecovery: stats.ballRecovery || 0,
        keyPasses: stats.keyPasses || 0,
        shotsOnTarget: stats.shotsOnTarget || 0,
        totalShots: stats.totalShots || 0,
        goalConversionPercentage: stats.goalConversionPercentage || 0,
        clearances: stats.clearances || 0,
        totalCross: stats.totalCross || 0,
        accurateCrossesPercentage: stats.accurateCrossesPercentage || 0,
        yellowCards: stats.yellowCards || 0,
        redCards: stats.redCards || 0,
        fouls: stats.fouls || 0,
        wasFouled: stats.wasFouled || 0,
      }
    }
  }

  return null
}

// Color functions based on value quality
function getStatColor(value: number, config: StatConfig): string {
  // For percentage stats, use the value directly
  if (config.key.includes('Percentage') || config.key === 'footyLabsScore') {
    if (config.key === 'footyLabsScore') {
      if (value >= 7.5) return 'text-green-500'
      if (value >= 7.0) return 'text-blue-500'
      if (value >= 6.5) return 'text-yellow-500'
      if (value >= 6.0) return 'text-orange-500'
      return 'text-red-500'
    }
    // Percentage stats
    if (value >= 70) return 'text-green-500'
    if (value >= 55) return 'text-blue-500'
    if (value >= 40) return 'text-yellow-500'
    if (value >= 25) return 'text-orange-500'
    return 'text-red-500'
  }

  // For cards (lower is better)
  if (config.key === 'yellowCards' || config.key === 'redCards') {
    if (value === 0) return 'text-green-500'
    if (value <= 2) return 'text-blue-500'
    if (value <= 4) return 'text-yellow-500'
    if (value <= 6) return 'text-orange-500'
    return 'text-red-500'
  }

  // Default - assume higher is better
  return 'text-primary'
}

function getStatBgColor(value: number, config: StatConfig): string {
  if (config.key.includes('Percentage') || config.key === 'footyLabsScore') {
    if (config.key === 'footyLabsScore') {
      if (value >= 7.5) return 'bg-green-500'
      if (value >= 7.0) return 'bg-blue-500'
      if (value >= 6.5) return 'bg-yellow-500'
      if (value >= 6.0) return 'bg-orange-500'
      return 'bg-red-500'
    }
    if (value >= 70) return 'bg-green-500'
    if (value >= 55) return 'bg-blue-500'
    if (value >= 40) return 'bg-yellow-500'
    if (value >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  if (config.key === 'yellowCards' || config.key === 'redCards') {
    if (value === 0) return 'bg-green-500'
    if (value <= 2) return 'bg-blue-500'
    if (value <= 4) return 'bg-yellow-500'
    if (value <= 6) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return 'bg-primary'
}

// Stat bar component
function StatBar({ config, value }: { config: StatConfig; value: number }) {
  // Calculate bar width based on stat type
  let barWidth = 50 // Default
  if (config.key === 'footyLabsScore') {
    barWidth = Math.min(100, (value / 10) * 100)
  } else if (config.key.includes('Percentage')) {
    barWidth = Math.min(100, value)
  } else if (config.key === 'yellowCards' || config.key === 'redCards') {
    barWidth = Math.min(100, 100 - (value * 10)) // Inverse - fewer cards = longer bar
  } else {
    // For count stats, use a reasonable max
    const maxValues: { [key: string]: number } = {
      goals: 30,
      assists: 20,
      appearances: 40,
      minutesPlayed: 3000,
      ballRecovery: 200,
      keyPasses: 50,
      shotsOnTarget: 50,
      clearances: 100,
    }
    const max = maxValues[config.key] || 100
    barWidth = Math.min(100, (value / max) * 100)
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium">{config.label}</span>
        <span className={getStatColor(value, config)}>
          {config.format(value)}
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getStatBgColor(value, config)} transition-all duration-500`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  )
}

export default function PlayerStatsModal({ isOpen, onClose, player }: PlayerStatsModalProps) {
  const [loading, setLoading] = useState(false)

  // Extract stats from sf_data
  const stats = useMemo(() => {
    if (!player?.sf_data) return null
    return extractSeasonStats(player.sf_data, player.league_name)
  }, [player?.sf_data, player?.league_name])

  // Calculate top strengths and areas to improve
  const { topStrengths, areasToImprove } = useMemo(() => {
    if (!stats) return { topStrengths: [], areasToImprove: [] }

    // Score each stat based on value quality
    const scoredStats = statConfigs
      .filter(config => !['yellowCards', 'redCards', 'fouls'].includes(config.key)) // Exclude negative stats from strengths
      .map(config => {
        const value = stats[config.key]
        let score = 0

        if (config.key === 'footyLabsScore') {
          score = value * 10 // 0-100 scale
        } else if (config.key.includes('Percentage')) {
          score = value // Already 0-100
        } else {
          // Normalize count stats
          const maxValues: { [key: string]: number } = {
            goals: 30, assists: 20, appearances: 40, minutesPlayed: 3000,
            ballRecovery: 200, keyPasses: 50, shotsOnTarget: 50, clearances: 100,
          }
          const max = maxValues[config.key] || 100
          score = (value / max) * 100
        }

        return { config, value, score }
      })
      .sort((a, b) => b.score - a.score)

    return {
      topStrengths: scoredStats.slice(0, 3),
      areasToImprove: scoredStats.slice(-3).reverse()
    }
  }, [stats])

  if (!player) return null

  const formatMarketValue = (value: number | null) => {
    if (!value) return 'N/A'
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}k`
    return `€${value}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Player Performance Stats</DialogTitle>
        </DialogHeader>

        {/* Player Header */}
        <div className="flex items-start gap-4 pb-4">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
            {player.picture_url ? (
              <Image
                src={player.picture_url}
                alt={player.player_name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold">
                {player.player_name.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold truncate">{player.player_name}</h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              {player.club_logo_url && (
                <Image src={player.club_logo_url} alt={player.club_name || ''} width={16} height={16} />
              )}
              <span className="truncate">{player.club_name}</span>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {player.position && (
                <Badge variant="secondary">{player.position}</Badge>
              )}
              {player.age && (
                <Badge variant="outline">{player.age} yrs</Badge>
              )}
              {player.market_value_eur && (
                <Badge variant="outline" className="text-green-600">
                  {formatMarketValue(player.market_value_eur)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {!stats ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No detailed stats available for this player.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Stats are sourced from SofaScore and may not be available for all players.
            </p>
          </div>
        ) : (
          <>
            {/* FootyLabs Score Hero */}
            <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">FootyLabs Score</p>
                  <p className="text-4xl font-bold text-primary">
                    {stats.footyLabsScore.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Season Stats</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.appearances} apps · {stats.minutesPlayed} mins
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="text-center p-3 bg-secondary/50 rounded-lg">
                <p className="text-2xl font-bold">{stats.goals}</p>
                <p className="text-xs text-muted-foreground">Goals</p>
              </div>
              <div className="text-center p-3 bg-secondary/50 rounded-lg">
                <p className="text-2xl font-bold">{stats.assists}</p>
                <p className="text-xs text-muted-foreground">Assists</p>
              </div>
              <div className="text-center p-3 bg-secondary/50 rounded-lg">
                <p className="text-2xl font-bold">{stats.appearances}</p>
                <p className="text-xs text-muted-foreground">Matches</p>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Top 3 Strengths */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUpIcon className="w-4 h-4 text-green-500" />
                <span className="text-sm font-semibold text-green-500">Top 3 Strengths</span>
              </div>
              <div className="space-y-3">
                {topStrengths.map(({ config, value }) => (
                  <StatBar key={config.key} config={config} value={value} />
                ))}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Areas to Improve */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingDownIcon className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold text-orange-500">Areas to Improve</span>
              </div>
              <div className="space-y-3">
                {areasToImprove.map(({ config, value }) => (
                  <StatBar key={config.key} config={config} value={value} />
                ))}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Discipline Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold">Discipline</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                  <span className="text-sm">Yellow Cards</span>
                  <Badge variant={stats.yellowCards <= 3 ? "secondary" : "destructive"}>
                    {stats.yellowCards}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                  <span className="text-sm">Red Cards</span>
                  <Badge variant={stats.redCards === 0 ? "secondary" : "destructive"}>
                    {stats.redCards}
                  </Badge>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
