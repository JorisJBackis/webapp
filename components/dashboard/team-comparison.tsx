"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// ACTION: Replace the old TeamStats type with this one
type TeamStats = {
  shotsOnTarget: number;
  shotsAgainstOnTarget: number;
  touchesInBox: number;
  ppda: number;
  possession: number; // Keeping this one from the original list
};

type ComparisonDataItem = {
  attribute: string
  yourTeam: number
  leagueAverage: number
}

export default function TeamComparison({ clubId }: { clubId?: number }) {
  const [loading, setLoading] = useState(true)
  const [comparisonData, setComparisonData] = useState<ComparisonDataItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!clubId) return

      try {
        console.log("Fetching team comparison data for club ID:", clubId)

        // Fetch your team's stats
        const { data: teamData, error: teamError } = await supabase
          .from("team_match_stats")
          .select("stats")
          .eq("team_id", clubId)

        if (teamError) throw new Error(`Error fetching team stats: ${teamError.message}`)

        // Fetch all teams' stats for league average
        const { data: allTeamsData, error: allTeamsError } = await supabase.from("team_match_stats").select("stats")

        if (allTeamsError) throw new Error(`Error fetching league stats: ${allTeamsError.message}`)

        console.log("Team data count:", teamData?.length)
        console.log("All teams data count:", allTeamsData?.length)

        if (!teamData?.length) {
          setError("No team data available")
          setLoading(false)
          return
        }

        const teamStats: TeamStats = {
          shotsOnTarget: calculateAverageFromJson(teamData, "Shots on Target"),
          shotsAgainstOnTarget: calculateAverageFromJson(teamData, "Shots Against on Target"),
          touchesInBox: calculateAverageFromJson(teamData, "Touches in Penalty Area"),
          ppda: calculateAverageFromJson(teamData, "PPDA"),
          possession: calculateAverageFromJson(teamData, "Possession %"), // This line remains
        };

        // Calculate league averages
        const leagueStats: TeamStats = {
          shotsOnTarget: calculateAverageFromJson(allTeamsData, "Shots on Target"),
          shotsAgainstOnTarget: calculateAverageFromJson(allTeamsData, "Shots Against on Target"),
          touchesInBox: calculateAverageFromJson(allTeamsData, "Touches in Penalty Area"),
          ppda: calculateAverageFromJson(allTeamsData, "PPDA"),
          possession: calculateAverageFromJson(allTeamsData, "Possession %"), // This line remains
        };

        console.log("Team stats:", teamStats)
        console.log("League stats:", leagueStats)

        // Format data for the radar chart
        // ACTION: Replace the old formattedData array with this
        const formattedData: ComparisonDataItem[] = [
          { attribute: "Shots For (Target)", yourTeam: teamStats.shotsOnTarget, leagueAverage: leagueStats.shotsOnTarget },
          { attribute: "Shots Against (Target)", yourTeam: teamStats.shotsAgainstOnTarget, leagueAverage: leagueStats.shotsAgainstOnTarget },
          { attribute: "Touches in Box", yourTeam: teamStats.touchesInBox, leagueAverage: leagueStats.touchesInBox },
          { attribute: "PPDA", yourTeam: teamStats.ppda, leagueAverage: leagueStats.ppda }, // Passes Per Defensive Action - lower is often better, might need interpretation/scaling later
          { attribute: "Possession %", yourTeam: teamStats.possession, leagueAverage: leagueStats.possession },
        ];

        setComparisonData(formattedData)
        setLoading(false)
      } catch (err) {
        console.error("Error in TeamComparison:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
        setLoading(false)
      }
    }

    fetchData()
  }, [clubId, supabase])

  // Helper function to calculate average from JSON stats
  const calculateAverageFromJson = (data: any[], field: string): number => {
    if (!data || data.length === 0) return 0

    const validValues = data
      .map((item) => {
        // Extract the value from the stats JSON
        const stats = item.stats
        if (!stats) return Number.NaN

        // Try to get the value directly or parse it if it's a string
        const statsObj = typeof stats === "string" ? JSON.parse(stats) : stats

        // Get the value and convert to number
        const value = statsObj[field]
        return value !== undefined ? Number.parseFloat(value) : Number.NaN
      })
      .filter((value) => !isNaN(value))

    if (validValues.length === 0) return 0

    const sum = validValues.reduce((acc, val) => acc + val, 0)
    return Number.parseFloat((sum / validValues.length).toFixed(2))
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="border-b bg-gray-100">
          <CardTitle className="text-[#31348D]">Team Comparison</CardTitle>
          <CardDescription className="text-black/70">Loading comparison data...</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="border-b bg-gray-100">
          <CardTitle className="text-[#31348D]">Team Comparison</CardTitle>
          <CardDescription className="text-black/70">Error loading comparison data</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center text-red-500">{error}</div>
          <div className="mt-4 text-center text-sm text-gray-500">
            Try refreshing the page or contact support if the problem persists.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="border-b bg-gray-100">
        <CardTitle className="text-[#31348D]">Team Comparison</CardTitle>
        <CardDescription className="text-black/70">
          How your team compares to the league average across key metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {comparisonData.length > 0 ? (
          <ChartContainer
            config={{
              yourTeam: {
                label: "Your Team",
                color: "hsl(var(--chart-1))",
              },
              leagueAverage: {
                label: "League Average",
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[400px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={comparisonData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="attribute" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Radar
                  name="Your Team"
                  dataKey="yourTeam"
                  stroke="var(--color-yourTeam)"
                  fill="var(--color-yourTeam)"
                  fillOpacity={0.6}
                />
                <Radar
                  name="League Average"
                  dataKey="leagueAverage"
                  stroke="var(--color-leagueAverage)"
                  fill="var(--color-leagueAverage)"
                  fillOpacity={0.6}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="flex h-[400px] items-center justify-center">
            <p className="text-muted-foreground">No comparison data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
