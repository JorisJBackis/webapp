"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import PositionAnalytics from "@/components/dashboard/position-analytics"
import LastGameInsights from "@/components/dashboard/last-game-insights"
import CurrentSeasonInsights from "@/components/dashboard/current-season-insights"
import ClubReputation from "@/components/dashboard/club-reputation"
import PlayerInsightsV2 from "@/components/dashboard/player-insights-v2"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, AlertCircle } from "lucide-react"

export default function AnalyticsPage() {
  // <<< 2. (CHANGE) Update activeTab state to include 'reputation' >>>
  const [activeTab, setActiveTab] = useState<"lastGame" | "currentSeason" | "league" | "reputation">("lastGame")
  const [positionData, setPositionData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [clubId, setClubId] = useState<number | undefined>(undefined)
  const [leagueName, setLeagueName] = useState<string | null>(null)
  const [userType, setUserType] = useState<string | null>(null)
  const [playerProfile, setPlayerProfile] = useState<any>(null)
  const [dataRequest, setDataRequest] = useState<any>(null)
  const [wyscoutPlayer, setWyscoutPlayer] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Fetching user profile and club ID...")
        setLoading(true)

        if (!supabase) return;

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          console.error("No authenticated user found")
          setLoading(false)
          return
        }

        console.log("User ID:", user.id)

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("club_id, user_type, clubs(league)")
            .eq("id", user.id)
            .single()

        if (profileError) {
          console.error("Error fetching profile:", profileError)
          setLoading(false)
          return
        }

        console.log("Profile data:", profile)
        
        setUserType(profile?.user_type || null)
        
        // If player, get player profile data and check for data request
        if (profile?.user_type === 'player') {
          const { data: playerData } = await supabase
            .from('player_profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          setPlayerProfile(playerData)

          // Check for pending data request
          const { data: requestData } = await supabase
            .from('player_data_requests')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .single()

          setDataRequest(requestData)

          // Get wyscout player data if available
          if (playerData?.wyscout_player_id) {
            const { data: wyscoutData } = await supabase
              .from('players')
              .select('*')
              .eq('wyscout_player_id', playerData.wyscout_player_id)
              .order('updated_at', { ascending: false })
              .limit(1)
              .single()

            setWyscoutPlayer(wyscoutData)
          }
        }

        if (profile?.club_id) {
          console.log("Setting club ID:", profile.club_id)
          setClubId(profile.club_id)
          setLeagueName(profile.clubs?.league || null)
        } else {
          console.warn("No club_id found in profile")
        }

        const { data: posData, error } = await supabase
            .from("final_position_averages")
            .select("position, stats")
            .order("position", { ascending: false })

        if (error) {
          console.error("Error fetching position data:", error)
        } else {
          setPositionData(posData || [])
        }

        setLoading(false)
      } catch (err) {
        console.error("Error in data fetching:", err)
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  const renderTabContent = () => {
    if (loading) {
      return (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      )
    }

    switch (activeTab) {
      case "lastGame":
        return <LastGameInsights clubId={clubId} />
      case "currentSeason":
        return <CurrentSeasonInsights clubId={clubId} />
      case "league":
        return (
            <div className="bg-background rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">League Position Analysis</h2>
              <p className="text-gray-600 mb-6">
                These charts show the average goals scored, goals conceded, and points accumulated by teams based on their
                final league position over the last 4 seasons. This data can help identify performance benchmarks needed
                to achieve specific league positions.
              </p>
              <PositionAnalytics positionData={positionData} clubId={clubId} />
            </div>
        )
        // <<< 6. (ADD) Add a case to render the new component >>>
      case "reputation":
        return <ClubReputation leagueName={leagueName} />
      default:
        return null
    }
  }

  // If player, show player-specific analytics with tabs
  if (userType === 'player') {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Player Performance Analytics</h1>

        {/* Pending Data Request Alert */}
        {dataRequest && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">
                    Your performance data is being processed
                  </h3>
                  <p className="text-sm text-blue-800">
                    FootyLabs will add your statistics within 5 working days.
                    You registered on {new Date(dataRequest.requested_at).toLocaleDateString()}.
                    The analytics shown below are demo data to demonstrate how your insights will appear.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Demo Data Alert for Players Without Stats */}
        {!wyscoutPlayer && !dataRequest && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 mb-1">
                    Demo Analytics - Sample Data
                  </h3>
                  <p className="text-sm text-amber-800">
                    This is a demonstration of how your performance analytics will look once we have your data.
                    The insights below use sample data to show the types of analysis available.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-2 mb-6 border-b pb-2">
          <Button
              variant={activeTab === "lastGame" ? "default" : "outline-solid"}
              onClick={() => setActiveTab("lastGame")}
              className={activeTab === "lastGame" ? "bg-primary" : ""}
          >
            Performance Overview
          </Button>
          <Button
              variant={activeTab === "currentSeason" ? "default" : "outline-solid"}
              onClick={() => setActiveTab("currentSeason")}
              className={activeTab === "currentSeason" ? "bg-primary" : ""}
          >
            Market Analytics
          </Button>
          <Button
              variant={activeTab === "league" ? "default" : "outline-solid"}
              onClick={() => setActiveTab("league")}
              className={activeTab === "league" ? "bg-primary" : ""}
          >
            Development Tracking
          </Button>
          <Button
              variant={activeTab === "reputation" ? "default" : "outline-solid"}
              onClick={() => setActiveTab("reputation")}
              className={activeTab === "reputation" ? "bg-primary" : ""}
          >
            League Comparison
          </Button>
        </div>

        {loading ? (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {activeTab === "lastGame" && <PlayerInsightsV2 playerProfile={playerProfile} category="performance" />}
            {activeTab === "currentSeason" && <PlayerInsightsV2 playerProfile={playerProfile} category="market" />}
            {activeTab === "league" && <PlayerInsightsV2 playerProfile={playerProfile} category="development" />}
            {activeTab === "reputation" && <PlayerInsightsV2 playerProfile={playerProfile} category="comparison" />}
          </>
        )}
      </div>
    )
  }

  return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Team Performance Insights</h1>

        <div className="flex flex-wrap gap-2 mb-6 border-b pb-2">
          <Button
              variant={activeTab === "lastGame" ? "default" : "outline-solid"}
              onClick={() => setActiveTab("lastGame")}
              className={activeTab === "lastGame" ? "bg-primary" : ""}
          >
            Last Game Insights
          </Button>
          <Button
              variant={activeTab === "currentSeason" ? "default" : "outline-solid"}
              onClick={() => setActiveTab("currentSeason")}
              className={activeTab === "currentSeason" ? "bg-primary" : ""}
          >
            Current Season Insights
          </Button>
          <Button
              variant={activeTab === "league" ? "default" : "outline-solid"}
              onClick={() => setActiveTab("league")}
              className={activeTab === "league" ? "bg-primary" : ""}
          >
            League Insights
          </Button>
          <Button
              variant={activeTab === "reputation" ? "default" : "outline-solid"}
              onClick={() => setActiveTab("reputation")}
              className={activeTab === "reputation" ? "bg-primary" : ""}
          >
            Club Reputation
          </Button>
        </div>

        {renderTabContent()}
      </div>
  )
}