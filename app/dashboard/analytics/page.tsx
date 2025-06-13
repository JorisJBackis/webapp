"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import PositionAnalytics from "@/components/dashboard/position-analytics"
import LastGameInsights from "@/components/dashboard/last-game-insights"
import CurrentSeasonInsights from "@/components/dashboard/current-season-insights"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"lastGame" | "currentSeason" | "league">("lastGame")
  const [positionData, setPositionData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [clubId, setClubId] = useState<number | undefined>(undefined)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Fetching user profile and club ID...")
        setLoading(true)

        // Get user profile to get the club ID
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
          .select("club_id")
          .eq("id", user.id)
          .single()

        if (profileError) {
          console.error("Error fetching profile:", profileError)
          setLoading(false)
          return
        }

        console.log("Profile data:", profile)

        if (profile?.club_id) {
          console.log("Setting club ID:", profile.club_id)
          setClubId(profile.club_id)
        } else {
          console.warn("No club_id found in profile")
        }

        // Fetch position average data
        const { data: posData, error } = await supabase
          .from("final_position_averages")
          .select("position, stats")
          .order("position", { ascending: false }) // Order from 10 to 1

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
      case "lastGame":
        return <LastGameInsights clubId={clubId} />
      case "currentSeason":
        return <CurrentSeasonInsights clubId={clubId} />
      case "league":
        return (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">League Position Analysis</h2>
            <p className="text-gray-600 mb-6">
              These charts show the average goals scored, goals conceded, and points accumulated by teams based on their
              final league position over the last 4 seasons. This data can help identify performance benchmarks needed
              to achieve specific league positions.
            </p>
            <PositionAnalytics positionData={positionData} clubId={clubId} />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Team Performance Insights</h1>

 

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-6 border-b pb-2">
        <Button
          variant={activeTab === "lastGame" ? "default" : "outline"}
          onClick={() => setActiveTab("lastGame")}
          className={activeTab === "lastGame" ? "bg-[#31348D]" : ""}
        >
          Last Game Insights
        </Button>
        <Button
          variant={activeTab === "currentSeason" ? "default" : "outline"}
          onClick={() => setActiveTab("currentSeason")}
          className={activeTab === "currentSeason" ? "bg-[#31348D]" : ""}
        >
          Current Season Insights
        </Button>
        <Button
          variant={activeTab === "league" ? "default" : "outline"}
          onClick={() => setActiveTab("league")}
          className={activeTab === "league" ? "bg-[#31348D]" : ""}
        >
          League Insights
        </Button>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  )
}
