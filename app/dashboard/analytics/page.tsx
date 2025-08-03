"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import PositionAnalytics from "@/components/dashboard/position-analytics"
import LastGameInsights from "@/components/dashboard/last-game-insights"
import CurrentSeasonInsights from "@/components/dashboard/current-season-insights"
import ClubReputation from "@/components/dashboard/club-reputation" // <<< 1. (ADD) Import the new component
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function AnalyticsPage() {
  // <<< 2. (CHANGE) Update activeTab state to include 'reputation' >>>
  const [activeTab, setActiveTab] = useState<"lastGame" | "currentSeason" | "league" | "reputation">("lastGame")
  const [positionData, setPositionData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [clubId, setClubId] = useState<number | undefined>(undefined)

  // <<< 3. (ADD) New state to hold the user's league name for the reputation tab >>>
  const [leagueName, setLeagueName] = useState<string | null>(null)

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

        // <<< 4. (CHANGE) Update the Supabase query to also get the league name >>>
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("club_id, clubs(league)") // Fetch the related league name from the clubs table
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
          // <<< 5. (ADD) Set the league name state >>>
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
        // <<< 6. (ADD) Add a case to render the new component >>>
      case "reputation":
        return <ClubReputation leagueName={leagueName} />
      default:
        return null
    }
  }

  return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Team Performance Insights</h1>

        <div className="flex flex-wrap gap-2 mb-6 border-b pb-2">
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
          {/* <<< 7. (ADD) Add the new button for the tab >>> */}
          <Button
              variant={activeTab === "reputation" ? "default" : "outline"}
              onClick={() => setActiveTab("reputation")}
              className={activeTab === "reputation" ? "bg-[#31348D]" : ""}
          >
            Club Reputation
          </Button>
        </div>

        {renderTabContent()}
      </div>
  )
}