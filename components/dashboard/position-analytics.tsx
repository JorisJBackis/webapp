"use client"

import { useState,useEffect } from "react"
import { Bar,Line,XAxis,YAxis,CartesianGrid,Tooltip,Legend,ResponsiveContainer,ComposedChart } from "recharts"
import { Info } from "lucide-react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { createClient } from "@/lib/supabase/client";

interface PositionData {
  position: number
  stats:
  | string
  | {
    "Goals Scored (Įv +)": number
    "Goals Conceded (Įv -)": number
    "Points": number
  }
}

interface ChartData {
  position: number
  goalsScored: number
  goalsConceded: number
  points: number
}

interface TeamStanding {
  rank: number
  teamId: number
  teamName: string
  matchesPlayed: number
  actualPoints: number
  currentExpectedPoints: number
  expectedPoints: number
  isUserTeam?: boolean
  hasMonteCarloData?: boolean
}

interface LuckyUnluckyGame {
  match_id: string
  match_date: string
  user_team_name: string
  opponent_team_name: string
  result: string
  user_goals: number
  opp_goals: number
  user_shots: number
  opp_shots: number
  user_shots_on_target: number
  opp_shots_on_target: number
  user_xg: number
  opp_xg: number
  user_expected_points: number
  opp_expected_points: number
  user_points_earned: number
  opp_points_earned: number
  luck: number
}

interface PositionAnalyticsProps {
  positionData: PositionData[]
  clubId?: number
}

