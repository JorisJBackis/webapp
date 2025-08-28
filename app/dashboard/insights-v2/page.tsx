"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import PlayerInsightsV2 from "@/components/dashboard/player-insights-v2"
import PositionAnalytics from "@/components/dashboard/position-analytics"
import LastGameInsights from "@/components/dashboard/last-game-insights"
import CurrentSeasonInsights from "@/components/dashboard/current-season-insights"
import ClubReputation from "@/components/dashboard/club-reputation"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function InsightsV2Page() {
  const [activeTab, setActiveTab] = useState<"performance" | "market" | "development" | "comparison">("performance")
  const [positionData, setPositionData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [clubId, setClubId] = useState<number | undefined>(undefined)
  const [leagueName, setLeagueName] = useState<string | null>(null)
  const [userType, setUserType] = useState<string | null>(null)
  const [playerProfile, setPlayerProfile] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Fetching user profile and club ID...")
        setLoading(true)

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
        
        // If player, get player profile data
        if (profile?.user_type === 'player') {
          const { data: playerData } = await supabase
            .from('player_profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          
          setPlayerProfile(playerData)
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
            <Loader2 className="h-8 w-8 animate-spin text-[#31348D]" />
          </div>
      )
    }

    switch (activeTab) {
      case "performance":
        return <PlayerInsightsV2 playerProfile={playerProfile} category="performance" />
      case "market":
        return <PlayerInsightsV2 playerProfile={playerProfile} category="market" />
      case "development":
        return <PlayerInsightsV2 playerProfile={playerProfile} category="development" />
      case "comparison":
        return <PlayerInsightsV2 playerProfile={playerProfile} category="comparison" />
      default:
        return null
    }
  }

  // If player, show player-specific analytics with tabs
  if (userType === 'player') {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Player Performance Analytics</h1>

        <div className="flex flex-wrap gap-2 mb-6 border-b pb-2">
          <Button
              variant={activeTab === "performance" ? "default" : "outline"}
              onClick={() => setActiveTab("performance")}
              className={activeTab === "performance" ? "bg-[#31348D]" : ""}
          >
            Performance Overview
          </Button>
          <Button
              variant={activeTab === "market" ? "default" : "outline"}
              onClick={() => setActiveTab("market")}
              className={activeTab === "market" ? "bg-[#31348D]" : ""}
          >
            Market Analytics
          </Button>
          <Button
              variant={activeTab === "development" ? "default" : "outline"}
              onClick={() => setActiveTab("development")}
              className={activeTab === "development" ? "bg-[#31348D]" : ""}
          >
            Development Tracking
          </Button>
          <Button
              variant={activeTab === "comparison" ? "default" : "outline"}
              onClick={() => setActiveTab("comparison")}
              className={activeTab === "comparison" ? "bg-[#31348D]" : ""}
          >
            League Comparison
          </Button>
        </div>

        {renderTabContent()}
      </div>
    )
  }

  // If club user, show original club analytics
  return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Team Performance Insights</h1>

        <div className="flex flex-wrap gap-2 mb-6 border-b pb-2">
          <Button
              variant={activeTab === "performance" ? "default" : "outline"}
              onClick={() => setActiveTab("performance")}
              className={activeTab === "performance" ? "bg-[#31348D]" : ""}
          >
            Last Game Insights
          </Button>
          <Button
              variant={activeTab === "market" ? "default" : "outline"}
              onClick={() => setActiveTab("market")}
              className={activeTab === "market" ? "bg-[#31348D]" : ""}
          >
            Current Season Insights
          </Button>
          <Button
              variant={activeTab === "development" ? "default" : "outline"}
              onClick={() => setActiveTab("development")}
              className={activeTab === "development" ? "bg-[#31348D]" : ""}
          >
            League Insights
          </Button>
          <Button
              variant={activeTab === "comparison" ? "default" : "outline"}
              onClick={() => setActiveTab("comparison")}
              className={activeTab === "comparison" ? "bg-[#31348D]" : ""}
          >
            Club Reputation
          </Button>
        </div>

        {loading ? (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#31348D]" />
          </div>
        ) : activeTab === "performance" ? (
          <LastGameInsights clubId={clubId} />
        ) : activeTab === "market" ? (
          <CurrentSeasonInsights clubId={clubId} />
        ) : activeTab === "development" ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">League Position Analysis</h2>
            <p className="text-gray-600 mb-6">
              These charts show the average goals scored, goals conceded, and points accumulated by teams based on their
              final league position over the last 4 seasons. This data can help identify performance benchmarks needed
              to achieve specific league positions.
            </p>
            <PositionAnalytics positionData={positionData} clubId={clubId} />
          </div>
        ) : (
          <ClubReputation leagueName={leagueName} />
        )}
      </div>
  )
}