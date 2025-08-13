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
    "Total Shots"?: number
    "Possession %"?: number
    [key: string]: any
  }
}

const StatCard = ({ title, valueLeft, valueRight, teamLeft, teamRight }: {
  title: string,
  valueLeft: string | number,
  valueRight?: string | number,
  teamLeft: string,
  teamRight?: string
}) => (
    <Card className="border-0 shadow-sm text-center">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-[#31348D]">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center items-center">
          <div className="px-3">
            <div className="text-4xl font-bold">{valueLeft}</div>
            <div className="text-xs text-gray-500 truncate" title={teamLeft}>{teamLeft}</div>
          </div>
          {valueRight !== undefined && teamRight && (
              <>
                <div className="text-xl font-bold px-2">-</div>
                <div className="px-3">
                  <div className="text-4xl font-bold">{valueRight}</div>
                  <div className="text-xs text-gray-500 truncate" title={teamRight}>{teamRight}</div>
                </div>
              </>
          )}
        </div>
      </CardContent>
    </Card>
);


export default function LastGameInsights({ clubId }: { clubId?: number }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [homeTeamGame, setHomeTeamGame] = useState<GameStats | null>(null)
  const [awayTeamGame, setAwayTeamGame] = useState<GameStats | null>(null)
  const [comparisonData, setComparisonData] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!clubId) { setLoading(false); return; }

      setLoading(true);
      setError(null);

      try {
        // <<< FIX: REVERT TO THE ORIGINAL, WORKING DATA FETCHING PATTERN >>>

        // Step 1: Fetch the last game for the logged-in team
        const { data: teamGames, error: teamGamesError } = await supabase
            .from("team_match_stats")
            .select("*")
            .eq("team_id", clubId)
            .order("date", { ascending: false })
            .limit(1);

        if (teamGamesError || !teamGames || teamGames.length === 0) {
          throw new Error(teamGamesError?.message || "No game data available for your team");
        }
        const lastTeamGame = teamGames[0];

        // Step 2: Fetch the opponent's stats for the same game
        const { data: opponentGames, error: opponentGamesError } = await supabase
            .from("team_match_stats")
            .select("*")
            .eq("match_id", lastTeamGame.match_id)
            .neq("team_id", clubId);

        if (opponentGamesError || !opponentGames || opponentGames.length === 0) {
          throw new Error(opponentGamesError?.message || "No opponent data for the last game");
        }
        const opponentGame = opponentGames[0];

        // Step 3: Fetch team names separately
        const { data: teams, error: teamsError } = await supabase
            .from("clubs")
            .select("id, name")
            .in("id", [clubId, opponentGame.team_id])

        if (teamsError) throw new Error(`Error fetching team names: ${teamsError.message}`)

        // <<< END OF THE FETCHING LOGIC REVERT >>>

        // Step 4: Assign team names and determine home/away
        const yourTeamName = teams?.find((t) => t.id === clubId)?.name || "Your Team";
        const opponentName = teams?.find((t) => t.id === opponentGame.team_id)?.name || "Opponent";

        const yourTeamData = { ...lastTeamGame, team_name: yourTeamName };
        const opponentData = { ...opponentGame, team_name: opponentName };

        const homeTeamNameFromMatchId = lastTeamGame.match_id.split(' - ')[0].trim();
        const isYourTeamHome = yourTeamName === homeTeamNameFromMatchId;

        const homeTeam = isYourTeamHome ? yourTeamData : opponentData;
        const awayTeam = isYourTeamHome ? opponentData : yourTeamData;

        // This is where the goals were being missed before. We now correctly set them.
        homeTeam.stats.goals = Number(homeTeam.stats?.goals || homeTeam.stats?.Goals || 0);
        awayTeam.stats.goals = Number(awayTeam.stats?.goals || awayTeam.stats?.Goals || 0);

        setHomeTeamGame(homeTeam);
        setAwayTeamGame(awayTeam);

        // Step 5: Prepare chart data
        const comparisonMetrics = [
          { name: "Pass Accuracy", key: "Pass Accuracy" },
          { name: "Duels Success", key: "Duels Success %" },
          { name: "Aerial Duels Success", key: "Aerial Duels Success %" },
          { name: "Set Piece Success", key: "Set Piece Success %" },
        ];

        const chartData = comparisonMetrics.map((metric) => ({
          name: metric.name,
          [homeTeam.team_name!]: Number.parseFloat(homeTeam.stats[metric.key] || "0"),
          [awayTeam.team_name!]: Number.parseFloat(awayTeam.stats[metric.key] || "0"),
        }));
        setComparisonData(chartData);

      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [clubId, supabase]);

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

  if (!homeTeamGame || !awayTeamGame) {
    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Last Game Insights</h2>
          <p className="text-gray-500">No game data available to display.</p>
        </div>
    )
  }

  // All the rendering logic from here down is correct and remains the same.
  const homeGoals = homeTeamGame.stats.goals;
  const awayGoals = awayTeamGame.stats.goals;
  const homeXG = Number.parseFloat(homeTeamGame.stats.xG || "0").toFixed(2);
  const awayXG = Number.parseFloat(awayTeamGame.stats.xG || "0").toFixed(2);
  const homeShots = Number.parseFloat(homeTeamGame.stats["Total Shots"] || "0");
  const awayShots = Number.parseFloat(awayTeamGame.stats["Total Shots"] || "0");
  const homePossession = Math.round(Number.parseFloat(homeTeamGame.stats["Possession %"] || "0"));
  const awayPossession = 100 - homePossession;

  const gameDate = new Date(homeTeamGame.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Last Game Insights</h2>
          <div className="text-sm text-gray-500">{homeTeamGame.team_name} vs {awayTeamGame.team_name} • {gameDate}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Score" valueLeft={homeGoals!} valueRight={awayGoals!} teamLeft={homeTeamGame.team_name!} teamRight={awayTeamGame.team_name!} />
          <StatCard title="Expected Goals (xG)" valueLeft={homeXG} valueRight={awayXG} teamLeft={homeTeamGame.team_name!} teamRight={awayTeamGame.team_name!} />
          <StatCard title="Total Shots" valueLeft={homeShots} valueRight={awayShots} teamLeft={homeTeamGame.team_name!} teamRight={awayTeamGame.team_name!} />
          <StatCard title="Possession" valueLeft={`${homePossession}%`} valueRight={`${awayPossession}%`} teamLeft={homeTeamGame.team_name!} teamRight={awayTeamGame.team_name!} />
        </div>

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
                <Bar name={homeTeamGame.team_name} dataKey={homeTeamGame.team_name} fill="#3949AB" barSize={30} />
                <Bar name={awayTeamGame.team_name} dataKey={awayTeamGame.team_name} fill="#ef4444" barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
  )
}