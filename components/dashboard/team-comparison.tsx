"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// Sample data - replace with actual data from your API
const comparisonData = [
  { attribute: "Attack", yourTeam: 85, leagueAverage: 70 },
  { attribute: "Defense", yourTeam: 78, leagueAverage: 72 },
  { attribute: "Possession", yourTeam: 65, leagueAverage: 50 },
  { attribute: "Passing", yourTeam: 80, leagueAverage: 65 },
  { attribute: "Physical", yourTeam: 75, leagueAverage: 73 },
  { attribute: "Tactical", yourTeam: 82, leagueAverage: 68 },
]

export default function TeamComparison({ clubId }: { clubId?: number }) {
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!clubId) return

      // Here you would fetch actual data from your API
      // const { data, error } = await supabase...

      // For now, we'll just simulate loading
      setTimeout(() => {
        setLoading(false)
      }, 1000)
    }

    fetchData()
  }, [clubId, supabase])

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="border-b bg-gray-100">
        <CardTitle className="text-[#31348D]">Team Comparison</CardTitle>
        <CardDescription className="text-black/70">
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
      </CardContent>
    </Card>
  )
}

