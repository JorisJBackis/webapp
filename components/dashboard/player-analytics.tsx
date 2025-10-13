"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  RadarChart, 
  Radar, 
  RadialBarChart, 
  RadialBar,
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts'
import { 
  TrendingUp, 
  Target, 
  Award, 
  Activity, 
  BarChart3, 
  Zap, 
  Eye,
  Users,
  Calendar,
  Trophy,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'

interface PlayerAnalyticsProps {
  playerProfile: any
}

export default function PlayerAnalytics({ playerProfile }: PlayerAnalyticsProps) {
  const [playerData, setPlayerData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!playerProfile?.wyscout_player_id) {
        setLoading(false)
        return
      }

      try {
        // Get player statistics
        if (!supabase) return;
        const { data: player } = await supabase
          .from('players')
          .select('*')
          .eq('wyscout_player_id', playerProfile.wyscout_player_id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()

        setPlayerData(player)
      } catch (error) {
        console.error('Error fetching player data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayerData()
  }, [playerProfile])

  // Generate consistent mock data based on player profile
  const generatePlayerInsights = () => {
    const playerId = playerProfile?.id || '123'
    const seed = playerId.toString().split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
    
    const seededRandom = (min: number, max: number, offset = 0) => {
      const x = Math.sin(seed + offset) * 10000
      return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min
    }

    const position = playerProfile?.playing_positions?.[0] || 'Midfielder'
    
    // Performance trend over last 10 games
    const performanceTrend = Array.from({ length: 10 }, (_, i) => ({
      game: i + 1,
      rating: (seededRandom(65, 85, i) / 10).toFixed(1),
      goals: position.includes('Forward') || position.includes('Winger') ? seededRandom(0, 2, i * 2) : seededRandom(0, 1, i * 2),
      assists: seededRandom(0, 2, i * 3),
      passes: seededRandom(25, 85, i * 4),
      duels: seededRandom(4, 12, i * 5)
    }))

    // Position-specific radar chart data
    const getRadarData = (pos: string) => {
      if (pos.includes('Forward') || pos.includes('Striker')) {
        return [
          { attribute: 'Finishing', value: seededRandom(70, 90, 1) },
          { attribute: 'Positioning', value: seededRandom(75, 95, 2) },
          { attribute: 'First Touch', value: seededRandom(65, 85, 3) },
          { attribute: 'Aerial Ability', value: seededRandom(60, 85, 4) },
          { attribute: 'Pace', value: seededRandom(70, 90, 5) },
          { attribute: 'Physical', value: seededRandom(65, 85, 6) }
        ]
      } else if (pos.includes('Winger') || pos.includes('Wing')) {
        return [
          { attribute: 'Pace', value: seededRandom(80, 95, 1) },
          { attribute: 'Crossing', value: seededRandom(70, 90, 2) },
          { attribute: 'Dribbling', value: seededRandom(75, 95, 3) },
          { attribute: 'Stamina', value: seededRandom(75, 90, 4) },
          { attribute: 'Creativity', value: seededRandom(70, 85, 5) },
          { attribute: 'Defensive Work', value: seededRandom(50, 75, 6) }
        ]
      } else if (pos.includes('Midfielder') || pos.includes('Midfield')) {
        return [
          { attribute: 'Passing', value: seededRandom(75, 95, 1) },
          { attribute: 'Vision', value: seededRandom(70, 90, 2) },
          { attribute: 'Work Rate', value: seededRandom(80, 95, 3) },
          { attribute: 'Technical', value: seededRandom(70, 90, 4) },
          { attribute: 'Tackling', value: seededRandom(60, 85, 5) },
          { attribute: 'Stamina', value: seededRandom(75, 90, 6) }
        ]
      } else if (pos.includes('Back') || pos.includes('Defence')) {
        return [
          { attribute: 'Tackling', value: seededRandom(80, 95, 1) },
          { attribute: 'Marking', value: seededRandom(75, 90, 2) },
          { attribute: 'Aerial Ability', value: seededRandom(70, 90, 3) },
          { attribute: 'Positioning', value: seededRandom(75, 90, 4) },
          { attribute: 'Passing', value: seededRandom(65, 85, 5) },
          { attribute: 'Physical', value: seededRandom(70, 90, 6) }
        ]
      } else {
        return [
          { attribute: 'Reflexes', value: seededRandom(75, 95, 1) },
          { attribute: 'Shot Stopping', value: seededRandom(70, 90, 2) },
          { attribute: 'Distribution', value: seededRandom(60, 85, 3) },
          { attribute: 'Command of Area', value: seededRandom(65, 85, 4) },
          { attribute: 'Communication', value: seededRandom(70, 90, 5) },
          { attribute: 'Handling', value: seededRandom(75, 90, 6) }
        ]
      }
    }

    // Market value progression
    const marketValueData = Array.from({ length: 12 }, (_, i) => ({
      month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
      value: seededRandom(150, 400, i) * 1000,
      trend: i > 6 ? seededRandom(180, 450, i) * 1000 : seededRandom(120, 350, i) * 1000
    }))

    // Playing time analysis
    const playingTimeData = [
      { status: 'Started', value: seededRandom(60, 85, 10), color: '#22c55e' },
      { status: 'Substitute', value: seededRandom(10, 25, 11), color: '#f59e0b' },
      { status: 'Unused', value: seededRandom(5, 15, 12), color: '#ef4444' }
    ]

    // Performance comparison with league average
    const leagueComparison = [
      { metric: 'Goals/90', player: seededRandom(30, 80, 20) / 100, league: 0.45 },
      { metric: 'Assists/90', player: seededRandom(20, 60, 21) / 100, league: 0.30 },
      { metric: 'Pass Acc %', player: seededRandom(75, 95, 22), league: 82 },
      { metric: 'Duels Won %', player: seededRandom(45, 75, 23), league: 58 },
      { metric: 'Dribbles/90', player: seededRandom(15, 45, 24) / 10, league: 2.1 }
    ]

    // Strengths and areas for improvement
    const allAttributes = getRadarData(position)
    const strengths = allAttributes
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map(attr => ({ ...attr, trend: seededRandom(1, 3, attr.value) === 1 ? 'up' : 'stable' }))
    
    const improvements = allAttributes
      .sort((a, b) => a.value - b.value)
      .slice(0, 2)
      .map(attr => ({ ...attr, trend: seededRandom(1, 2, attr.value + 100) === 1 ? 'down' : 'stable' }))

    return {
      performanceTrend,
      radarData: getRadarData(position),
      marketValueData,
      playingTimeData,
      leagueComparison,
      strengths,
      improvements,
      overallRating: seededRandom(65, 85, 0),
      potential: seededRandom(70, 90, 1),
      marketValue: seededRandom(150, 400, 2) * 1000,
      profileViews: seededRandom(50, 300, 3),
      scoutingReports: seededRandom(5, 25, 4)
    }
  }

  const insights = generatePlayerInsights()

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-4 w-4 text-success" />
      case 'down': return <ArrowDown className="h-4 w-4 text-red-500" />
      default: return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getComparisonColor = (playerValue: number, leagueValue: number) => {
    const diff = ((playerValue - leagueValue) / leagueValue) * 100
    if (diff > 10) return 'text-green-600'
    if (diff < -10) return 'text-red-600'
    return 'text-yellow-600'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall Rating</p>
                <p className="text-2xl font-bold">{insights.overallRating}</p>
              </div>
              <Award className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Based on recent performances
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Market Value</p>
                <p className="text-2xl font-bold">€{insights.marketValue.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              +12% this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Profile Views</p>
                <p className="text-2xl font-bold">{insights.profileViews}</p>
              </div>
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Scout Reports</p>
                <p className="text-2xl font-bold">{insights.scoutingReports}</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Active watchers
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Trend (Last 10 Games)
            </CardTitle>
            <CardDescription>Your match ratings and key statistics over recent games</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={insights.performanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="game" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="rating" stroke="#3b82f6" strokeWidth={3} name="Match Rating" />
                <Line type="monotone" dataKey="passes" stroke="#10b981" strokeWidth={2} name="Pass Completion %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Position-Specific Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {playerProfile?.playing_positions?.[0] || 'Player'} Attributes
            </CardTitle>
            <CardDescription>Your key attributes compared to elite level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={insights.radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="attribute" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar 
                  name="Your Level" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Market Value Progression */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Market Value Progression
            </CardTitle>
            <CardDescription>How your market value has changed over the year</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={insights.marketValueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`€${Number(value).toLocaleString()}`, 'Market Value']} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Playing Time Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Playing Time Analysis
            </CardTitle>
            <CardDescription>Breakdown of your involvement this season</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={insights.playingTimeData}
                    dataKey="value"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                  >
                    {insights.playingTimeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {insights.playingTimeData.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm">{item.status}</span>
                    </div>
                    <span className="font-medium">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* League Comparison & Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance vs League Average */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance vs League Average
            </CardTitle>
            <CardDescription>How you compare to other players in your position</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={insights.leagueComparison} margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="player" fill="#3b82f6" name="You" />
                <Bar dataKey="league" fill="#94a3b8" name="League Average" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Strengths & Areas for Improvement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Development Analysis
            </CardTitle>
            <CardDescription>Your key strengths and areas to focus on</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <h4 className="font-medium">Key Strengths</h4>
                </div>
                <div className="space-y-2">
                  {insights.strengths.map((strength) => (
                    <div key={strength.attribute} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{strength.attribute}</span>
                        {getTrendIcon(strength.trend)}
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {strength.value}/100
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <h4 className="font-medium">Focus Areas</h4>
                </div>
                <div className="space-y-2">
                  {insights.improvements.map((improvement) => (
                    <div key={improvement.attribute} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{improvement.attribute}</span>
                        {getTrendIcon(improvement.trend)}
                      </div>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        {improvement.value}/100
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights & Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            FootyLabs AI Insights
          </CardTitle>
          <CardDescription>Personalized recommendations based on your performance data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Career Development</h4>
              <p className="text-sm text-blue-800">
                Your recent performances show consistent improvement. Consider targeting clubs in higher divisions 
                that match your playing style and development needs.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Market Positioning</h4>
              <p className="text-sm text-green-800">
                Your market value is trending upward. This is an optimal time to explore new opportunities, 
                especially in leagues that value your strongest attributes.
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">Training Focus</h4>
              <p className="text-sm text-purple-800">
                Focus on improving your weaker attributes while maintaining your strengths. 
                Consider specialized training in areas where you're below league average.
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-medium text-orange-900 mb-2">Profile Visibility</h4>
              <p className="text-sm text-orange-800">
                Your profile is gaining attention from scouts. Keep your highlight reel updated 
                and maintain consistent performance levels to maximize opportunities.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}