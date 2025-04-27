"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

type GameStats = {
  match_id: string
  date: string
  team_id: number
  team_name?: string
  stats: {
    goals?: number
    "Conceded Goals"?: number
    xG?: number
    "Shots on Target"?: number
    "Total Shots"?: number
    "Possession %"?: number
    "Pass Accuracy"?: number
    "Duels Success %"?: number
    [key: string]: any
  }
}

export default function LastGameInsights({ clubId }: { clubId?: number }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastGame, setLastGame] = useState<GameStats | null>(null)
  const [opponentGame, setOpponentGame] = useState<GameStats | null>(null)
  const [comparisonData, setComparisonData] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!clubId) return

      try {
        setLoading(true)
        setError(null)

        // Fetch the last game for the logged-in team
        const { data: teamGames, error: teamGamesError } = await supabase
          .from("team_match_stats")
          .select("*")
          .eq("team_id", clubId)
          .order("date", { ascending: false })
          .limit(1)

        if (teamGamesError) throw new Error(`Error fetching team games: ${teamGamesError.message}`)

        if (!teamGames || teamGames.length === 0) {
          setError("No game data available for your team")
          setLoading(false)
          return
        }

        const lastTeamGame = teamGames[0]
        console.log("Last team game:", lastTeamGame)

        // Fetch the opponent's stats for the same game
        const { data: opponentGames, error: opponentGamesError } = await supabase
          .from("team_match_stats")
          .select("*")
          .eq("match_id", lastTeamGame.match_id)
          .neq("team_id", clubId)

        if (opponentGamesError) throw new Error(`Error fetching opponent games: ${opponentGamesError.message}`)

        if (!opponentGames || opponentGames.length === 0) {
          setError("No opponent data available for the last game")
          setLoading(false)
          return
        }

        const opponentGame = opponentGames[0]
        console.log("Opponent game:", opponentGame)

        // Fetch team names
        const { data: teams, error: teamsError } = await supabase
          .from("clubs")
          .select("id, name")
          .in("id", [clubId, opponentGame.team_id])

        if (teamsError) throw new Error(`Error fetching team names: ${teamsError.message}`)

        // Add team names to the game stats
        const teamName = teams?.find((t) => t.id === clubId)?.name || "Your Team"
        const opponentName = teams?.find((t) => t.id === opponentGame.team_id)?.name || "Opponent"

        const enhancedLastGame = {
          ...lastTeamGame,
          team_name: teamName,
        }

        const enhancedOpponentGame = {
          ...opponentGame,
          team_name: opponentName,
        }

        // Prepare comparison data for the chart
        const comparisonMetrics = [
          { name: "Pass Accuracy", key: "Pass Accuracy" },
          { name: "Duels Success", key: "Duels Success %" },
          { name: "Aerial Duels Success", key: "Aerial Duels Success %" },
          { name: "Set Piece Success", key: "Set Piece Success %" },
        ]

        const chartData = comparisonMetrics.map((metric) => {
          return {
            name: metric.name,
            team: Number.parseFloat(enhancedLastGame.stats[metric.key] || "0"),
            opponent: Number.parseFloat(enhancedOpponentGame.stats[metric.key] || "0"),
          }
        })

        setLastGame(enhancedLastGame)
        setOpponentGame(enhancedOpponentGame)
        setComparisonData(chartData)
        setLoading(false)
      } catch (err) {
        console.error("Error fetching last game data:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
        setLoading(false)
      }
    }

    fetchData()
  }, [clubId, supabase])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Last Game Insights</h2>
        <div className="flex h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#31348D]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Last Game Insights</h2>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!lastGame || !opponentGame) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Last Game Insights</h2>
        <p className="text-gray-500">No game data available</p>
      </div>
    )
  }

  // Extract stats for KPI cards
  const teamGoals = Number.parseFloat(lastGame.stats.goals || lastGame.stats.Goals || "0")
  const opponentGoals = Number.parseFloat(opponentGame.stats.goals || opponentGame.stats.Goals || "0")
  const teamXG = Number.parseFloat(lastGame.stats.xG || "0")
  const opponentXG = Number.parseFloat(opponentGame.stats.xG || "0")
  const teamShots = Number.parseFloat(lastGame.stats["Total Shots"] || "0")
  const opponentShots = Number.parseFloat(opponentGame.stats["Total Shots"] || "0")
  const possession = Number.parseFloat(lastGame.stats["Possession %"] || "0")

  // Format date
  const gameDate = new Date(lastGame.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Last Game Insights</h2>
        <div className="text-sm text-gray-500">
          {lastGame.team_name} vs {opponentGame.team_name} • {gameDate}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Score Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#31348D]">Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center">
              <div className="text-center px-3">
                <div className="text-3xl font-bold">{teamGoals}</div>
                <div className="text-xs text-gray-500">{lastGame.team_name}</div>
              </div>
              <div className="text-xl font-bold px-2">-</div>
              <div className="text-center px-3">
                <div className="text-3xl font-bold">{opponentGoals}</div>
                <div className="text-xs text-gray-500">{opponentGame.team_name}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* xG Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#31348D]">Expected Goals (xG)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center">
              <div className="text-center px-3">
                <div className="text-3xl font-bold">{teamXG.toFixed(2)}</div>
                <div className="text-xs text-gray-500">Your xG</div>
              </div>
              <div className="text-xl font-bold px-2">-</div>
              <div className="text-center px-3">
                <div className="text-3xl font-bold">{opponentXG.toFixed(2)}</div>
                <div className="text-xs text-gray-500">xG Against</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shots & Possession Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#31348D]">Shots & Possession</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {teamShots} - {opponentShots}
                </div>
                <div className="text-xs text-gray-500">Total Shots</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{possession}%</div>
                <div className="text-xs text-gray-500">Possession</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Performance Comparison</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => [`${value}%`, ""]} labelFormatter={(label) => `${label} %`} />
              <Legend />
              <Bar name={lastGame.team_name} dataKey="team" fill="#3949AB" barSize={30} />
              <Bar name={opponentGame.team_name} dataKey="opponent" fill="#ef4444" barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