export default function PositionAnalytics({ positionData,clubId }: PositionAnalyticsProps) {
  const [chartData,setChartData] = useState<ChartData[]>([])
  const [teamStandings,setTeamStandings] = useState<TeamStanding[]>([])
  const [isLoading,setIsLoading] = useState(true)
  const [leagueName,setLeagueName] = useState<string | null>(null)
  const [leagueData,setLeagueData] = useState<Map<string,{ total_games: number | null }>>(new Map())
  const [luckyUnluckyGames,setLuckyUnluckyGames] = useState<{
    lucky: LuckyUnluckyGame[]
    unlucky: LuckyUnluckyGame[]
  }>({ lucky: [],unlucky: [] })

  const supabase = createClient();

  useEffect(() => {
    if (positionData && positionData.length > 0) {
      try {
        const processedData = positionData.map((item) => {
          let stats: any

          if (typeof item.stats === "string") {
            try {
              stats = JSON.parse(item.stats)
            } catch (e) {
              console.error("Error parsing stats JSON:",e)
              stats = {}
            }
          } else {
            stats = item.stats
          }

          return {
            position: item.position,
            goalsScored: Number.parseFloat(stats["Goals Scored (Įv +)"]?.toString() || "0"),
            goalsConceded: Number.parseFloat(stats["Goals Conceded (Įv -)"]?.toString() || "0"),
            points: Number.parseFloat(stats["Points"]?.toString() || "0"),
          }
        })

        setChartData(processedData)
      } catch (error) {
        console.error("Error processing position data:",error)
      }
    }
  },[positionData])

  useEffect(() => {
    const fetchLeagueData = async () => {
      if (!supabase) return;
      const { data,error } = await supabase
        .from('leagues')
        .select('name, total_games_per_season');

      if (error) {
        console.error("Could not fetch league data:",error);
        return;
      }

      const leagueMap = new Map(
        data.map(league => [league.name,{ total_games: league.total_games_per_season }])
      );
      setLeagueData(leagueMap);
    };
    fetchLeagueData();
  },[supabase]);

  useEffect(() => {
    async function fetchTeamStandings() {

      console.log("=== STARTING TEAM STANDINGS FETCH ===")
      console.log(`Club ID: ${clubId}`)

      setIsLoading(true)

      try {
        let userLeague: string | null = null

        if (clubId) {
          console.log("Fetching user team league...")
          const { data: userTeam,error: userTeamError } = await supabase
            .from("clubs")
            .select("league")
            .eq("id",clubId)
            .single()

          if (userTeamError) {
            console.error("Error fetching user team:",userTeamError)
          } else if (userTeam && userTeam.league) {
            userLeague = userTeam.league
            setLeagueName(userLeague)
            console.log(`User team league: ${userLeague}`)
          } else {
            console.log("No league found for user team")
          }
        } else {
          console.log("No clubId provided, will show all teams")
        }

        console.log("Fetching team metrics data...")
        const { data: teamMetrics,error: metricsError } = await supabase
          .from("team_metrics_aggregated")
          .select('*')
          .not("team_id","is",null)

        if (metricsError) {
          console.error("Error fetching team metrics:",metricsError)
          throw metricsError
        }

        console.log(`Found ${teamMetrics?.length || 0} teams in metrics data`)

        if (!teamMetrics || teamMetrics.length === 0) {
          console.log("No team  data found, aborting")
          setTeamStandings([])
          setIsLoading(false)
          return
        }

        let filteredTeamMetrics = teamMetrics

        if (userLeague) {
          filteredTeamMetrics = teamMetrics.filter((team) => team.League === userLeague)
          console.log(`Filtered to ${filteredTeamMetrics.length} teams in league: ${userLeague}`)
        }

        console.log("[DEBUG 1] Team IDs after league filter:",filteredTeamMetrics.map(t => t.team_id));

        if (filteredTeamMetrics.length === 0) {
          console.log("No teams found in the user's league, showing all teams instead")
          filteredTeamMetrics = teamMetrics
        }

        const metricTeamIds = filteredTeamMetrics.filter((team) => team.team_id !== null).map((team) => Number(team.team_id))

        console.log(`Working with ${metricTeamIds.length} team IDs`)

        console.log("Fetching club data for team names...")
        const { data: clubsData,error: clubsError } = await supabase
          .from("clubs")
          .select("id, name")
          .in("id",metricTeamIds)

        if (clubsError) {
          console.error("Error fetching clubs data:",clubsError)
          throw clubsError
        }

        console.log(`Found ${clubsData?.length || 0} teams with club data`)

        const teamNameMap: Record<number,string> = {}
        clubsData?.forEach((club) => {
          if (club.id) {
            teamNameMap[club.id] = club.name || `Team ${club.id}`
          }
        })

        console.log("Fetching match data...")
        const { data: matchData,error: matchError } = await supabase
          .from("team_match_stats")
          .select("team_id, match_id")
          .in("team_id",metricTeamIds)

        if (matchError) {
          console.error("Error fetching match data:",matchError)
          throw matchError
        }

        console.log(`Found ${matchData?.length || 0} matches for filtered teams`)
        const receivedTeamIds = [...new Set(matchData?.map(m => m.team_id))];
        console.log("[DEBUG 2] Unique team IDs found in 'team_match_stats':",receivedTeamIds);

        const matchCountByTeam: Record<number,number> = {}
        matchData?.forEach((match) => {
          if (match.team_id === null) return

          const teamId = Number(match.team_id);

          if (!isNaN(teamId)) {
            if (!matchCountByTeam[teamId]) {
              matchCountByTeam[teamId] = 0
            }
            matchCountByTeam[teamId]++
          }
        })

        console.log(`Created match counts for ${Object.keys(matchCountByTeam).length} teams`)
        console.log("[DEBUG 3] Match counts per team ID:",matchCountByTeam);
        const teamsWithMatches = Object.keys(matchCountByTeam).length

        if (teamsWithMatches === 0) {
          console.log("No teams have any matches, aborting")
          setTeamStandings([])
          setIsLoading(false)
          return
        }

        console.log("Fetching previous years positions data...")
        const { data: previousYearsData,error: previousYearsError } = await supabase
          .from("previous_years_positions")
          .select("team_id, Points")
          .in("team_id",metricTeamIds)

        if (previousYearsError) {
          console.error("Error fetching previous years data:",previousYearsError)
          throw previousYearsError
        }

        console.log(`Found ${previousYearsData?.length || 0} previous years records`)

        const avgPointsByTeam: Record<number,number> = {}
        previousYearsData?.forEach((record) => {
          if (record.team_id === null) return

          const teamId = record.team_id as number
          const points = Number.parseFloat(record.Points?.toString() || "0")

          if (!avgPointsByTeam[teamId]) {
            avgPointsByTeam[teamId] = 0
          }
          avgPointsByTeam[teamId] += points
        })

        Object.keys(avgPointsByTeam).forEach((teamId) => {
          const teamIdNum = Number(teamId)
          const totalPoints = avgPointsByTeam[teamIdNum]
          const recordCount = previousYearsData?.filter(record => record.team_id === teamIdNum).length || 1
          avgPointsByTeam[teamIdNum] = totalPoints / recordCount
        })

        console.log(`Calculated average points for ${Object.keys(avgPointsByTeam).length} teams`)

        console.log("Processing team metrics and calculating expected points...")

        const validTeams = filteredTeamMetrics.filter((team) => {
          if (!team.team_id) {
            console.log(`[DEBUG] Skipping team with no team_id:`,team);
            return false
          }

          const teamId = Number(team.team_id);
          const matchCount = matchCountByTeam[teamId] || 0

          if (matchCount === 0) {
            console.log(`Skipping team ID ${teamId} - no matches found`)
            return false
          }

          const pointsEarned = team["Points Earned"]
          if (pointsEarned === null || pointsEarned === undefined) {
            console.log(`Skipping team ID ${teamId} - null or undefined points earned`)
            return false
          }

          return true
        })

        console.log(`Found ${validTeams.length} valid teams with matches and points data`)
        console.log("[DEBUG 4] 'validTeams' IDs remaining:",validTeams.map(t => t.team_id));
        const standings = validTeams
          .map((team) => {
            const teamId = team.team_id as number
            const matchCount = matchCountByTeam[teamId] || 0
            const teamName = teamNameMap[teamId] || (team.Team as string) || `Team ${teamId}`

            let pointsEarned: number
            const pointsEarnedValue = (team as any)["Points Earned"]
            if (typeof pointsEarnedValue === "number") {
              pointsEarned = pointsEarnedValue
            } else {
              pointsEarned = Number.parseFloat(pointsEarnedValue?.toString() || "0")
            }

            if (isNaN(pointsEarned)) {
              return null
            }

            const leagueForThisTeam = team.League as string;

            const totalGamesInSeason = leagueData.get(leagueForThisTeam)?.total_games || 38;
            const currentFormPoints = (pointsEarned / matchCount) * totalGamesInSeason;
            const avgPoints = avgPointsByTeam[teamId] || 0

            let expectedPoints: number
            if (avgPoints === null || avgPoints === 0) {
              expectedPoints = currentFormPoints
            } else {
              expectedPoints = (0.9 * currentFormPoints) + (0.1 * avgPoints)
            }

            const roundedPoints = Math.round(expectedPoints)

            const dbExpectedPoints = team["Expected Points"]

            const roundedDbExpectedPoints = dbExpectedPoints ? Math.round(Number(dbExpectedPoints)) : null
            const hasMonteCarloData = dbExpectedPoints !== null && dbExpectedPoints !== undefined

            return {
              teamId,
              teamName,
              matchesPlayed: matchCount,
              actualPoints: Math.round(pointsEarned),
              currentExpectedPoints: roundedDbExpectedPoints || Math.round(pointsEarned),
              expectedPoints: roundedPoints,
              isUserTeam: clubId ? teamId === clubId : false,
              hasMonteCarloData,
            }
          })
          .filter((team): team is NonNullable<typeof team> => team !== null)

        console.log(`After processing, have ${standings.length} teams with valid expected points`)

        if (standings.length === 0) {
          console.log("No teams with valid expected points, aborting")
          setTeamStandings([])
          setIsLoading(false)
          return
        }

        const sortedStandings = standings
          .sort((a,b) => b.expectedPoints - a.expectedPoints)
          .map((team,index) => ({
            ...team,
            rank: index + 1,
          }))

        console.log(`Final standings: ${sortedStandings.length} teams`)

        setTeamStandings(sortedStandings)
      } catch (error) {
        console.error("Error fetching team standings:",error)
      } finally {
        setIsLoading(false)
        console.log("=== FINISHED TEAM STANDINGS FETCH ===")
      }
    }

    fetchTeamStandings()
  },[supabase,clubId,leagueData])

  // Fetch lucky/unlucky games
  useEffect(() => {
    const fetchLuckyUnluckyGames = async () => {
      if (!clubId) return;

      try {
        const { data: userMatches,error: userError } = await supabase
          .from('team_match_stats')
          .select('match_id, date, stats')
          .eq('team_id',clubId)
          .order('date',{ ascending: false });

        if (userError) {
          console.error('Error fetching user matches:',userError);
          return;
        }

        if (!userMatches || userMatches.length === 0) {
          setLuckyUnluckyGames({ lucky: [],unlucky: [] });
          return;
        }

        const processedMatches: LuckyUnluckyGame[] = await Promise.all(
          userMatches.map(async (match: any) => {
            try {
              // Parse match_id: "Team1 - Team2 Score" e.g., "Banga - Siauliai 1:2"
              const matchIdParts = match.match_id.split(' - ');
              if (matchIdParts.length !== 2) {
                console.error('Invalid match_id format:',match.match_id);
                return null;
              }

              const team1Name = matchIdParts[0].trim();
              const secondPart = matchIdParts[1];
              const scoreMatch = secondPart.match(/^(.+?)\s+(\d+):(\d+)$/);

              if (!scoreMatch) {
                console.error('Could not parse score from:',secondPart);
                return null;
              }

              const team2Name = scoreMatch[1].trim();
              const team1ExpectedScore = parseInt(scoreMatch[2],10);
              const team2ExpectedScore = parseInt(scoreMatch[3],10);

              // Fetch user stats
              let userStats: any = {};
              if (typeof match.stats === 'string') {
                userStats = JSON.parse(match.stats);
              } else {
                userStats = match.stats;
              }

              // Fetch opponent stats
              const { data: opponentMatches,error: oppError } = await supabase
                .from('team_match_stats')
                .select('stats, team_id')
                .eq('match_id',match.match_id)
                .neq('team_id',clubId)
                .limit(1);

              if (oppError || !opponentMatches || opponentMatches.length === 0) {
                console.error('Could not find opponent stats for match:',match.match_id);
                return null;
              }

              let opponentStats: any = {};
              if (typeof opponentMatches[0].stats === 'string') {
                opponentStats = JSON.parse(opponentMatches[0].stats);
              } else {
                opponentStats = opponentMatches[0].stats;
              }

              // Use match_id scores for display
              const userGoals = team1ExpectedScore;
              const oppGoals = team2ExpectedScore;

              // Determine match result from Points Earned (source of truth for result)
              const userPointsEarned = parseFloat(userStats['Points Earned']?.toString() || '0');
              let userResult = '';
              if (userPointsEarned >= 3) userResult = 'W';      // 3 points = win
              else if (userPointsEarned === 1) userResult = 'D'; // 1 point = draw
              else userResult = 'L';                              // 0 points = loss

              // Extract all stats
              const userShots = userStats['Total Shots'] || 0;
              const oppShots = opponentStats['Total Shots'] || 0;
              const userShotsOnTarget = userStats['Shots on Target'] || 0;
              const oppShotsOnTarget = opponentStats['Shots on Target'] || 0;
              const userXG = parseFloat(userStats['xG']?.toString() || '0');
              const oppXG = parseFloat(opponentStats['xG']?.toString() || '0');
              const userExpectedPoints = parseFloat(userStats['Expected Points']?.toString() || '0');
              const oppExpectedPoints = parseFloat(opponentStats['Expected Points']?.toString() || '0');
              const oppPointsEarned = parseFloat(opponentStats['Points Earned']?.toString() || '0');

              const userLuck = userPointsEarned - userExpectedPoints;

              return {
                match_id: match.match_id,
                match_date: match.date,
                user_team_name: team1Name,
                opponent_team_name: team2Name,
                result: userResult,
                user_goals: userGoals,
                opp_goals: oppGoals,
                user_shots: userShots,
                opp_shots: oppShots,
                user_shots_on_target: userShotsOnTarget,
                opp_shots_on_target: oppShotsOnTarget,
                user_xg: userXG,
                opp_xg: oppXG,
                user_expected_points: userExpectedPoints,
                opp_expected_points: oppExpectedPoints,
                user_points_earned: userPointsEarned,
                opp_points_earned: oppPointsEarned,
                luck: userLuck,
              } as LuckyUnluckyGame;
            } catch (error) {
              console.error('Error processing match:',match.match_id,error);
              return null;
            }
          })
        );

        const validMatches = processedMatches.filter(
          (m): m is LuckyUnluckyGame => m !== null
        );

        if (validMatches.length === 0) {
          setLuckyUnluckyGames({ lucky: [],unlucky: [] });
          return;
        }

        const sorted = validMatches.sort((a,b) => b.luck - a.luck);
        const lucky = sorted.slice(0,3);
        const unlucky = sorted.slice(-3).reverse();

        setLuckyUnluckyGames({ lucky,unlucky });
      } catch (error) {
        console.error('Error in fetchLuckyUnluckyGames:',error);
      }
    };

    fetchLuckyUnluckyGames();
  },[clubId,supabase])

  const totalGamesInSeason = leagueData.get(leagueName || "")?.total_games || 38;

  // Helper function to get badge color based on result
  const getResultBadgeColor = (result: string) => {
    switch (result) {
      case 'W':
        return 'bg-green-600';
      case 'L':
        return 'bg-red-600';
      case 'D':
        return 'bg-gray-500'; // Gray for draws
      default:
        return 'bg-gray-400';
    }
  };

  // Helper function to get header color based on result
  const getHeaderBgColor = (result: string) => {
    switch (result) {
      case 'W':
        return 'bg-green-50';
      case 'L':
        return 'bg-red-50';
      case 'D':
        return 'bg-gray-50'; // Gray for draws
      default:
        return 'bg-gray-50';
    }
  };

  // Helper function to get border color based on result
  const getBorderColor = (result: string) => {
    switch (result) {
      case 'W':
        return 'border-green-200';
      case 'L':
        return 'border-red-200';
      case 'D':
        return 'border-gray-200'; // Gray for draws
      default:
        return 'border-gray-200';
    }
  };

  if (chartData.length === 0 || isLoading) {
    return <div className="text-center py-8">Loading data...</div>
  }

  return (
    <div className="space-y-8">
      {/* Main combined chart */}
      <div className="h-96">
        <h3 className="text-lg font-medium mb-2">Performance Metrics by League Position</h3>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20,right: 30,left: 20,bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="position"
              label={{
                value: "League Position",
                position: "insideBottom",
                offset: -5,
              }}
            />
            <YAxis yAxisId="left" label={{ value: "Goals",angle: -90,position: "insideLeft" }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0,"dataMax + 10"]}
              label={{ value: "Points",angle: 90,position: "insideRight" }}
            />
            <Tooltip
              formatter={(value,name) => {
                if (name === "points") return [`${value} points`,"Points"];
                if (name === "goalsScored") return [`${value} goals`,"Goals Scored"];
                if (name === "goalsConceded") return [`${value} goals`,"Goals Conceded"];
                return [value,name];
              }}
              labelFormatter={(label) => `Position: ${label}`}
              content={({ active,payload,label }) => {
                if (!active || !payload?.length) return null;

                return (
                  <div className="bg-background p-3 border rounded shadow-xs">
                    <p className="font-medium text-foreground">{label && `Position: ${label}`}</p>
                    {payload.map((entry,index) => {
                      const displayName = entry.name === "points"
                        ? "Points"
                        : entry.name === "goalsScored"
                          ? "Goals Scored"
                          : entry.name === "goalsConceded"
                            ? "Goals Conceded"
                            : entry.name;

                      const displayValue = typeof entry.value === "number"
                        ? entry.value.toFixed(2)
                        : entry.value;

                      return (
                        <p key={index} className="text-muted-foreground">
                          {displayName}: {displayValue}
                        </p>
                      );
                    })}
                  </div>
                );
              }}
            />

            <Legend wrapperStyle={{
              position: "relative",
            }} />
            <Bar yAxisId="right" dataKey="points" fill="#3182CE" opacity={0.7} barSize={30} name="Points" />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="goalsScored"
              stroke="#38A169"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 8 }}
              name="Goals Scored"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="goalsConceded"
              stroke="#E53E3E"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 8 }}
              name="Goals Conceded"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Expected Season Standings Table */}
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">
          Expected Season Standings {leagueName ? `- ${leagueName}` : "(All Teams)"}
        </h3>
        {teamStandings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-background rounded-lg overflow-hidden shadow-xs">
              <thead className="bg-muted text-muted-foreground!">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1">
                      <span>Matches<br />Played</span>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Info
                            className="h-3 w-3 text-gray-400 cursor-help opacity-60 hover:opacity-100 transition-opacity" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-60 text-xs">
                          <p>Games completed so far this season</p>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1">
                      <span>Actual<br />Points</span>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Info
                            className="h-3 w-3 text-gray-400 cursor-help opacity-60 hover:opacity-100 transition-opacity" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-60 text-xs">
                          <p>Points earned in the current season</p>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1">
                      <span>Current<br />Expected</span>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Info
                            className="h-3 w-3 text-gray-400 cursor-help opacity-60 hover:opacity-100 transition-opacity" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-60 text-xs">
                          <p>Based on your xG and performance metrics, this is how your current points should look</p>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1">
                      <span>Final<br />Expected</span>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Info
                            className="h-3 w-3 text-gray-400 cursor-help opacity-60 hover:opacity-100 transition-opacity" />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-60 text-xs">
                          <p>Projected total points by end of season based on current form</p>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {teamStandings.map((team) => (
                  <tr
                    key={team.teamId}
                    className={`${team.isUserTeam ? "bg-blue-50 dark:bg-blue-950" : team.rank % 2 === 0 ? "bg-muted" : "bg-background"} hover:bg-muted/50`}
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-muted-foreground">{team.rank}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {team.isUserTeam ? <span className="font-semibold">{team.teamName}</span> : team.teamName}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground text-center">
                      {team.matchesPlayed}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground text-center font-medium">
                      {team.actualPoints}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground text-center">
                      {!team.hasMonteCarloData ? (
                        <span className="text-gray-400">N/A</span>
                      ) : (
                        team.currentExpectedPoints
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground text-center font-medium">
                      {team.expectedPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 bg-muted rounded-lg">
            {isLoading ? "Loading standings data..." : "No standings data available. Check console for detailed logs."}
          </div>
        )}
        <div className="mt-4 space-y-1">
          <p className="text-xs text-muted-foreground">
            <strong>Matches Played:</strong> Games completed so far this season
          </p>
          <p className="text-xs text-muted-foreground">
            <strong>Actual Points:</strong> Points earned in current season
          </p>
          <p className="text-xs text-muted-foreground">
            <strong>Current Expected:</strong> Monte Carlo simulation based on current form
          </p>
          <p className="text-xs text-muted-foreground">
            <strong>Final Expected:</strong> Projected points for full {totalGamesInSeason}-match season
          </p>
        </div>
      </div>

      {/* Lucky/Unlucky Games Section */}
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-6">
          View your 3 most lucky/unlucky games
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Unlucky Games */}
          <div>
            <h4 className="font-semibold mb-4 text-red-600 text-base">Most Unlucky (Underperformed)</h4>
            <div className="space-y-4">
              {luckyUnluckyGames.unlucky.length > 0 ? (
                luckyUnluckyGames.unlucky.map((match) => {
                  const matchDate = new Date(match.match_date);
                  const formattedDate = `${matchDate.getFullYear()}-${String(matchDate.getMonth() + 1).padStart(2,'0')}-${String(matchDate.getDate()).padStart(2,'0')}`;

                  return (
                    <div key={match.match_id} className={`bg-background rounded-lg border-2 ${getBorderColor(match.result)} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
                      {/* Header */}
                      <div className={`${getHeaderBgColor(match.result)} px-4 py-3 border-b ${getBorderColor(match.result)}`}>
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <p className="font-bold text-sm text-slate-800">
                              {match.user_team_name} vs {match.opponent_team_name}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">{formattedDate}</p>
                          </div>
                          <span className={`text-sm ${getResultBadgeColor(match.result)} text-white px-2.5 py-1.5 rounded font-bold whitespace-nowrap`}>
                            {match.result} {match.user_goals}-{match.opp_goals}
                          </span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="px-4 py-4">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          {/* User Team Stats */}
                          <div>
                            <p className="font-semibold text-sm text-slate-800 mb-3">{match.user_team_name}</p>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Shots</span>
                                <span className="font-semibold">{match.user_shots} ({match.user_shots_on_target} on target)</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Expected Goals</span>
                                <span className="font-semibold">{match.user_xg.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Expected Points</span>
                                <span className="font-semibold">{match.user_expected_points.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Points Earned</span>
                                <span className="font-semibold">{match.user_points_earned}</span>
                              </div>
                            </div>
                          </div>

                          {/* Opponent Stats */}
                          <div>
                            <p className="font-semibold text-sm text-slate-800 mb-3">{match.opponent_team_name}</p>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Shots</span>
                                <span className="font-semibold">{match.opp_shots} ({match.opp_shots_on_target} on target)</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Expected Goals</span>
                                <span className="font-semibold">{match.opp_xg.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Expected Points</span>
                                <span className="font-semibold">{match.opp_expected_points.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Points Earned</span>
                                <span className="font-semibold">{match.opp_points_earned}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Summary */}
                        <div className={`pt-3 border-t ${match.result === 'D' ? 'border-gray-100' : 'border-red-100'}`}>
                          <p className={`${match.result === 'D' ? 'text-gray-700' : 'text-red-700'} font-medium text-xs leading-relaxed`}>
                            📉 Underperformed by <span className="font-bold">{Math.abs(match.luck).toFixed(2)} pts</span> - You had better chances but failed to capitalize
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No matches yet</p>
              )}
            </div>
          </div>

          {/* Most Lucky Games */}
          <div>
            <h4 className="font-semibold mb-4 text-green-600 text-base">Most Lucky (Overperformed)</h4>
            <div className="space-y-4">
              {luckyUnluckyGames.lucky.length > 0 ? (
                luckyUnluckyGames.lucky.map((match) => {
                  const matchDate = new Date(match.match_date);
                  const formattedDate = `${matchDate.getFullYear()}-${String(matchDate.getMonth() + 1).padStart(2,'0')}-${String(matchDate.getDate()).padStart(2,'0')}`;

                  return (
                    <div key={match.match_id} className={`bg-background rounded-lg border-2 ${getBorderColor(match.result)} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
                      {/* Header */}
                      <div className={`${getHeaderBgColor(match.result)} px-4 py-3 border-b ${getBorderColor(match.result)}`}>
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <p className="font-bold text-sm text-slate-800">
                              {match.user_team_name} vs {match.opponent_team_name}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">{formattedDate}</p>
                          </div>
                          <span className={`text-sm ${getResultBadgeColor(match.result)} text-white px-2.5 py-1.5 rounded font-bold whitespace-nowrap`}>
                            {match.result} {match.user_goals}-{match.opp_goals}
                          </span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="px-4 py-4">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          {/* User Team Stats */}
                          <div>
                            <p className="font-semibold text-sm text-slate-800 mb-3">{match.user_team_name}</p>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Shots</span>
                                <span className="font-semibold">{match.user_shots} ({match.user_shots_on_target} on target)</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Expected Goals</span>
                                <span className="font-semibold">{match.user_xg.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Expected Points</span>
                                <span className="font-semibold">{match.user_expected_points.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Points Earned</span>
                                <span className="font-semibold">{match.user_points_earned}</span>
                              </div>
                            </div>
                          </div>

                          {/* Opponent Stats */}
                          <div>
                            <p className="font-semibold text-sm text-slate-800 mb-3">{match.opponent_team_name}</p>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Shots</span>
                                <span className="font-semibold">{match.opp_shots} ({match.opp_shots_on_target} on target)</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Expected Goals</span>
                                <span className="font-semibold">{match.opp_xg.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Expected Points</span>
                                <span className="font-semibold">{match.opp_expected_points.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Points Earned</span>
                                <span className="font-semibold">{match.opp_points_earned}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Summary */}
                        <div className={`pt-3 border-t ${match.result === 'D' ? 'border-gray-100' : 'border-green-100'}`}>
                          <p className={`${match.result === 'D' ? 'text-gray-700' : 'text-green-700'} font-medium text-xs leading-relaxed`}>
                            📈 Overperformed by <span className="font-bold">{match.luck.toFixed(2)} pts</span> - You made your chances count and got away with a strong result
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No matches yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
