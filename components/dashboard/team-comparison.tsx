"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { fetchTeamComparison } from "@/lib/api"

export default function TeamComparison({ clubId }: { clubId?: number }) {
  const [comparisonData, setComparisonData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!clubId) return
      
      try {
        setLoading(true)
        const data = await fetchTeamComparison(clubId)
        setComparisonData(data)
      } catch (error: any) {
        console.error("Error fetching team comparison:", error)
        setError(error.message || "Failed to load team comparison data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [clubId])

  if (loading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="border-b bg-footylabs-darkblue text-white">
          <CardTitle>Team Comparison</CardTitle>
          <CardDescription className="text-white/80">
            Loading comparison data...
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 h-[400px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="border-b bg-footylabs-darkblue text-white">
          <CardTitle>Team Comparison</CardTitle>
          <CardDescription className="text-white/80">
            Error loading comparison data
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-red-500">{error}</div>
        </CardContent>
      </Card>
    )
  }

  // Transform data keys to match our component expectations
  const formattedData = comparisonData.map(item => ({
    attribute: item.attribute,
    yourTeam: item.your_team,
    leagueAverage: item.league_average
  }))

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="border-b bg-footylabs-darkblue text-white">
        <CardTitle>Team Comparison</CardTitle>
        <CardDescription className="text-white/80">
          How your team compares to the league average across key metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
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
            <RadarChart data={formattedData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="attribute" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Radar name="Your Team" dataKey="yourTeam" stroke="var(--color-yourTeam)" fill="var(--color-yourTeam)" fillOpacity={0.6} />
              <Radar name="League Average" dataKey="leagueAverage" stroke="var(--color-leagueAverage)" fill="var(--color-leagueAverage)" fillOpacity={0.6} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

