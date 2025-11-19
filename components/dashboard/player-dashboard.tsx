"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TrendingUp,
  Calendar,
  Target,
  Award,
  BarChart3,
  MapPin,
  AlertCircle,
  ExternalLink,
  TrendingUpIcon,
  TrendingDownIcon,
  Activity,
  Zap,
  Shield,
  Crosshair,
  Users
} from "lucide-react"

type PlayerDashboardData = {
  user: any
  profile: any
  playerProfile: any
  playerStats: any
  dataRequest?: any
}

interface PlayerStats {
  rating: number
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
  accurateCrossesPercentage: number
  yellowCards: number
  redCards: number
  fouls: number
  wasFouled: number
}

interface PlayerData {
  id: number
  name: string
  age: number | null
  height: number | null
  foot: string | null
  picture_url: string | null
  position: string
  club: string
  club_logo: string | null
  transfermarkt_url: string | null
  club_transfermarkt_url: string | null
  market_value_eur: number | null
  league: string
  season: string
  stats: PlayerStats
  percentiles: { [key: string]: number }
  ranks: { [key: string]: number }
  totalPlayers: number
}

const positionNames: { [key: string]: string } = {
  'G': 'Goalkeeper',
  'D': 'Defender',
  'M': 'Midfielder',
  'F': 'Forward'
}

function getPercentileColor(percentile: number): string {
  if (percentile >= 80) return 'text-green-600 dark:text-green-500'
  if (percentile >= 60) return 'text-blue-600 dark:text-blue-500'
  if (percentile >= 40) return 'text-yellow-600 dark:text-yellow-500'
  if (percentile >= 20) return 'text-orange-600 dark:text-orange-500'
  return 'text-red-600 dark:text-red-500'
}

function getPercentileBgColor(percentile: number): string {
  if (percentile >= 80) return 'bg-green-500'
  if (percentile >= 60) return 'bg-blue-500'
  if (percentile >= 40) return 'bg-yellow-500'
  if (percentile >= 20) return 'bg-orange-500'
  return 'bg-red-500'
}

