"use client"

import { useState, useEffect } from "react"
import { Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from "recharts"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/supabase/database.types"

interface PositionData {
  position: number
  stats:
    | string
    | {
        "Goals Scored (Įv +)": number
        "Goals Conceded (Įv -)": number
        Points: number
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
  expectedPoints: number
  isUserTeam?: boolean
}

interface PositionAnalyticsProps {
  positionData: PositionData[]
  clubId?: number
}

export default function PositionAnalytics({ positionData, clubId }: PositionAnalyticsProps) {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [teamStandings, setTeamStandings] = useState<TeamStanding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [leagueName, setLeagueName] = useState<string | null>(null)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    if (positionData && positionData.length > 0) {
      try {
        const processedData = positionData.map((item) => {
          let stats: any

          if (typeof item.stats === "string") {
            try {
              stats = JSON.parse(item.stats)
            } catch (e) {
              console.error("Error parsing stats JSON:", e)
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
        console.error("Error processing position data:", error)
      }
    }
  }, [positionData])

  useEffect(() => {
    async function fetchTeamStandings() {
      console.log("=== STARTING TEAM STANDINGS FETCH ===")
      console.log(`Club ID: ${clubId}`)

      setIsLoading(true)

      try {
        // Step 1: Get the user's team league if clubId is provided
        let userLeague: string | null = null

        if (clubId) {
          console.log("Fetching user team league...")
          const { data: userTeam, error: userTeamError } = await supabase
            .from("clubs")
            .select("league")
            .eq("id", clubId)
            .single()

          if (userTeamError) {
            console.error("Error fetching user team:", userTeamError)
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

        // Step 2: Fetch team metrics data
        console.log("Fetching team metrics data...")
        const { data: teamMetrics, error: metricsError } = await supabase
          .from("team_metrics_aggregated")
          .select('team_id, Team, "Points Earned", League')
          .not("team_id", "is", null)

        if (metricsError) {
          console.error("Error fetching team metrics:", metricsError)
          throw metricsError
        }

        console.log(`Found ${teamMetrics?.length || 0} teams in metrics data`)

        if (!teamMetrics || teamMetrics.length === 0) {
          console.log("No team metrics data found, aborting")
          setTeamStandings([])
          setIsLoading(false)
          return
        }

        // Step 3: Filter teams by league if userLeague is available
        let filteredTeamMetrics = teamMetrics

        if (userLeague) {
          filteredTeamMetrics = teamMetrics.filter((team) => team.League === userLeague)
          console.log(`Filtered to ${filteredTeamMetrics.length} teams in league: ${userLeague}`)
        }

        if (filteredTeamMetrics.length === 0) {
          console.log("No teams found in the user's league, showing all teams instead")
          filteredTeamMetrics = teamMetrics
        }

        // Step 4: Get team IDs from filtered metrics data
        const metricTeamIds = filteredTeamMetrics.filter((team) => team.team_id !== null).map((team) => team.team_id)

        console.log(`Working with ${metricTeamIds.length} team IDs`)

        // Step 5: Fetch club data for team names
        console.log("Fetching club data for team names...")
        const { data: clubsData, error: clubsError } = await supabase
          .from("clubs")
          .select("id, name")
          .in("id", metricTeamIds)

        if (clubsError) {
          console.error("Error fetching clubs data:", clubsError)
          throw clubsError
        }

        console.log(`Found ${clubsData?.length || 0} teams with club data`)

        // Create a map of team IDs to names for easier lookup
        const teamNameMap: Record<number, string> = {}
        clubsData?.forEach((club) => {
          if (club.id) {
            teamNameMap[club.id] = club.name || `Team ${club.id}`
          }
        })

        // Step 6: Fetch match data for filtered teams
        console.log("Fetching match data...")
        const { data: matchData, error: matchError } = await supabase
          .from("team_match_stats")
          .select("team_id, match_id")
          .in("team_id", metricTeamIds)

        if (matchError) {
          console.error("Error fetching match data:", matchError)
          throw matchError
        }

        console.log(`Found ${matchData?.length || 0} matches for filtered teams`)

        // Count matches per team
        const matchCountByTeam: Record<number, number> = {}
        matchData?.forEach((match) => {
          if (match.team_id === null) return

          const teamId = match.team_id as number
          if (!matchCountByTeam[teamId]) {
            matchCountByTeam[teamId] = 0
          }
          matchCountByTeam[teamId]++
        })

        console.log(`Created match counts for ${Object.keys(matchCountByTeam).length} teams`)

        // Check if we have any teams with matches
        const teamsWithMatches = Object.keys(matchCountByTeam).length

        if (teamsWithMatches === 0) {
          console.log("No teams have any matches, aborting")
          setTeamStandings([])
          setIsLoading(false)
          return
        }

        // Step 7: Fetch previous years positions data for average points calculation
        console.log("Fetching previous years positions data...")
        const { data: previousYearsData, error: previousYearsError } = await supabase
          .from("previous_years_positions")
          .select("team_id, Points")
          .in("team_id", metricTeamIds)

        if (previousYearsError) {
          console.error("Error fetching previous years data:", previousYearsError)
          throw previousYearsError
        }

        console.log(`Found ${previousYearsData?.length || 0} previous years records`)

        // Calculate average points per team from previous years
        const avgPointsByTeam: Record<number, number> = {}
        previousYearsData?.forEach((record) => {
          if (record.team_id === null) return

          const teamId = record.team_id as number
          const points = Number.parseFloat(record.Points?.toString() || "0")

          if (!avgPointsByTeam[teamId]) {
            avgPointsByTeam[teamId] = 0
          }
          avgPointsByTeam[teamId] += points
        })

        // Calculate averages
        Object.keys(avgPointsByTeam).forEach((teamId) => {
          const teamIdNum = Number(teamId)
          const totalPoints = avgPointsByTeam[teamIdNum]
          const recordCount = previousYearsData?.filter(record => record.team_id === teamIdNum).length || 1
          avgPointsByTeam[teamIdNum] = totalPoints / recordCount
        })

        console.log(`Calculated average points for ${Object.keys(avgPointsByTeam).length} teams`)

        // Step 8: Process team metrics and calculate expected points
        console.log("Processing team metrics and calculating expected points...")

        const validTeams = filteredTeamMetrics.filter((team) => {
          if (!team.team_id) {
            return false
          }

          const teamId = team.team_id as number
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

        const standings = validTeams
          .map((team) => {
            const teamId = team.team_id as number
            const matchCount = matchCountByTeam[teamId] || 0
            const teamName = teamNameMap[teamId] || (team.Team as string) || `Team ${teamId}`

            // Convert points earned to number
            let pointsEarned: number
            if (typeof team["Points Earned"] === "number") {
              pointsEarned = team["Points Earned"]
            } else {
              pointsEarned = Number.parseFloat(team["Points Earned"]?.toString() || "0")
            }

            if (isNaN(pointsEarned)) {
              return null
            }

            // Calculate expected points
            const currentFormPoints = (pointsEarned / matchCount) * 36 // Assuming 36 matches in a season
            const avgPoints = avgPointsByTeam[teamId] || 0
            
            let expectedPoints: number
            if (avgPoints === null || avgPoints === 0) {
              expectedPoints = currentFormPoints
            } else {
              expectedPoints = (0.25 * currentFormPoints) + (0.75 * avgPoints)
            }
            
            const roundedPoints = Math.round(expectedPoints * 10) / 10 // Round to 1 decimal place

            return {
              teamId,
              teamName,
              expectedPoints: roundedPoints,
              isUserTeam: clubId ? teamId === clubId : false,
            }
          })
          .filter((team): team is NonNullable<typeof team> => team !== null) // Filter out null values

        console.log(`After processing, have ${standings.length} teams with valid expected points`)

        if (standings.length === 0) {
          console.log("No teams with valid expected points, aborting")
          setTeamStandings([])
          setIsLoading(false)
          return
        }

        // Sort and add ranks
        const sortedStandings = standings
          .sort((a, b) => b.expectedPoints - a.expectedPoints) // Sort by expected points (descending)
          .map((team, index) => ({
            ...team,
            rank: index + 1,
          }))

        console.log(`Final standings: ${sortedStandings.length} teams`)

        setTeamStandings(sortedStandings)
      } catch (error) {
        console.error("Error fetching team standings:", error)
      } finally {
        setIsLoading(false)
        console.log("=== FINISHED TEAM STANDINGS FETCH ===")
      }
    }

    fetchTeamStandings()
  }, [supabase, clubId])

  if (chartData.length === 0 || isLoading) {
    return <div className="text-center py-8">Loading data...</div>
  }

  return (
    <div className="space-y-8">
      {/* Main combined chart */}
      <div className="h-96">
        <h3 className="text-lg font-medium mb-2">Performance Metrics by League Position</h3>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="position"
              label={{
                value: "League Position",
                position: "insideBottom",
                offset: -5,
              }}
            />
            <YAxis yAxisId="left" label={{ value: "Goals", angle: -90, position: "insideLeft" }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, "dataMax + 10"]}
              label={{ value: "Points", angle: 90, position: "insideRight" }}
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === "points") return [`${value} points`, "Points"]
                if (name === "goalsScored") return [`${value} goals`, "Goals Scored"]
                if (name === "goalsConceded") return [`${value} goals`, "Goals Conceded"]
                return [value, name]
              }}
              labelFormatter={(label) => `Position: ${label}`}
            />
            <Legend />
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
            <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expected Points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {teamStandings.map((team) => (
                  <tr
                    key={team.teamId}
                    className={`${team.isUserTeam ? "bg-blue-50" : team.rank % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-gray-100`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{team.rank}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {team.isUserTeam ? <span className="font-semibold">{team.teamName}</span> : team.teamName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {team.expectedPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 bg-gray-50 rounded-lg">
            {isLoading ? "Loading standings data..." : "No standings data available. Check console for detailed logs."}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-2">
          Expected points calculated based on current performance projected over a 36-match season.
        </p>
      </div>
    </div>
  )
}
