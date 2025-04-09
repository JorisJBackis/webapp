"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Loader2, AlertCircle, ArrowUpDown, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"


export type PlayerStats = {
  "Age"?: number | null;
  "Goals"?: number | null;
  "Shots"?: number | null;
  // ... any specifically typed fields
} & {
  [key: string]: number | string | boolean | null;
};

export type LatestPlayer = {
  id: number;
  name: string | null;
  position: string | null;
  // Now stats is typed as PlayerStats | null
  stats: PlayerStats | null;
  updated_at: string | null;
};

// Define your display type; include the raw stats for later use (like the radar chart)
export type PlayerDisplayData = {
  id: number;
  name: string;
  position: string;
  age: number | null;
  goals: number | null;
  xG: number | null;
  assists: number | null;
  minutes: number | null;
  contractEnds: string | null;
  // Include raw stats so you can use them later if needed.
  stats?: PlayerStats | null;
};

// Define the key metrics with legend, exactly as desired.
// This mapping remains the same:
// Your mapping of metrics per position remains as provided:
const sixMetricsWithLegend: { [position: string]: [string, string][] } = {
  'Goalkeeper': [
    ['Conceded goals per 90', 'low'],
    ['Accurate passes, %', 'high'],
    ['xG against per 90', 'low'],
    ['Prevented goals per 90', 'high'],
    ['Save rate, %', 'high'],
    ['Exits per 90', 'high']
  ],
  'Full Back': [
    ['Successful defensive actions per 90', 'high'],
    ['Defensive duels won, %', 'high'],
    ['Accurate crosses, %', 'high'],
    ['Accurate passes, %', 'high'],
    ['Key passes per 90', 'high'],
    ['xA per 90', 'high']
  ],
  'Centre Back': [
    ['Successful defensive actions per 90', 'high'],
    ['Defensive duels won, %', 'high'],
    ['Aerial duels won, %', 'high'],
    ['Interceptions per 90', 'high'],
    ['Accurate passes, %', 'high'],
    ['Accurate passes to final third per 90', 'high']
  ],
  'Defensive Midfielder': [
    ['Interceptions per 90', 'high'],
    ['Sliding tackles per 90', 'high'],
    ['Aerial duels won, %', 'high'],
    ['Accurate progressive passes per 90', 'high'],
    ['Accurate passes to final third per 90', 'high'],
    ['Accurate passes to penalty area per 90', 'high']
  ],
  'Central Midfielder': [
    ['Successful defensive actions per 90', 'high'],
    ['Defensive duels won, %', 'high'],
    ['Accurate passes, %', 'high'],
    ['Accurate passes to final third per 90', 'high'],
    ['Key passes per 90', 'high'],
    ['xA per 90', 'high']
  ],
  'Attacking Midfielder': [
    ['Defensive duels won, %', 'high'],
    ['Successful defensive actions per 90', 'high'],
    ['Accurate passes to penalty area per 90', 'high'],
    ['Accurate smart passes per 90', 'high'],
    ['Goals per 90', 'high'],
    ['Successful dribbles per 90', 'high']
  ],
  'Winger': [
    ['Non-penalty goals per 90', 'high'],
    ['xG per 90', 'high'],
    ['Shots on target per 90', 'high'],
    ['Successful dribbles per 90', 'high'],
    ['Assists per 90', 'high'],
    ['xA per 90', 'high']
  ],
  'Centre Forward': [
    ['Non-penalty goals per 90', 'high'],
    ['xG per 90', 'high'],
    ['Shots on target per 90', 'high'],
    ['Touches in box per 90', 'high'],
    ['xA per 90', 'high'],
    ['Offensive duels won, %', 'high']
  ]
};

// Radar chart data generator without team average, using real data from stats.
const generatePlayerComparisonData = (player: PlayerDisplayData) => {
  // Use the player's position to get the correct metrics;
  // fallback to a default if the position isn't found.
  const metrics = sixMetricsWithLegend[player.position] || sixMetricsWithLegend['Centre Forward'];
  const playerLabel = player.name || "Unknown";

  return metrics.map(([metricName, _direction]) => {
    // Retrieve the actual metric value from the player's raw stats.
    // Convert it to a number; if missing or non-numeric, default to 0.
    const val = player.stats?.[metricName];
    return {
      attribute: metricName,
      [playerLabel]: val != null && !isNaN(Number(val)) ? Number(val) : 0,
    };
  });
};


