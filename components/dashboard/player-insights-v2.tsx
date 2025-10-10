"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts"
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PlayerInsightsV2Props {
  playerProfile: any
  category: 'performance' | 'market' | 'development' | 'comparison'
}

const StatCard = ({ title, value, subtitle, trend }: { 
  title: string, 
  value: string | number, 
  subtitle: string, 
  trend?: 'up' | 'down' | 'stable' 
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-success" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <Card className="border-0 shadow-xs text-center">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold mb-1">{value}</div>
        <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          {trend && getTrendIcon()}
          {subtitle}
        </div>
      </CardContent>
    </Card>
  )
}

export default function PlayerInsightsV2({ playerProfile, category }: PlayerInsightsV2Props) {
  const [loading, setLoading] = useState(false)
  const [playerData, setPlayerData] = useState<any>(null)
  const supabase = createClient()

  // Generate consistent mock data based on player profile
  const generateInsightsData = () => {
    const playerId = playerProfile?.id || '123'
    const seed = playerId.toString().split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
    
    const seededRandom = (min: number, max: number, offset = 0) => {
      const x = Math.sin(seed + offset) * 10000
      return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min
    }

    const position = playerProfile?.playing_positions?.[0] || 'Midfielder'

    // Performance overview data (like club's StatCard style)
    const performanceStats = {
      rating: (seededRandom(65, 85, 1) / 10).toFixed(1),
      goals: seededRandom(2, 15, 2),
      assists: seededRandom(1, 8, 3),
      appearances: seededRandom(18, 32, 4),
      passAccuracy: seededRandom(75, 95, 5),
      duelsWon: seededRandom(45, 75, 6)
    }

    // Market value progression (like club charts)
    const marketData = Array.from({ length: 12 }, (_, i) => ({
      month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
      value: seededRandom(150, 400, i) + (i * seededRandom(5, 20, i * 2)),
      inquiries: seededRandom(2, 8, i * 3)
    }))

    // Last 10 games performance data
    const gamePerformance = Array.from({ length: 10 }, (_, i) => ({
      game: `Game ${i + 1}`,
      rating: seededRandom(60, 90, i) / 10,
      goals: position.includes('Forward') ? seededRandom(0, 2, i * 2) : seededRandom(0, 1, i * 2),
      assists: seededRandom(0, 2, i * 3),
      duelsWon: seededRandom(3, 12, i * 4),
      passAccuracy: seededRandom(70, 95, i * 5)
    }))

    // Position comparison data
    const positionMetrics = [
      { metric: 'Goals/Game', player: performanceStats.goals / performanceStats.appearances, league: 0.4, category: position },
      { metric: 'Pass Accuracy', player: performanceStats.passAccuracy, league: 82, category: position },
      { metric: 'Duels Won %', player: performanceStats.duelsWon, league: 58, category: position },
      { metric: 'Key Passes/Game', player: seededRandom(15, 35, 10) / 10, league: 1.8, category: position }
    ]

    // Development areas
    const developmentData = [
      { area: 'Technical Skills', current: seededRandom(70, 85, 20), potential: seededRandom(80, 95, 21) },
      { area: 'Physical Attributes', current: seededRandom(65, 80, 22), potential: seededRandom(75, 90, 23) },
      { area: 'Tactical Awareness', current: seededRandom(60, 85, 24), potential: seededRandom(75, 95, 25) },
      { area: 'Mental Strength', current: seededRandom(70, 90, 26), potential: seededRandom(80, 95, 27) }
    ]

    // Playing style analysis
    const playingStyleData = [
      { style: 'Attacking Play', value: seededRandom(60, 90, 30) },
      { style: 'Defensive Work', value: seededRandom(40, 80, 31) },
      { style: 'Playmaking', value: seededRandom(50, 85, 32) },
      { style: 'Physical Duels', value: seededRandom(45, 85, 33) },
      { style: 'Set Pieces', value: seededRandom(35, 75, 34) },
      { style: 'Aerial Ability', value: seededRandom(40, 85, 35) }
    ]

    // Position heat map data
    const positionHeatData = Array.from({ length: 8 }, (_, i) => ({
      zone: `Zone ${i + 1}`,
      touches: seededRandom(20, 80, i + 40),
      effectiveness: seededRandom(60, 95, i + 50)
    }))

    // Match outcomes correlation
    const outcomeData = [
      { result: 'Wins', count: seededRandom(8, 15, 60), yourRating: seededRandom(70, 85, 61) },
      { result: 'Draws', count: seededRandom(3, 8, 62), yourRating: seededRandom(60, 75, 63) },
      { result: 'Losses', count: seededRandom(2, 6, 64), yourRating: seededRandom(55, 70, 65) }
    ]

    // Injury and fitness tracking
    const fitnessData = Array.from({ length: 12 }, (_, i) => ({
      month: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i],
      fitness: seededRandom(80, 98, i + 70),
      minutes: seededRandom(200, 450, i + 80),
      injuries: seededRandom(0, 2, i + 90)
    }))

    // Shot map data
    const shotMapData = Array.from({ length: 6 }, (_, i) => ({
      zone: `Zone ${i + 1}`,
      attempts: seededRandom(2, 12, i + 100),
      goals: seededRandom(0, 4, i + 110),
      accuracy: seededRandom(40, 80, i + 120)
    }))

    // Pass type breakdown
    const passTypeData = [
      { type: 'Short Passes', count: seededRandom(200, 400, 130), accuracy: seededRandom(85, 95, 131) },
      { type: 'Long Passes', count: seededRandom(20, 60, 132), accuracy: seededRandom(60, 85, 133) },
      { type: 'Through Balls', count: seededRandom(5, 20, 134), accuracy: seededRandom(40, 70, 135) },
      { type: 'Crosses', count: seededRandom(10, 40, 136), accuracy: seededRandom(25, 60, 137) }
    ]

    return {
      performanceStats,
      marketData,
      gamePerformance,
      positionMetrics,
      developmentData,
      playingStyleData,
      positionHeatData,
      outcomeData,
      fitnessData,
      shotMapData,
      passTypeData,
      position
    }
  }

  const data = generateInsightsData()

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      {/* Performance Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard title="Season Rating" value={data.performanceStats.rating} subtitle="Average" trend="up" />
        <StatCard title="Goals" value={data.performanceStats.goals} subtitle={`${data.performanceStats.appearances} apps`} trend="stable" />
        <StatCard title="Assists" value={data.performanceStats.assists} subtitle="This season" trend="up" />
        <StatCard title="Pass Accuracy" value={`${data.performanceStats.passAccuracy}%`} subtitle="League: 82%" trend={data.performanceStats.passAccuracy > 82 ? "up" : "down"} />
        <StatCard title="Duels Won" value={`${data.performanceStats.duelsWon}%`} subtitle="Success rate" trend="stable" />
        <StatCard title="Minutes" value={data.fitnessData[11]?.minutes} subtitle="Last month" trend="up" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend */}
        <div className="bg-backround rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-primary">Recent Performance Trend</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.gamePerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="game" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="rating" stroke="#3b82f6" strokeWidth={2} name="Rating" />
              <Line type="monotone" dataKey="passAccuracy" stroke="#10b981" strokeWidth={2} name="Pass Acc %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Playing Style Radar */}
        <div className="bg-backround rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-primary">Playing Style Profile</h2>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={data.playingStyleData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="style" />
              <PolarRadiusAxis domain={[0, 100]} />
              <Radar name="Strength" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Position Heat Map */}
        <div className="bg-backround rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-primary">Position Heat Map</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.positionHeatData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="zone" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="touches" fill="#f59e0b" name="Touches" />
              <Bar dataKey="effectiveness" fill="#ef4444" name="Effectiveness %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Match Outcomes */}
        <div className="bg-backround rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-primary">Performance by Result</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.outcomeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="result" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#06b6d4" name="Games" />
              <Bar dataKey="yourRating" fill="#84cc16" name="Avg Rating" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )

  const renderMarketTab = () => (
    <div className="space-y-6">
      {/* Market Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard title="Market Value" value={`€${data.marketData[11]?.value}K`} subtitle="Current" trend="up" />
        <StatCard title="Monthly Inquiries" value={data.marketData[11]?.inquiries} subtitle="From clubs" trend="stable" />
        <StatCard title="Profile Views" value="127" subtitle="Last 30 days" trend="up" />
        <StatCard title="League Rank" value="23rd" subtitle={`${data.position}s`} trend="up" />
        <StatCard title="Age Group Rank" value="8th" subtitle="U25 bracket" trend="stable" />
        <StatCard title="Contract Value" value="€2.1M" subtitle="Remaining" trend="down" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Value Progression */}
        <div className="bg-backround rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-primary">Market Value Progression</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.marketData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`€${value}K`]} />
              <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.3} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Scout Interest */}
        <div className="bg-backround rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-primary">Scout Interest Over Time</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.marketData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="inquiries" stroke="#f59e0b" strokeWidth={2} name="Inquiries" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Shot Conversion Analysis */}
        <div className="bg-backround rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-primary">Shot Analysis by Zone</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.shotMapData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="zone" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="attempts" fill="#06b6d4" name="Attempts" />
              <Bar dataKey="goals" fill="#22c55e" name="Goals" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pass Type Analysis */}
        <div className="bg-backround rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-primary">Passing Breakdown</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.passTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8b5cf6" name="Volume" />
              <Bar dataKey="accuracy" fill="#f97316" name="Accuracy %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )

  const renderDevelopmentTab = () => (
    <div className="space-y-6">
      {/* Development Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard title="Development Score" value="78" subtitle="Out of 100" trend="up" />
        <StatCard title="Training Hours" value="847" subtitle="This season" trend="stable" />
        <StatCard title="Skill Progression" value="+12%" subtitle="Last 6 months" trend="up" />
        <StatCard title="Weak Foot" value="67%" subtitle="Usage rate" trend="up" />
        <StatCard title="Fitness Level" value={`${data.fitnessData[11]?.fitness}%`} subtitle="Current" trend="stable" />
        <StatCard title="Injury Days" value="3" subtitle="This season" trend="down" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Development Potential */}
        <div className="bg-backround rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-primary">Development Potential</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.developmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="area" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="current" fill="#3b82f6" name="Current" />
              <Bar dataKey="potential" fill="#10b981" name="Potential" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fitness & Availability */}
        <div className="bg-backround rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-primary">Fitness & Availability</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.fitnessData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="fitness" stroke="#22c55e" strokeWidth={2} name="Fitness %" />
              <Line type="monotone" dataKey="minutes" stroke="#3b82f6" strokeWidth={2} name="Minutes Played" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Training Load Distribution */}
        <div className="bg-backround rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-primary">Training Focus Areas</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Technical', value: 35, fill: '#3b82f6' },
                  { name: 'Tactical', value: 25, fill: '#10b981' },
                  { name: 'Physical', value: 30, fill: '#f59e0b' },
                  { name: 'Mental', value: 10, fill: '#8b5cf6' }
                ]}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
              />
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Skill Progression Over Time */}
        <div className="bg-backround rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-primary">6-Month Skill Progression</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.marketData.slice(6)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )

  const renderComparisonTab = () => (
    <div className="space-y-6">
      {/* Comparison Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard title="League Position" value="23rd" subtitle={`${data.position}s`} trend="up" />
        <StatCard title="Percentile Rank" value="67th" subtitle="In position" trend="stable" />
        <StatCard title="Age Group Rank" value="12th" subtitle="U25 bracket" trend="up" />
        <StatCard title="Similar Players" value="18" subtitle="In database" trend="stable" />
        <StatCard title="Transfer Interest" value="Medium" subtitle="Market level" trend="up" />
        <StatCard title="FootyLabs Score" value="7.4" subtitle="AI rating" trend="up" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Position Comparison */}
        <div className="bg-backround rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-primary">vs League Average ({data.position})</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.positionMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="player" fill="#3b82f6" name="You" />
              <Bar dataKey="league" fill="#94a3b8" name="League Avg" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Age Group Comparison */}
        <div className="bg-backround rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-primary">Age Group Performance</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={[
              { metric: 'Goals', you: data.performanceStats.goals, peers: 8 },
              { metric: 'Assists', you: data.performanceStats.assists, peers: 5 },
              { metric: 'Rating', you: parseFloat(data.performanceStats.rating), peers: 6.8 },
              { metric: 'Minutes', you: data.performanceStats.appearances * 75, peers: 1800 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="you" fill="#22c55e" name="You" />
              <Bar dataKey="peers" fill="#f59e0b" name="Age Group Avg" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Playing Style Comparison */}
        <div className="bg-backround rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-primary">Playing Style vs Top Players</h2>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={data.playingStyleData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="style" />
              <PolarRadiusAxis domain={[0, 100]} />
              <Radar name="You" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Competitive Analysis */}
        <div className="bg-backround rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-primary">Competitive Benchmarking</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={[
              { category: 'League Top 10', score: 85 },
              { category: 'Age Peers', score: 78 },
              { category: 'Position Avg', score: 72 },
              { category: 'Your Level', score: 74 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="score" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  switch (category) {
    case "performance":
      return renderPerformanceTab()
    case "market":
      return renderMarketTab()
    case "development":
      return renderDevelopmentTab()
    case "comparison":
      return renderComparisonTab()
    default:
      return renderPerformanceTab()
  }
}