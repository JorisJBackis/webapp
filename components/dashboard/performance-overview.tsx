"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, BarChart, Bar } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// Sample data - replace with actual data from your API
const performanceData = [
  { month: "Jan", wins: 3, draws: 1, losses: 0, goalsScored: 10, goalsConceded: 3 },
  { month: "Feb", wins: 2, draws: 2, losses: 0, goalsScored: 8, goalsConceded: 4 },
  { month: "Mar", wins: 2, draws: 0, losses: 2, goalsScored: 7, goalsConceded: 6 },
  { month: "Apr", wins: 3, draws: 1, losses: 0, goalsScored: 9, goalsConceded: 2 },
  { month: "May", wins: 1, draws: 2, losses: 1, goalsScored: 5, goalsConceded: 5 },
]

export default function PerformanceOverview({ clubId }: { clubId?: number }) {
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
              <TabsTrigger value="results" className="data-[state=active]:bg-footylabs-blue">
                Match Results
              </TabsTrigger>
              <TabsTrigger value="goals" className="data-[state=active]:bg-footylabs-blue">
                Goals
              </TabsTrigger>
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
                  goalsScored: {
                    label: "Goals Scored",
                    color: "hsl(var(--chart-1))",
                  },
                  goalsConceded: {
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
                    <Line type="monotone" dataKey="goalsScored" stroke="var(--color-goalsScored)" />
                    <Line type="monotone" dataKey="goalsConceded" stroke="var(--color-goalsConceded)" />
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
            <div className="text-5xl font-bold text-footylabs-blue">67%</div>
            <p className="text-sm text-muted-foreground">12 wins in 18 matches</p>
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
            <div className="text-5xl font-bold text-footylabs-blue">2.3</div>
            <p className="text-sm text-muted-foreground">41 goals in 18 matches</p>
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
            <div className="text-5xl font-bold text-footylabs-blue">8</div>
            <p className="text-sm text-muted-foreground">44% of all matches</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