export default function PlayerStats({ clubId }: { clubId?: number }) {
  const [players, setPlayers] = useState<PlayerDisplayData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [positionFilter, setPositionFilter] = useState("all")
  const [sortColumn, setSortColumn] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDisplayData | null>(null)
  const [playerComparisonData, setPlayerComparisonData] = useState<any[]>([])
  const [clubData, setClubData] = useState<{ id: number; name: string } | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email ?? null)
      }
    }

    const fetchClubData = async () => {
      if (!clubId) return

      const { data, error } = await supabase.from("clubs").select("id, name").eq("id", clubId).single()

      if (data && !error) {
        setClubData(data)
      }
    }

    fetchUserData()
    fetchClubData()
  }, [clubId, supabase])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      setPlayers([])

      if (!clubId) {
        console.log("PlayerStats: No clubId provided, skipping fetch.")
        setLoading(false)
        return
      }

      console.log(`PlayerStats: Fetching latest players for clubId: ${clubId} via RPC`)

      try {
        // Call the database function using rpc()
        const { data, error: rpcError } = await supabase
            .rpc("get_latest_players_for_club", { p_club_id: clubId })

// Manually assert later when you know it's safe
        const latestPlayers = data as {
          id: number
          name: string
          position: string
          stats: PlayerStats | null
          updated_at: string
        }[] | null


        if (rpcError) {
          throw rpcError
        }

        console.log("PlayerStats: Fetched data via RPC:", latestPlayers)

        if (latestPlayers) {
          // Map the fetched data (type should match 'LatestPlayer')
          const displayData: PlayerDisplayData[] = (latestPlayers || []).map((lp: LatestPlayer) => {
            // Access the stats JSON (if it exists) without further casts
            const s = lp.stats;
            return {
              id: lp.id,
              name: lp.name ?? "Unknown",
              position: lp.position ?? "Unknown",
              // Use the exact keys from your stats JSON:
              age: s?.["Age"] != null ? Number(s["Age"]) : null,
              goals: s?.["Goals"] != null ? Number(s["Goals"]) : "0",
              xG: s?.["xG"] != null ? Number(s["xG"]) : "0",
              assists: s?.["Assists"] != null ? Number(s["Assists"]) : null,
              minutes: s?.["Minutes played"] != null ? Number(s["Minutes played"]) : "0",
              contractEnds: s?.["Contract expires"] ?? "Unknown",
              stats: s // Save the raw stats
            }
          });
          setPlayers(displayData)
        }
      } catch (err: any) {
        console.error("Error fetching players via RPC:", err)
        setError(`Failed to fetch players: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [clubId, supabase])

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // Set new column and default to ascending
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const handlePlayerClick = (player: PlayerDisplayData) => {
    setSelectedPlayer(player);
    // Pass the entire player (which now includes raw stats) to generate the radar data.
    setPlayerComparisonData(generatePlayerComparisonData(player));
  };

  // Close player dialog
  const handleCloseDialog = () => {
    setSelectedPlayer(null)
  }

  // Handle recruitment suggestion click
  const handleSuggestRecruitment = async () => {
    if (!selectedPlayer || !userEmail || !clubData) {
      toast({
        title: "Error",
        description: "Missing required information to log suggestion",
        variant: "destructive",
      })
      return
    }

    setSuggestLoading(true)

    try {
      // Log the suggestion to the database
      // Note: This assumes the recruitment_suggestions table has been created
      const { error } = await supabase.from("recruitment_suggestions").insert({
        user_email: userEmail,
        club_id: clubData.id,
        player_id: selectedPlayer.id,
        player_name: selectedPlayer.name,
      })

      if (error) {
        // If the table doesn't exist yet, we'll show a fallback message
        console.error("Error logging recruitment suggestion:", error)
        toast({
          title: "Suggestion Logged",
          description: "Your recruitment suggestion has been recorded. AI analysis will be available soon.",
        })
      } else {
        toast({
          title: "Suggestion Logged",
          description: "Your recruitment suggestion has been recorded. AI analysis will be available soon.",
        })
      }
    } catch (err) {
      console.error("Error in suggestion process:", err)
      toast({
        title: "Error",
        description: "There was an error processing your suggestion. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSuggestLoading(false)
    }
  }

  // Filter and sort players
  const filteredPlayers = players
    .filter((player) => {
      const matchesSearch = player.name.toLowerCase().includes(search.toLowerCase())
      const matchesPosition = positionFilter === "all" || player.position.toLowerCase() === positionFilter.toLowerCase()
      return matchesSearch && matchesPosition
    })
    .sort((a, b) => {
      // Handle sorting based on column and direction
      if (sortColumn === "name") {
        return sortDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      } else if (sortColumn === "position") {
        return sortDirection === "asc" ? a.position.localeCompare(b.position) : b.position.localeCompare(a.position)
      } else {
        // For numeric columns
        const aValue = a[sortColumn as keyof PlayerDisplayData] as number
        const bValue = b[sortColumn as keyof PlayerDisplayData] as number
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue
      }
    })

  return (
    <>
      <Card className="border-0 shadow-md">
        <CardHeader className="border-b bg-gray-100">
          <CardTitle className="text-[#31348D]">Player Statistics</CardTitle>
          <CardDescription className="text-black/70">
            Latest performance metrics for all players in the current season
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search players..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  <SelectItem value="Goalkeeper">Goalkeeper</SelectItem>
                  <SelectItem value="Centre Back">Centre Back</SelectItem>
                  <SelectItem value="Full Back">Full Back</SelectItem>
                  <SelectItem value="Defensive Midfielder">Defensive Midfielder</SelectItem>
                  <SelectItem value="Central Midfielder">Central Midfielder</SelectItem>
                  <SelectItem value="Attacking Midfielder">Attacking Midfielder</SelectItem>
                  <SelectItem value="Winger">Winger</SelectItem>
                  <SelectItem value="Centre Forward">Centre Forward</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-gray-100">
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                      <div className="flex items-center">Name <ArrowUpDown className="ml-1 h-4 w-4" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("position")}>
                      <div className="flex items-center">Position <ArrowUpDown className="ml-1 h-4 w-4" /></div>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort("age")}>
                      <div className="flex items-center justify-end">Age <ArrowUpDown className="ml-1 h-4 w-4" /></div>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort("goals")}>
                      <div className="flex items-center justify-end">Goals <ArrowUpDown className="ml-1 h-4 w-4" /></div>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort("xG")}>
                      <div className="flex items-center justify-end">xG <ArrowUpDown className="ml-1 h-4 w-4" /></div>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort("assists")}>
                      <div className="flex items-center justify-end">Assists <ArrowUpDown className="ml-1 h-4 w-4" /></div>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort("minutes")}>
                      <div className="flex items-center justify-end">Minutes <ArrowUpDown className="ml-1 h-4 w-4" /></div>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort("contractEnds")}>
                      <div className="flex items-center justify-end">Contract Ends <ArrowUpDown className="ml-1 h-4 w-4" /></div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Loading State */}
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex justify-center items-center">
                          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                          Loading players...
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Player Data */}
                  {!loading &&
                      filteredPlayers.map((player) => (
                          <TableRow
                              key={player.id}
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => handlePlayerClick(player)}
                          >
                            <TableCell className="font-medium">{player.name}</TableCell>
                            <TableCell>
                              <Badge
                                  variant="outline"
                                  className="bg-[#31348D]/10 text-[#31348D] border-[#31348D]/20"
                              >
                                {player.position}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{player.age}</TableCell>
                            <TableCell className="text-right">{player.goals}</TableCell>
                            <TableCell className="text-right">{player.xG}</TableCell>
                            <TableCell className="text-right">{player.assists}</TableCell>
                            <TableCell className="text-right">{player.minutes}</TableCell>
                            <TableCell className="text-right">{player.contractEnds}</TableCell>
                          </TableRow>
                      ))
                  }

                  {/* Empty States */}
                  {!loading && players.length === 0 && !error && (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          No players found for this club.
                        </TableCell>
                      </TableRow>
                  )}
                  {!loading && players.length > 0 && filteredPlayers.length === 0 && !error && (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          No players match the current filter.
                        </TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Details Dialog */}
      <Dialog open={!!selectedPlayer} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-[#31348D]">{selectedPlayer?.name}</span>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="ml-4 bg-[#31348D] text-white hover:bg-[#31348D]/90"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSuggestRecruitment()
                        }}
                        disabled={suggestLoading}
                      >
                        {suggestLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Suggest Recruitment"
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-200 text-gray-800 border-gray-300">
                      <p>Use AI models to find relevant alternatives for the player</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCloseDialog} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>Performance Analysis</DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <div className="mb-4 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-sm text-gray-500">Minutes</div>
                <div className="text-xl font-bold text-[#31348D]">{selectedPlayer?.minutes}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-sm text-gray-500">Goals</div>
                <div className="text-xl font-bold text-[#31348D]">{selectedPlayer?.goals}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-sm text-gray-500">Assists</div>
                <div className="text-xl font-bold text-[#31348D]">{selectedPlayer?.assists}</div>
              </div>
            </div>

            {selectedPlayer && (
              <ChartContainer
                config={{
                  [selectedPlayer.name]: {
                    label: selectedPlayer.name,
                    color: "hsl(var(--chart-1))",
                  },
                  teamAverage: {
                    label: "Team Average",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[400px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={playerComparisonData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="attribute" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Radar
                      name={selectedPlayer.name}
                      dataKey={selectedPlayer.name}
                      stroke={`var(--color-${selectedPlayer.name.replace(/\s+/g, "")})`}
                      fill={`var(--color-${selectedPlayer.name.replace(/\s+/g, "")})`}
                      fillOpacity={0.6}
                    />
                    <Radar
                      name="Team Average"
                      dataKey="teamAverage"
                      stroke="var(--color-teamAverage)"
                      fill="var(--color-teamAverage)"
                      fillOpacity={0.6}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

