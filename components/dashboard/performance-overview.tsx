"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { fetchPerformanceData } from "@/lib/api"

export default function PerformanceOverview({ clubId }: { clubId?: number }) {
  const [performanceData, setPerformanceData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!clubId) return

      try {
        setLoading(true)
        const data = await fetchPerformanceData(clubId)
        setPerformanceData(data)
      } catch (error: any) {
        console.error("Error fetching performance data:", error)
        setError(error.message || "Failed to load performance data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [clubId])

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full border-0 shadow-md">
          <CardHeader className="border-b bg-footylabs-darkblue text-white">
            <CardTitle>Season Performance</CardTitle>
            <CardDescription className="text-white/80">
              Loading performance data...
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full border-0 shadow-md">
          <CardHeader className="border-b bg-footylabs-darkblue text-white">
            <CardTitle>Season Performance</CardTitle>
            <CardDescription className="text-white/80">
              Error loading performance data
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-red-500">{error}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate summary statistics
  const totalMatches = performanceData.reduce((sum, month) => sum + month.wins + month.draws + month.losses, 0)
  const totalWins = performanceData.reduce((sum, month) => sum + month.wins, 0)
  const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0
  
  const totalGoals = performanceData.reduce((sum, month) => sum + month.goals_scored, 0)
  const goalsPerGame = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(1) : "0.0"
  
  const cleanSheets = 8 // This would come from your API in a real app
  const cleanSheetPercentage = totalMatches > 0 ? Math.round((cleanSheets / totalMatches) * 100) : 0

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="col-span-full border-0 shadow-md">
        <CardHeader className="border-b bg-footylabs-darkblue text-white">
          <CardTitle>Season Performance</CardTitle>
          <CardDescription className="text-white/80">
            Overview of match results and goals for the current season
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="results" className="space-y-4">
            <TabsList className="bg-footylabs-darkblue text-white">
              <TabsTrigger value="results" className="data-[state=active]:bg-footylabs-blue">Match Results</TabsTrigger>
              <TabsTrigger value="goals" className="data-[state=active]:bg-footylabs-blue">Goals</TabsTrigger>
            </TabsList>
            <TabsContent value="results" className="space-y-4">
              <ChartContainer
                config={{
                  wins: {
                    label: "Wins",
                    color: "hsl(var(--chart-1))",
                  },
                  draws: {
                    label: "Draws",
                    color: "hsl(var(--chart-2))",
                  },
                  losses: {
                    label: "Losses",
                    color: "hsl(var(--chart-3))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="wins" stackId="a" fill="var(--color-wins)" />
                    <Bar dataKey="draws" stackId="a" fill="var(--color-draws)" />
                    <Bar dataKey="losses" stackId="a" fill="var(--color-losses)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </TabsContent>
            <TabsContent value="goals" className="space-y-4">
              <ChartContainer
                config={{
                  goals_scored: {
                    label: "Goals Scored",
                    color: "hsl(var(--chart-1))",
                  },
                  goals_conceded: {
                    label: "Goals Conceded",
                    color: "hsl(var(--chart-4))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line type="monotone" dataKey="goals_scored" stroke="var(--color-goals_scored)" />
                    <Line type="monotone" dataKey="goals_conceded" stroke="var(--color-goals_conceded)" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader className="border-b bg-footylabs-darkblue text-white">
          <CardTitle>Win Rate</CardTitle>
          <CardDescription className="text-white/80">Current season win percentage</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="text-5xl font-bold text-footylabs-blue">{winRate}%</div>
            <p className="text-sm text-muted-foreground">{totalWins} wins in {totalMatches} matches</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader className="border-b bg-footylabs-darkblue text-white">
          <CardTitle>Goals Per Game</CardTitle>
          <CardDescription className="text-white/80">Average goals scored per match</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="text-5xl font-bold text-footylabs-blue">{goalsPerGame}</div>
            <p className="text-sm text-muted-foreground">{totalGoals} goals in {totalMatches} matches</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader className="border-b bg-footylabs-darkblue text-white">
          <CardTitle>Clean Sheets</CardTitle>
          <CardDescription className="text-white/80">Matches without conceding</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="text-5xl font-bold text-footylabs-blue">{cleanSheets}</div>
            <p className="text-sm text-muted-foreground">{cleanSheetPercentage}% of all matches</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