export default function PlayerDashboard({ data }: { data: PlayerDashboardData }) {
  const [playerData, setPlayerData] = useState<PlayerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchPlayerData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Get current user's transfermarkt player ID
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data: playerProfile } = await supabase
          .from('player_profiles')
          .select('transfermarkt_player_id')
          .eq('id', user.id)
          .single()

        if (!playerProfile?.transfermarkt_player_id) {
          throw new Error('Player profile not linked to Transfermarkt data')
        }

        // Fetch player data with stats
        const { data: tmPlayer, error: tmError } = await supabase
          .from('players_transfermarkt')
          .select(`
            id,
            name,
            age,
            height,
            foot,
            picture_url,
            main_position,
            sf_data,
            sofascore_id,
            club_id,
            transfermarkt_url,
            market_value_eur,
            clubs_transfermarkt (
              id,
              name,
              logo_url,
              league_id,
              transfermarkt_url,
              leagues_transfermarkt (
                name
              )
            ),
            sofascore_players_staging (
              position
            )
          `)
          .eq('id', playerProfile.transfermarkt_player_id)
          .single()

        if (tmError) throw tmError
        if (!tmPlayer) throw new Error('Player not found')

        const club = tmPlayer.clubs_transfermarkt as any
        const league = club?.leagues_transfermarkt as any
        const sfPosition = (tmPlayer.sofascore_players_staging as any)?.position

        // Map league ID to tournament name
        const leagueMap: { [key: string]: string } = {
          'LET1': 'Virsliga',
          'FI1': 'Veikkausliiga'
        }

        const tournamentName = leagueMap[club?.league_id]

        if (!tournamentName || !tmPlayer.sf_data) {
          throw new Error('No performance data available for your league yet')
        }

        // Extract season stats from sf_data
        const stats = extractSeasonStats(tmPlayer.sf_data, tournamentName)
        if (!stats) {
          throw new Error('No season statistics found')
        }

        // Fetch percentiles for context
        const response = await fetch('/api/player-stats/percentiles')
        const percentilesData = await response.json()

        // Find this player in the percentiles data
        const playerWithPercentiles = percentilesData.players?.find(
          (p: any) => p.id === tmPlayer.id
        )

        console.log('[PlayerDashboard] Player data:', {
          name: tmPlayer.name,
          picture_url: tmPlayer.picture_url,
          club_logo: club?.logo_url
        })

        setPlayerData({
          id: tmPlayer.id,
          name: tmPlayer.name,
          age: tmPlayer.age,
          height: tmPlayer.height,
          foot: tmPlayer.foot,
          picture_url: tmPlayer.picture_url,
          position: sfPosition || tmPlayer.main_position,
          club: club?.name || 'Unknown Club',
          club_logo: club?.logo_url,
          transfermarkt_url: tmPlayer.transfermarkt_url,
          club_transfermarkt_url: club?.transfermarkt_url,
          market_value_eur: tmPlayer.market_value_eur,
          league: league?.name || tournamentName,
          season: getLatestSeasonId(tmPlayer.sf_data, tournamentName),
          stats: {
            rating: stats.rating || 0,
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
            accurateCrossesPercentage: stats.accurateCrossesPercentage || 0,
            yellowCards: stats.yellowCards || 0,
            redCards: stats.redCards || 0,
            fouls: stats.fouls || 0,
            wasFouled: stats.wasFouled || 0,
          },
          percentiles: playerWithPercentiles?.percentiles || {},
          ranks: playerWithPercentiles?.ranks || {},
          totalPlayers: playerWithPercentiles?.totalPlayers || 0
        })

      } catch (err) {
        console.error('[PlayerDashboard] Error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchPlayerData()
  }, [])

  // Helper function to extract season stats
  function extractSeasonStats(sfData: any, tournamentName: string): any {
    if (!sfData) return null

    for (const playerId in sfData) {
      const playerData = sfData[playerId]
      if (playerData.tournament_name === tournamentName && playerData.seasons) {
        const seasonIds = Object.keys(playerData.seasons)
        if (seasonIds.length === 0) continue

        const latestSeasonId = seasonIds.sort((a, b) => parseInt(b) - parseInt(a))[0]
        return playerData.seasons[latestSeasonId].statistics
      }
    }
    return null
  }

  // Helper to get season ID
  function getLatestSeasonId(sfData: any, tournamentName: string): string {
    if (!sfData) return ''

    for (const playerId in sfData) {
      const playerData = sfData[playerId]
      if (playerData.tournament_name === tournamentName && playerData.seasons) {
        const seasonIds = Object.keys(playerData.seasons)
        if (seasonIds.length === 0) continue
        return seasonIds.sort((a, b) => parseInt(b) - parseInt(a))[0]
      }
    }
    return ''
  }

  // Get top strengths and weaknesses
  const getTopStats = (percentiles: { [key: string]: number }) => {
    const stats = Object.entries(percentiles)
      .filter(([key]) => key !== 'totalPlayers')
      .sort(([, a], [, b]) => b - a)

    return {
      strengths: stats.slice(0, 5),
      weaknesses: stats.slice(-5).reverse()
    }
  }

  const statLabels: { [key: string]: string } = {
    rating: 'FootyLabs Score',
    goals: 'Goals',
    assists: 'Assists',
    appearances: 'Appearances',
    minutesPlayed: 'Minutes',
    accuratePassesPercentage: 'Pass Accuracy',
    totalDuelsWonPercentage: 'Duels Won',
    successfulDribblesPercentage: 'Dribbles',
    aerialDuelsWonPercentage: 'Aerial Duels',
    ballRecovery: 'Ball Recoveries',
    keyPasses: 'Key Passes',
    shotsOnTarget: 'Shots on Target',
    clearances: 'Clearances',
    accurateCrossesPercentage: 'Crossing',
    goalConversionPercentage: 'Shot Conversion'
  }

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Loading your performance data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (data.dataRequest) {
    return (
      <div className="container py-8">
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Your data is being processed
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                  FootyLabs has been notified of your registration and will add your statistics within 5 working days.
                  You registered on {new Date(data.dataRequest.requested_at).toLocaleDateString()}.
                </p>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  In the meantime, you can:
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 mt-1 space-y-1">
                  <li>• Complete your profile information</li>
                  <li>• Browse club opportunities</li>
                  <li>• Set up your preferences</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !playerData) {
    return (
      <div className="container py-8">
        <Card className="border-red-500">
          <CardContent className="p-6">
            <p className="text-red-500">Error: {error || 'Failed to load player data'}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Make sure you have completed your player onboarding and your data has been processed.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const topStats = getTopStats(playerData.percentiles)

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Hero Section */}
      <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Player Photo */}
            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0 shadow-xl ring-4 ring-background">
              {playerData.picture_url ? (
                <img
                  src={playerData.picture_url}
                  alt={playerData.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl md:text-6xl font-bold text-primary">
                  {playerData.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Player Info */}
            <div className="flex-1 space-y-4">
              <div>
                {playerData.transfermarkt_url ? (
                  <a
                    href={playerData.transfermarkt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline inline-flex items-center gap-2 group"
                  >
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                      {playerData.name}
                    </h1>
                    <ExternalLink className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  </a>
                ) : (
                  <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                    {playerData.name}
                  </h1>
                )}

                {/* Club */}
                <div className="flex items-center gap-2 mt-2">
                  {playerData.club_logo && (
                    <img src={playerData.club_logo} alt={playerData.club} className="w-5 h-5 object-contain" />
                  )}
                  {playerData.club_transfermarkt_url ? (
                    <a
                      href={playerData.club_transfermarkt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg text-muted-foreground hover:text-primary hover:underline"
                    >
                      {playerData.club}
                    </a>
                  ) : (
                    <p className="text-lg text-muted-foreground">{playerData.club}</p>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {positionNames[playerData.position] || playerData.position}
                </Badge>
                {playerData.age && (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {playerData.age} years old
                  </Badge>
                )}
                {playerData.height && (
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {playerData.height} cm
                  </Badge>
                )}
                {playerData.foot && (
                  <Badge variant="outline" className="text-sm px-3 py-1 capitalize">
                    {playerData.foot} footed
                  </Badge>
                )}
                {playerData.market_value_eur !== null && playerData.market_value_eur > 0 && (
                  <Badge className="text-sm px-3 py-1 bg-green-600 hover:bg-green-700">
                    €{(playerData.market_value_eur / 1000).toFixed(0)}k
                  </Badge>
                )}
              </div>

              {/* Season & League Info */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Season {playerData.season}</span>
                <Separator orientation="vertical" className="h-4" />
                <MapPin className="w-4 h-4" />
                <span>{playerData.league}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* FootyLabs Score */}
        <Card className="border-l-4 border-l-primary shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">FootyLabs Score</CardTitle>
            <Award className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {playerData.stats.rating.toFixed(2)}
            </div>
            {playerData.percentiles.rating !== undefined && (
              <div className="flex items-center gap-2 mt-2">
                <div className={`text-xs font-medium ${getPercentileColor(playerData.percentiles.rating)}`}>
                  {playerData.percentiles.rating}th percentile
                </div>
                <Badge variant="outline" className="text-xs">
                  #{playerData.ranks.rating}/{playerData.totalPlayers}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Goals</CardTitle>
            <Target className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {playerData.stats.goals}
            </div>
            {playerData.percentiles.goals !== undefined && (
              <div className="flex items-center gap-2 mt-2">
                <div className={`text-xs font-medium ${getPercentileColor(playerData.percentiles.goals)}`}>
                  {playerData.percentiles.goals}th percentile
                </div>
                <Badge variant="outline" className="text-xs">
                  #{playerData.ranks.goals}/{playerData.totalPlayers}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assists */}
        <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assists</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {playerData.stats.assists}
            </div>
            {playerData.percentiles.assists !== undefined && (
              <div className="flex items-center gap-2 mt-2">
                <div className={`text-xs font-medium ${getPercentileColor(playerData.percentiles.assists)}`}>
                  {playerData.percentiles.assists}th percentile
                </div>
                <Badge variant="outline" className="text-xs">
                  #{playerData.ranks.assists}/{playerData.totalPlayers}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appearances */}
        <Card className="border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appearances</CardTitle>
            <Activity className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {playerData.stats.appearances}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {playerData.stats.minutesPlayed.toLocaleString()} minutes played
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Stats Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attacking">Attacking</TabsTrigger>
          <TabsTrigger value="defending">Defending</TabsTrigger>
          <TabsTrigger value="discipline">Discipline</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Top Strengths */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUpIcon className="w-5 h-5 text-green-500" />
                  Top 5 Strengths
                </CardTitle>
                <CardDescription>Your best performing areas vs peers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {topStats.strengths.map(([key, percentile]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{statLabels[key] || key}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${getPercentileColor(percentile)}`}>
                          {percentile}th
                        </Badge>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getPercentileBgColor(percentile)} transition-all duration-500`}
                        style={{ width: `${percentile}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Areas to Improve */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDownIcon className="w-5 h-5 text-orange-500" />
                  Areas to Improve
                </CardTitle>
                <CardDescription>Focus areas for development</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {topStats.weaknesses.map(([key, percentile]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{statLabels[key] || key}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${getPercentileColor(percentile)}`}>
                          {percentile}th
                        </Badge>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getPercentileBgColor(percentile)} transition-all duration-500`}
                        style={{ width: `${percentile}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Attacking Tab */}
        <TabsContent value="attacking" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-green-600" />
                  Shooting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shots on Target</span>
                  <span className="font-bold">{playerData.stats.shotsOnTarget}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Shots</span>
                  <span className="font-bold">{playerData.stats.totalShots}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Conversion %</span>
                  <span className="font-bold">{playerData.stats.goalConversionPercentage.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  Creativity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Key Passes</span>
                  <span className="font-bold">{playerData.stats.keyPasses}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dribbles Success</span>
                  <span className="font-bold">{playerData.stats.successfulDribblesPercentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Crossing Accuracy</span>
                  <span className="font-bold">{playerData.stats.accurateCrossesPercentage.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  Passing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pass Accuracy</span>
                  <span className="font-bold">{playerData.stats.accuratePassesPercentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Key Passes</span>
                  <span className="font-bold">{playerData.stats.keyPasses}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Defending Tab */}
        <TabsContent value="defending" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Duels
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Duels Won</span>
                  <span className="font-bold">{playerData.stats.totalDuelsWonPercentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Aerial Duels Won</span>
                  <span className="font-bold">{playerData.stats.aerialDuelsWonPercentage.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-600" />
                  Recovery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ball Recoveries</span>
                  <span className="font-bold">{playerData.stats.ballRecovery}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Clearances</span>
                  <span className="font-bold">{playerData.stats.clearances}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Discipline Tab */}
        <TabsContent value="discipline" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Cards</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Yellow Cards</span>
                  <span className="font-bold text-yellow-600">{playerData.stats.yellowCards}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Red Cards</span>
                  <span className="font-bold text-red-600">{playerData.stats.redCards}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Fouls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fouls Committed</span>
                  <span className="font-bold">{playerData.stats.fouls}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Was Fouled</span>
                  <span className="font-bold">{playerData.stats.wasFouled}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <a href="/dashboard/player-comparison">
              <BarChart3 className="w-4 h-4 mr-2" />
              Compare with Peers
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
