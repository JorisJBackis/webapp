"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  User, 
  MapPin, 
  Calendar, 
  Phone, 
  Mail, 
  Globe, 
  Award,
  TrendingUp,
  Target,
  Users,
  Star,
  Heart,
  Share2,
  Download
} from "lucide-react"
import { useState } from "react"
import {ModeToggleInstant} from "@/components/mode-toggle";

interface PlayerPublicProfileProps {
  profile: any
  userData: any
  wyscoutPlayer: any
}

export default function PlayerPublicProfile({ profile, userData, wyscoutPlayer }: PlayerPublicProfileProps) {
  const [isInterested, setIsInterested] = useState(false)

  // Generate consistent mock data like in dashboard
  const playerId = profile?.id || userData?.id || '123'
  const generateConsistentMockData = (playerId: string | number) => {
    const seed = playerId ? playerId.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 123
    
    const seededRandom = (min: number, max: number, offset = 0) => {
      const x = Math.sin(seed + offset) * 10000
      return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min
    }
    
    return {
      footylabsScore: wyscoutPlayer?.stats?.avg_percentile 
        ? (wyscoutPlayer.stats.avg_percentile * 10).toFixed(1) 
        : "7.4",
      marketValue: "€" + (seededRandom(150, 400, 1) * 1000).toLocaleString(),
      profileViews: seededRandom(50, 300, 2),
      matches: seededRandom(15, 35, 3),
      goals: seededRandom(2, 12, 4),
      assists: seededRandom(1, 8, 5)
    }
  }

  const mockData = generateConsistentMockData(playerId)
  const playerName = wyscoutPlayer?.name || profile?.agent_name || "Player"
  const playerPosition = wyscoutPlayer?.position || profile?.playing_positions?.[0] || "Player"

  const handleInterest = () => {
    setIsInterested(!isInterested)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${playerName} - FootyLabs Profile`,
        text: `Check out ${playerName}'s professional football profile`,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Profile link copied to clipboard!')
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 dark:from-blue-900 dark:to-indigo-900">
      {/* Header */}
      <div className="bg-background shadow-xs border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-linear-to-r from-blue-600 to-purple-600 dark:from-blue-300 dark:to-purple-300 rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-xl font-bold">
                  {playerName.charAt(0)}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-muted-foreground">{playerName}</h1>
                <p className="text-gray-600">{playerPosition}</p>
                <div className="flex items-center mt-1">
                  <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                  <span className="text-sm text-gray-600">
                    {wyscoutPlayer?.stats?.["Team"] || "Available"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <ModeToggleInstant />
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button 
                onClick={handleInterest}
                className={isInterested ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}
              >
                <Heart className={`h-4 w-4 mr-2 ${isInterested ? 'fill-current' : ''}`} />
                {isInterested ? 'Interested' : 'Express Interest'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Performance Highlights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{mockData.footylabsScore}</div>
                    <div className="text-sm text-gray-600">FootyLabs Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{mockData.matches}</div>
                    <div className="text-sm text-gray-600">Matches</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{mockData.goals}</div>
                    <div className="text-sm text-gray-600">Goals</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{mockData.assists}</div>
                    <div className="text-sm text-muted-foreground">Assists</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Attributes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Key Attributes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {wyscoutPlayer?.stats && (
                    <>
                      <div className="flex justify-between items-center">
                        <span>Passing Accuracy</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={75} className="w-24" />
                          <span className="text-sm font-medium">75%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Defensive Actions</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={68} className="w-24" />
                          <span className="text-sm font-medium">68%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Aerial Duels</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={82} className="w-24" />
                          <span className="text-sm font-medium">82%</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Career Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Career Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Preferred Countries</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile?.preferred_countries?.slice(0, 5).map((country: string) => (
                        <Badge key={country} variant="secondary">
                          {country}
                        </Badge>
                      )) || <span className="text-muted-foreground">Not specified</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Languages</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile?.languages?.slice(0, 4).map((language: string) => (
                        <Badge key={language} variant="outline">
                          {language}
                        </Badge>
                      )) || <span className="text-muted-foreground">Not specified</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Salary Expectations</h4>
                    <Badge className="bg-green-100 text-green-800">
                      {profile?.desired_salary_range || profile?.current_salary_range || "Negotiable"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Highlight Video */}
            {profile?.youtube_highlight_url && (
              <Card>
                <CardHeader>
                  <CardTitle>Highlight Video</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <Button variant="outline">
                      <Globe className="h-4 w-4 mr-2" />
                      View Highlights
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Profile Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Age:</span>
                  <span>{wyscoutPlayer?.stats?.["Age"] || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Height:</span>
                  <span>{wyscoutPlayer?.stats?.["Height"] || "N/A"} cm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Foot:</span>
                  <span className="capitalize">{wyscoutPlayer?.stats?.["Foot"] || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Market Value:</span>
                  <span className="font-medium text-green-600">{mockData.marketValue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Contract:</span>
                  <span>{profile?.contract_end_date ? new Date(profile.contract_end_date).getFullYear() : "Available"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Agent Info */}
            {(profile?.agent_name || profile?.agent_email) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Representation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profile?.agent_name && (
                    <div>
                      <span className="text-gray-600">Agent:</span>
                      <p className="font-medium">{profile.agent_name}</p>
                    </div>
                  )}
                  {profile?.agent_email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-sm">{profile.agent_email}</span>
                    </div>
                  )}
                  {profile?.agent_phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-sm">{profile.agent_phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Profile Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Profile Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Profile Views:</span>
                  <span className="font-medium">{mockData.profileViews}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Joined:</span>
                  <span>{new Date(profile?.created_at || Date.now()).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated:</span>
                  <span>{new Date(profile?.updated_at || Date.now()).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card className="bg-linear-to-r from-blue-600 to-purple-600 text-white dark:text-foreground">
              <CardContent className="pt-6 text-center">
                <Star className="h-8 w-8 mx-auto mb-3" />
                <h3 className="font-bold mb-2">Interested in this player?</h3>
                <p className="text-sm mb-4 text-blue-100">
                  Get in touch to discuss opportunities and availability
                </p>
                <Button className="w-full">
                  Contact Player
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}