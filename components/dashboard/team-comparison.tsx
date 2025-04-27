"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"

// Updated TeamStats type
type TeamStats = {
  shotsOnTarget: number
  shotsAgainstOnTarget: number
  touchesInBox: number
  possession: number
}

type ComparisonDataItem = {
  attribute: string
  percentile: number
  actualValue: number
  leagueAverage: number
}

export default function TeamComparison({ clubId }: { clubId?: number }) {
  const [loading, setLoading] = useState(true)
  const [comparisonData, setComparisonData] = useState<ComparisonDataItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Calculate percentile function
  const calculatePercentile = (values: number[], value: number): number => {
    if (!values || values.length === 0) return 0

    // Filter out any NaN or undefined values
    const validValues = values.filter((v) => !isNaN(v) && v !== undefined && v !== null)
    if (validValues.length === 0) return 0

    // Sort the values in ascending order
    const sortedValues = [...validValues].sort((a, b) => a - b)

    // Find how many values are below the given value
    const belowCount = sortedValues.filter((v) => v < value).length

    // Calculate percentile (0-100)
    return Math.round((belowCount / sortedValues.length) * 100)
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!clubId) return

      try {
        console.log("Fetching team comparison data for club ID:", clubId)

        // Fetch all teams' stats for calculations
        const { data: allTeamsData, error: allTeamsError } = await supabase.from("team_metrics_aggregated").select("*")

        if (allTeamsError) throw new Error(`Error fetching league stats: ${allTeamsError.message}`)

        if (!allTeamsData || allTeamsData.length === 0) {
          setError("No team data available")
          setLoading(false)
          return
        }

        console.log("All teams data count:", allTeamsData.length)

        // Find your team's data
        const teamData = allTeamsData.find((team) => team.team_id === clubId)

        if (!teamData) {
          setError(`No data found for team ID: ${clubId}`)
          setLoading(false)
          return
        }

        console.log("Team data:", teamData)

        // Define the metrics we want to analyze
        const metrics = ["Shots on Target", "Shots Against on Target", "Touches in Penalty Area", "Possession %"]

        // Process each metric
        const processedData = metrics.map((metric) => {
          // Extract all values for this metric across all teams
          const allValues = allTeamsData
            .map((team) => {
              const val = team[metric]
              // Handle different data types (string, number, null)
              return typeof val === "string" ? Number.parseFloat(val) : typeof val === "number" ? val : 0
            })
            .filter((val) => !isNaN(val))

          // Get your team's value
          const rawTeamValue = teamData[metric]
          const teamValue =
            typeof rawTeamValue === "string"
              ? Number.parseFloat(rawTeamValue)
              : typeof rawTeamValue === "number"
                ? rawTeamValue
                : 0

          // Calculate league average
          const leagueAverage =
            allValues.length > 0 ? allValues.reduce((sum, val) => sum + val, 0) / allValues.length : 0

          // Calculate percentile
          const percentile = calculatePercentile(allValues, teamValue)

          const result = {
            attribute: metric,
            percentile: percentile,
            actualValue: teamValue,
            leagueAverage: leagueAverage,
          }

          console.log(`Metric: ${metric}`, result)
          return result
        })

        console.log("Processed comparison data:", processedData)
        setComparisonData(processedData)
        setLoading(false)
      } catch (err) {
        console.error("Error in TeamComparison:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
        setLoading(false)
      }
    }

    fetchData()
  }, [clubId, supabase])

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

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null

    // Debug the payload to see what's available
    console.log("Tooltip payload:", payload)
    console.log("Tooltip label:", label)

    // Find the data item that matches this label
    const dataItem = comparisonData.find((item) => item.attribute === label)

    if (!dataItem) return null

    console.log("Found data item:", dataItem)

    return (
      <div className="rounded-md border bg-white p-3 shadow-sm">
        <div className="font-semibold text-[#31348D]">{label}</div>
        <div className="mt-2 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[#4B5563]">Percentile:</span>
            <span className="font-mono text-[#31348D] font-medium">{dataItem.percentile}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#4B5563]">Actual Value:</span>
            <span className="font-mono text-[#31348D] font-medium">{dataItem.actualValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#4B5563]">League Average:</span>
            <span className="font-mono text-[#31348D] font-medium">{dataItem.leagueAverage.toFixed(2)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="border-b bg-gray-100">
        <CardTitle className="text-[#31348D]">Team Comparison</CardTitle>
        <CardDescription className="text-black/70">
          How your team compares to the league across key metrics (percentile ranking)
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {comparisonData.length > 0 ? (
          <ChartContainer
            config={{
              percentile: {
                label: "Your Team (Percentile)",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[400px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={comparisonData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="attribute" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <ChartTooltip content={<CustomTooltip />} />
                <Radar
                  name="Percentile"
                  dataKey="percentile"
                  stroke="var(--color-percentile)"
                  fill="var(--color-percentile)"
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
