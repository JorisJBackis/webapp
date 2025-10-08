"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TrendingUp,
  Eye,
  Calendar,
  Target,
  Award,
  BarChart3,
  Users,
  MapPin,
  Clock,
  Sparkles,
  Brain,
  Zap,
  AlertCircle,
  CheckCircle2,
  Share2,
  Link2
} from "lucide-react"
import PlayerDetailModal from "@/components/common/player-detail-modal"
import OpportunitiesBrowser from "./opportunities-browser"

type PlayerDashboardData = {
  user: any
  profile: any
  playerProfile: any
  playerStats: any
  wyscoutPlayer: any
  dataRequest?: any
}

export default function PlayerDashboard({ data }: { data: PlayerDashboardData }) {
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [profileViews, setProfileViews] = useState(0)
  const supabase = createClient()

  // Generate consistent mock data based on player ID
  const generateConsistentMockData = (playerId: string | number) => {
    const seed = playerId ? playerId.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 123
    
    // Use seed for consistent randomness
    const seededRandom = (min: number, max: number, offset = 0) => {
      const x = Math.sin(seed + offset) * 10000
      return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min
    }
    
    return {
      footylabsScore: data.wyscoutPlayer?.stats?.avg_percentile 
        ? (data.wyscoutPlayer.stats.avg_percentile * 10).toFixed(1) 
        : "7.2",
      marketValue: "€" + (seededRandom(200, 700, 1) * 1000).toLocaleString(),
      weeklyTrend: seededRandom(0, 1, 2) > 0 ? "up" : "down",
      trendPercentage: (seededRandom(2, 17, 3)).toFixed(1),
      strongSuits: ["Passing Accuracy", "Defensive Actions", "Aerial Duels"],
      improvementAreas: ["Shot Accuracy", "Key Passes", "Sprint Speed"],
      similarPlayers: ["M. Verratti", "J. Kimmich", "F. de Jong"],
      leagueRanking: seededRandom(10, 60, 4),
      positionRanking: seededRandom(5, 25, 5),
      profileViews: seededRandom(20, 170, 6)
    }
  }

  // Mock AI insights data for demo
  const playerId = data.wyscoutPlayer?.wyscout_player_id || data.user?.id || '123'
  const aiInsights = generateConsistentMockData(playerId)


  useEffect(() => {
    // Use consistent profile views from mock data
    setProfileViews(aiInsights.profileViews)
  }, [])

  const playerName = data.wyscoutPlayer?.name || data.playerProfile?.agent_name || "Player"
  const playerPosition = data.wyscoutPlayer?.position || data.playerProfile?.playing_positions?.[0] || "Player"
  
  return (
    <div className="container py-8">
      {/* Pending Data Request Alert */}
      {data.dataRequest && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">
                  Your data is being processed
                </h3>
                <p className="text-sm text-blue-800 mb-2">
                  FootyLabs has been notified of your registration and will add your statistics within 5 working days.
                  You registered on {new Date(data.dataRequest.requested_at).toLocaleDateString()}.
                </p>
                <p className="text-sm font-medium text-blue-900">
                  In the meantime, you can:
                </p>
                <ul className="text-sm text-blue-800 mt-1 space-y-1">
                  <li>• Use the marketplace to find club offers</li>
                  <li>• Complete your profile information</li>
                  <li>• Browse demo data to see how your profile will look</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demo Data Alert for Players Without Stats */}
      {!data.wyscoutPlayer && !data.dataRequest && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-1">
                  Demo Mode - Sample Data Displayed
                </h3>
                <p className="text-sm text-amber-800">
                  This is a demo of how your profile and stats will look once we have your data in our database.
                  For now, you can freely use the marketplace/opportunities window to find club offers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-footylabs-newblue">
              {playerName}'s Dashboard
            </h1>
            <p className="text-muted-foreground">
              {playerPosition} • {data.wyscoutPlayer?.stats?.["Team"] || "Professional Player"}
            </p>
          </div>
          <Button
            onClick={() => setShowStatsModal(true)}
            className="bg-[#3144C3] hover:bg-[#3144C3]/90"
            disabled={!data.wyscoutPlayer && !data.dataRequest}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {data.wyscoutPlayer ? "View Full Stats" : "Stats Coming Soon"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-gray-100 text-black">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#31348D] data-[state=active]:text-white">
            Performance Overview
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="data-[state=active]:bg-[#31348D] data-[state=active]:text-white">
            Opportunities
          </TabsTrigger>
          <TabsTrigger value="profile" className="data-[state=active]:bg-[#31348D] data-[state=active]:text-white">
            My Profile
          </TabsTrigger>
          <TabsTrigger value="insights" className="data-[state=active]:bg-[#31348D] data-[state=active]:text-white">
            AI Insights
          </TabsTrigger>
        </TabsList>

        {/* Performance Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Performance Metrics */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">FootyLabs Score</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {aiInsights.footylabsScore}
                </div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +{aiInsights.trendPercentage}% this week
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Market Value</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {aiInsights.marketValue}
                </div>
                <p className="text-xs text-muted-foreground">
                  AI estimated value
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {profileViews}
                </div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">League Ranking</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  #{aiInsights.leagueRanking}
                </div>
                <p className="text-xs text-muted-foreground">
                  In your position
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Breakdown */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-green-500" />
                  Your Strengths
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiInsights.strongSuits.map((strength, index) => (
                  <div key={strength} className="flex items-center justify-between">
                    <span className="text-sm">{strength}</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={85 - index * 5} className="w-20" />
                      <Badge variant="secondary" className="text-xs">
                        {85 - index * 5}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-blue-500" />
                  Growth Areas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiInsights.improvementAreas.map((area, index) => (
                  <div key={area} className="flex items-center justify-between">
                    <span className="text-sm">{area}</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={45 + index * 8} className="w-20" />
                      <Badge variant="outline" className="text-xs">
                        {45 + index * 8}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Current Season Stats */}
          {data.wyscoutPlayer?.stats && (
            <Card>
              <CardHeader>
                <CardTitle>Season Statistics</CardTitle>
                <CardDescription>Your current season performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-blue-600">
                      {data.wyscoutPlayer.stats["Matches played"] || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Matches</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {data.wyscoutPlayer.stats["Goals"] || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Goals</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-purple-600">
                      {data.wyscoutPlayer.stats["Assists"] || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Assists</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-orange-600">
                      {data.wyscoutPlayer.stats["Accurate passes, %"]?.toFixed(1) || "N/A"}%
                    </div>
                    <div className="text-xs text-muted-foreground">Pass Accuracy</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-red-600">
                      {data.wyscoutPlayer.stats["Minutes played"] || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Minutes</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Opportunities Tab */}
        <TabsContent value="opportunities" className="space-y-6">
          <OpportunitiesBrowser 
            playerProfile={data.playerProfile}
            userClubId={data.profile?.club_id}
          />
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Public Profile Card */}
          <Card className="bg-linear-to-r from-blue-600 to-purple-600 text-white">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Eye className="h-5 w-5 mr-2" />
                Your Public Profile
              </CardTitle>
              <CardDescription className="text-blue-100">
                Share your professional profile with clubs and agents worldwide
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-sm mb-2 text-blue-100">Your profile link:</p>
                <div className="flex items-center justify-between bg-white/20 rounded px-3 py-2">
                  <code className="text-sm font-mono">
                    {typeof window !== 'undefined' ? `${window.location.origin}/player/${data.user?.id}` : `/player/${data.user?.id}`}
                  </code>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-white hover:bg-white/20"
                    onClick={() => {
                      const link = `${window.location.origin}/player/${data.user?.id}`
                      navigator.clipboard.writeText(link)
                      alert('Profile link copied to clipboard!')
                    }}
                  >
                    Copy Link
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  className="bg-white text-blue-600 hover:bg-gray-100"
                  onClick={() => window.open(`/player/${data.user?.id}`, '_blank')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Public Profile
                </Button>
                <Button
                  variant="ghost"
                  className="text-white border-white/30 hover:bg-white/20"
                  onClick={() => alert('Profile editing coming soon!')}
                >
                  Edit Profile
                </Button>
              </div>
              <div className="pt-4 border-t border-white/20">
                <p className="text-sm text-blue-100 mb-3">Share your profile:</p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white"
                    onClick={() => {
                      // Placeholder for Facebook share
                      console.log("Share to Facebook")
                    }}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span className="ml-2">Facebook</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white"
                    onClick={() => {
                      // Placeholder for X (Twitter) share
                      console.log("Share to X")
                    }}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span className="ml-2">X</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white"
                    onClick={() => {
                      // Placeholder for Instagram share
                      console.log("Share to Instagram")
                    }}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
                    </svg>
                    <span className="ml-2">Instagram</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Position:</span>
                  <span>{playerPosition}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Age:</span>
                  <span>{data.wyscoutPlayer?.stats?.["Age"] || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Height:</span>
                  <span>{data.wyscoutPlayer?.stats?.["Height"] || "N/A"} cm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preferred Foot:</span>
                  <span className="capitalize">{data.wyscoutPlayer?.stats?.["Foot"] || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Club:</span>
                  <span>{data.wyscoutPlayer?.stats?.["Team"] || "N/A"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-muted-foreground">Preferred Countries:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {data.playerProfile?.preferred_countries?.slice(0, 3).map((country: string) => (
                      <Badge key={country} variant="secondary" className="text-xs">
                        {country}
                      </Badge>
                    )) || <span className="text-sm">Not specified</span>}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Languages:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {data.playerProfile?.languages?.slice(0, 3).map((lang: string) => (
                      <Badge key={lang} variant="secondary" className="text-xs">
                        {lang}
                      </Badge>
                    )) || <span className="text-sm">Not specified</span>}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salary Range:</span>
                  <span>{data.playerProfile?.current_salary_range || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contract End:</span>
                  <span>
                    {data.playerProfile?.contract_end_date 
                      ? new Date(data.playerProfile.contract_end_date).toLocaleDateString()
                      : "Not specified"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2 text-purple-500" />
                AI Performance Analysis
              </CardTitle>
              <CardDescription>
                Advanced insights powered by our FootyLabs AI engine
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Similar Players */}
              <div>
                <h4 className="font-medium mb-3 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Players Similar to You
                </h4>
                <div className="flex flex-wrap gap-2">
                  {aiInsights.similarPlayers.map((player) => (
                    <Badge key={player} variant="outline" className="text-sm">
                      {player}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Performance Predictions */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg bg-linear-to-r from-blue-50 to-purple-50">
                  <h4 className="font-medium flex items-center mb-2">
                    <Zap className="h-4 w-4 mr-2 text-blue-500" />
                    Potential Growth
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Based on your age and trajectory, our AI predicts:
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• Peak performance in 2-3 years</li>
                    <li>• +12% improvement in passing accuracy</li>
                    <li>• Strong adaptation to faster leagues</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg bg-linear-to-r from-green-50 to-yellow-50">
                  <h4 className="font-medium flex items-center mb-2">
                    <Target className="h-4 w-4 mr-2 text-green-500" />
                    Ideal Match
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    You would thrive in:
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• Possession-based systems (87% match)</li>
                    <li>• Mid-tier European leagues</li>
                    <li>• Clubs emphasizing youth development</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Player Stats Modal */}
      {showStatsModal && data.wyscoutPlayer && (
        <PlayerDetailModal
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
          player={{
            id: data.wyscoutPlayer.id,
            name: data.wyscoutPlayer.name,
            position: data.wyscoutPlayer.position,
            player_pos: data.wyscoutPlayer.position,
            stats: data.wyscoutPlayer.stats,
            club_id: data.wyscoutPlayer.club_id,
            wyscout_player_id: data.wyscoutPlayer.wyscout_player_id,
            player_league_name: data.wyscoutPlayer.stats?.["Team"] || "League"
          }}
        />
      )}
    </div>
  )
}