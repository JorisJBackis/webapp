"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  Tooltip,
} from "recharts"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Define types for the team match stats
type TeamMatchStats = {
  id: number
  team_id: number
  match_id: string
  date: string
  stats: {
    goals?: number
    [key: string]: any
  }
}

// Define the processed match data type
type ProcessedMatch = {
  match_id: string
  date: string
  month: string
  goals_scored: number
  goals_conceded: number
  result: "win" | "loss" | "draw"
}

// Define the monthly performance data type for the chart
type MonthlyPerformanceData = {
  month: string
  wins: number
  draws: number
  losses: number
  goalsScored: number
  goalsConceded: number
}

export default function PerformanceOverview({ clubId }: { clubId?: number }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [performanceData, setPerformanceData] = useState<MonthlyPerformanceData[]>([])
  const [winRate, setWinRate] = useState<number>(0)
  const [goalsPerGame, setGoalsPerGame] = useState<number>(0)
  const [cleanSheets, setCleanSheets] = useState<number>(0)
  const [totalMatches, setTotalMatches] = useState<number>(0)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const supabase = createClient()

  // Helper function to safely extract goals from stats
  const extractGoals = (stats: any): number => {
    if (!stats) return 0

    // Try different possible paths to find goals in the stats object
    if (typeof stats.goals === "number") return stats.goals
    if (typeof stats.Goals === "number") return stats.Goals
    if (typeof stats.score === "number") return stats.score
    if (typeof stats.Score === "number") return stats.Score

    // If we can't find goals, log the stats object for debugging
    console.log("Could not find goals in stats:", stats)
    return 0
  }

  // Helper function to format date and extract month
  const formatDateAndGetMonth = (dateString: string): { formattedDate: string; month: string } => {
    try {
      const date = new Date(dateString)
      const formattedDate = date.toISOString().split("T")[0] // YYYY-MM-DD
      const month = date.toLocaleString("default", { month: "short" })
      return { formattedDate, month }
    } catch (error) {
      console.error("Error formatting date:", dateString, error)
      return { formattedDate: dateString, month: "Unknown" }
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!clubId) return

      setLoading(true)
      setError(null)

      try {
        // Fetch all match stats for the team
        const { data: teamMatches, error: teamMatchesError } = await supabase
          .from("team_match_stats")
          .select("*")
          .eq("team_id", clubId)

        if (teamMatchesError) throw teamMatchesError

        if (!teamMatches || teamMatches.length === 0) {
          setLoading(false)
          setDebugInfo("No team matches found")
          return // No matches found
        }

        console.log("Team matches:", teamMatches)
        setDebugInfo(`Found ${teamMatches.length} team matches`)

        // Get all unique match IDs
        const matchIds = [...new Set(teamMatches.map((match) => match.match_id))]

        // Fetch all match stats for these matches (including opponents)
        const { data: allMatchStats, error: allMatchStatsError } = await supabase
          .from("team_match_stats")
          .select("*")
          .in("match_id", matchIds)

        if (allMatchStatsError) throw allMatchStatsError

        if (!allMatchStats || allMatchStats.length === 0) {
          setLoading(false)
          setDebugInfo("No match stats found")
          return // No match stats found
        }

        console.log("All match stats:", allMatchStats)
        setDebugInfo(`Found ${allMatchStats.length} total match stats`)

        // Process the matches to get complete match data
        const processedMatches: ProcessedMatch[] = []
        let debugMatches = ""

        for (const match of teamMatches) {
          // Find the opponent's stats for this match
          const opponentStats = allMatchStats.find(
            (stat) => stat.match_id === match.match_id && stat.team_id !== clubId,
          )

          if (opponentStats) {
            const { month } = formatDateAndGetMonth(match.date)

            const goalsScored = extractGoals(match.stats)
            const goalsConceded = extractGoals(opponentStats.stats)

            let result: "win" | "loss" | "draw"
            if (goalsScored > goalsConceded) {
              result = "win"
            } else if (goalsScored < goalsConceded) {
              result = "loss"
            } else {
              result = "draw"
            }

            processedMatches.push({
              match_id: match.match_id,
              date: match.date,
              month,
              goals_scored: goalsScored,
              goals_conceded: goalsConceded,
              result,
            })

            debugMatches += `Match ${match.match_id}: Scored ${goalsScored}, Conceded ${goalsConceded}, Result: ${result}, Month: ${month}\n`
          }
        }

        console.log("Processed matches:", processedMatches)
        setDebugInfo(debugMatches)

        // Calculate statistics
        const totalMatches = processedMatches.length
        const wins = processedMatches.filter((match) => match.result === "win").length
        const draws = processedMatches.filter((match) => match.result === "draw").length
        const losses = processedMatches.filter((match) => match.result === "loss").length

        const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0

        const totalGoalsScored = processedMatches.reduce((sum, match) => sum + match.goals_scored, 0)
        const goalsPerGame = totalMatches > 0 ? Number.parseFloat((totalGoalsScored / totalMatches).toFixed(1)) : 0

        const cleanSheets = processedMatches.filter((match) => match.goals_conceded === 0).length

        // Group by month for the chart data
        const monthlyData: { [key: string]: MonthlyPerformanceData } = {}

        processedMatches.forEach((match) => {
          if (!monthlyData[match.month]) {
            monthlyData[match.month] = {
              month: match.month,
              wins: 0,
              draws: 0,
              losses: 0,
              goalsScored: 0,
              goalsConceded: 0,
            }
          }

          if (match.result === "win") monthlyData[match.month].wins++
          else if (match.result === "draw") monthlyData[match.month].draws++
          else if (match.result === "loss") monthlyData[match.month].losses++

          monthlyData[match.month].goalsScored += match.goals_scored
          monthlyData[match.month].goalsConceded += match.goals_conceded
        })

        // Convert to array and sort by month
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const chartData = Object.values(monthlyData).sort((a, b) => months.indexOf(a.month) - months.indexOf(b.month))

        console.log("Chart data:", chartData)

        // Update state with the calculated data
        setPerformanceData(chartData)
        setWinRate(winRate)
        setGoalsPerGame(goalsPerGame)
        setCleanSheets(cleanSheets)
        setTotalMatches(totalMatches)

        setDebugInfo(
          (prev) => prev + `\nStats: Wins ${wins}, Draws ${draws}, Losses ${losses}, Clean Sheets ${cleanSheets}`,
        )
      } catch (err: any) {
        console.error("Error fetching team match stats:", err)
        setError(`Failed to load performance data: ${err.message}`)
        setDebugInfo(`Error: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [clubId, supabase])

  // Custom tooltip for the charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="font-medium">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="col-span-full border-0 shadow-md">
        <CardHeader className="border-b bg-gray-100">
          <CardTitle className="text-[#31348D]">Season Performance</CardTitle>
          <CardDescription className="text-black/70">
            Overview of match results and goals for the current season
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#31348D]" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : performanceData.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center flex-col">
              <p className="text-muted-foreground">No match data available</p>
              {process.env.NODE_ENV === "development" && (
                <pre className="text-xs mt-4 p-2 bg-gray-100 rounded max-h-40 overflow-auto">{debugInfo}</pre>
              )}
            </div>
          ) : (
            <Tabs defaultValue="results" className="space-y-4">
              <TabsList className="bg-gray-100 text-black">
                <TabsTrigger
                  value="results"
                  className="data-[state=active]:bg-[#31348D] data-[state=active]:text-white"
                >
                  Match Results
                </TabsTrigger>
                <TabsTrigger value="goals" className="data-[state=active]:bg-[#31348D] data-[state=active]:text-white">
                  Goals
                </TabsTrigger>
              </TabsList>
              <TabsContent value="results" className="space-y-4">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="wins" name="Wins" stackId="a" fill="#22c55e" />
                      <Bar dataKey="draws" name="Draws" stackId="a" fill="#f97316" />
                      <Bar dataKey="losses" name="Losses" stackId="a" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              <TabsContent value="goals" className="space-y-4">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="goalsScored"
                        name="Goals Scored"
                        stroke="#3949AB"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="goalsConceded"
                        name="Goals Conceded"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader className="border-b bg-gray-100">
          <CardTitle className="text-[#31348D]">Win Rate</CardTitle>
          <CardDescription className="text-black/70">Current season win percentage</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#31348D]" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="text-5xl font-bold text-footylabs-newblue">{winRate}%</div>
              <p className="text-sm text-muted-foreground">
                {totalMatches > 0
                  ? `${performanceData.reduce((sum, month) => sum + month.wins, 0)} wins in ${totalMatches} matches`
                  : "No matches played"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader className="border-b bg-gray-100">
          <CardTitle className="text-[#31348D]">Goals Per Game</CardTitle>
          <CardDescription className="text-black/70">Average goals scored per match</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#31348D]" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="text-5xl font-bold text-footylabs-newblue">{goalsPerGame}</div>
              <p className="text-sm text-muted-foreground">
                {totalMatches > 0
                  ? `${performanceData.reduce((sum, month) => sum + month.goalsScored, 0)} goals in ${totalMatches} matches`
                  : "No matches played"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader className="border-b bg-gray-100">
          <CardTitle className="text-[#31348D]">Clean Sheets</CardTitle>
          <CardDescription className="text-black/70">Matches without conceding</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#31348D]" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="text-5xl font-bold text-footylabs-newblue">{cleanSheets}</div>
              <p className="text-sm text-muted-foreground">
                {totalMatches > 0
                  ? `${Math.round((cleanSheets / totalMatches) * 100)}% of all matches`
                  : "No matches played"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
