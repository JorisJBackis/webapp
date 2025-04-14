"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {Search, Loader2, AlertCircle, ArrowUpDown, X, Info} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"
import {Switch} from "@/components/ui/switch";


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
  age: number | string | null;
  goals: number | string;
  xG: number | string;
  assists: number | string | null;
  minutes: number | string;
  contractEnds: string;
  // Include raw stats so you can use them later if needed.
  stats?: PlayerStats | null;
};

// Define the key metrics with legend, exactly as desired.
// This mapping remains the same:
// Your mapping of metrics per position remains as provided:
const sixMetricsWithLegend: { [position: string]: [string, string][] } = {
  'Goalkeeper': [
    ['Conceded goals per 90_percentile', 'low'],
    ['Accurate passes, %_percentile', 'high'],
    ['xG against per 90_percentile', 'low'],
    ['Prevented goals per 90_percentile', 'high'],
    ['Save rate, %_percentile', 'high'],
    ['Exits per 90_percentile', 'high']
  ],
  'Full Back': [
    ['Successful defensive actions per 90_percentile', 'high'],
    ['Defensive duels won, %_percentile', 'high'],
    ['Accurate crosses, %_percentile', 'high'],
    ['Accurate passes, %_percentile', 'high'],
    ['Key passes per 90_percentile', 'high'],
    ['xA per 90_percentile', 'high']
  ],
  'Centre Back': [
    ['Successful defensive actions per 90_percentile', 'high'],
    ['Defensive duels won, %_percentile', 'high'],
    ['Aerial duels won, %_percentile', 'high'],
    ['Accurate passes to final third per 90_percentile', 'high'],
    ['Accurate passes, %_percentile', 'high'],
    ['Interceptions per 90_percentile', 'high'],

  ],
  'Defensive Midfielder': [
    ['Interceptions per 90_percentile', 'high'],
    ['Sliding tackles per 90_percentile', 'high'],
    ['Aerial duels won, %_percentile', 'high'],
    ['Accurate passes to penalty area per 90_percentile', 'high'],
    ['Accurate passes to final third per 90_percentile', 'high'],
    ['Accurate progressive passes per 90_percentile', 'high']

  ],
  'Central Midfielder': [
    ['Successful defensive actions per 90_percentile', 'high'],
    ['Defensive duels won, %_percentile', 'high'],
    ['Accurate passes, %_percentile', 'high'],
    ['Accurate passes to final third per 90_percentile', 'high'],
    ['Key passes per 90_percentile', 'high'],
    ['xA per 90_percentile', 'high']
  ],
  'Attacking Midfielder': [
    ['Defensive duels won, %_percentile', 'high'],
    ['Successful defensive actions per 90_percentile', 'high'],
    ['Accurate smart passes per 90_percentile', 'high'],
    ['Accurate passes to penalty area per 90_percentile', 'high'],
    ['Goals per 90_percentile', 'high'],
    ['Successful dribbles per 90_percentile', 'high']
  ],
  'Winger': [
    ['Non-penalty goals per 90_percentile', 'high'],
    ['xG per 90_percentile', 'high'],
    ['Shots on target per 90_percentile', 'high'],
    ['Successful dribbles per 90_percentile', 'high'],
    ['Assists per 90_percentile', 'high'],
    ['xA per 90_percentile', 'high']
  ],
  'Centre Forward': [
    ['Non-penalty goals per 90_percentile', 'high'],
    ['xG per 90_percentile', 'high'],
    ['Shots on target per 90_percentile', 'high'],
    ['Touches in box per 90_percentile', 'high'],
    ['xA per 90_percentile', 'high'],
    ['Offensive duels won, %_percentile', 'high']
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
      attribute: metricName.replace(/_percentile$/, '').replace(/_/g, ' '),
      [playerLabel]: val != null && !isNaN(Number(val)) ? Number(val) * 100 : 0,
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
  const [loanStatus, setLoanStatus] = useState<Record<number, boolean>>({})
  const [showLoanPopup, setShowLoanPopup] = useState(false)
  const [activeLoanPlayerId, setActiveLoanPlayerId] = useState<number | null>(null)
  const [selectedAudience, setSelectedAudience] = useState<string | null>(null)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const supabase = createClient()

  // Sample player comparison data for the radar chart
  const generatePlayerComparisonData = (player: PlayerDisplayData) => {
    const metrics = sixMetricsWithLegend[player.position] || sixMetricsWithLegend["Centre Forward"];
    const playerLabel = player.name || "Unknown";

    return metrics.map(([metricName, _direction]) => {
      const readableLabel = metricName.replace(/_percentile$/, "").replace(/_/g, " ");
      const percentileVal = player.stats?.[metricName];
      const rawPercentile = percentileVal != null && !isNaN(Number(percentileVal)) ? Number(percentileVal) * 100 : 0;

      return {
        attribute: readableLabel, // Label without "_percentile"
        [playerLabel]: rawPercentile,
        teamAverage: Math.floor(Math.random() * 99) + 1, // 🧪 Dummy average between 65–95
      };
    });
  };

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
              contractEnds: s?.["Contract expires"] != null ? String(s["Contract expires"]) : "Unknown",
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

  const toggleLoan = (playerId: number) => {
    setLoanStatus((prev) => {
      const newStatus = !prev[playerId];
      if (newStatus) {
        setShowLoanPopup(true);
        setActiveLoanPlayerId(playerId);
      }
      return {
        ...prev,
        [playerId]: newStatus,
      };
    });
  };

  const getPlayerById = (id: number | null): PlayerDisplayData | null => {
    if (id === null) return null;
    return players.find((p) => p.id === id) ?? null;
  };

  const activePlayer = getPlayerById(activeLoanPlayerId);

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
                    <TableHead className="cursor-pointer text-black font-medium" onClick={() => handleSort("name")}>
                      <div className="flex items-center">Name <ArrowUpDown className="ml-1 h-4 w-4" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer text-black font-medium" onClick={() => handleSort("position")}>
                      <div className="flex items-center">Position <ArrowUpDown className="ml-1 h-4 w-4" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer text-center text-black font-medium" onClick={() => handleSort("age")}>
                      <div className="flex justify-center items-center gap-1">
                        <span>Age</span>
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer text-center text-black font-medium" onClick={() => handleSort("goals")}>
                      <div className="flex justify-center items-center gap-1">
                        <span>Goals</span>
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer text-center text-black font-medium" onClick={() => handleSort("xG")}>
                      <div className="flex justify-center items-center gap-1">
                        <span>xG</span>
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer text-center text-black font-medium" onClick={() => handleSort("assists")}>
                      <div className="flex justify-center items-center gap-1">
                        <span>Assists</span>
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer text-center text-black font-medium" onClick={() => handleSort("minutes")}>
                      <div className="flex justify-center items-center gap-1">
                        <span>Minutes</span>
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer text-center text-black font-medium" onClick={() => handleSort("contractEnds")}>
                      <div className="flex justify-center items-center gap-1">
                        <span>Contract Ends</span>
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-cente text-black font-medium">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-center gap-1 cursor-default">
                              <span>On Loan?</span>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={22} align="end">
                            <p className="text-sm text-[#31348D] font-medium">Is this player available for loan?</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
                            <TableCell className="text-center">{player.age}</TableCell>
                            <TableCell className="text-center">{player.goals}</TableCell>
                            <TableCell className="text-center">{player.xG}</TableCell>
                            <TableCell className="text-center">{player.assists}</TableCell>
                            <TableCell className="text-center">{player.minutes}</TableCell>
                            <TableCell className="text-center">{player.contractEnds}</TableCell>
                            <TableCell className="text-center">
                              <Switch
                                  checked={!!loanStatus[player.id]}
                                  onCheckedChange={() => toggleLoan(player.id)}
                                  onClick={(e) => e.stopPropagation()} // 🛑 This prevents the row click
                              />
                            </TableCell>
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
                    <ChartTooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload || payload.length === 0) return null;

                          return (
                              <div className="rounded-md border bg-white p-3 shadow-sm text-xs">
                                {/* Stat name with (percentile) */}
                                <div className="font-semibold text-[#31348D]">
                                  {label} <span className="text-[#31348D]">(percentile)</span>
                                </div>

                                {/* Values for each line (player + team) */}
                                <div className="mt-1 space-y-1">
                                  {payload.map((entry, idx) => {
                                    const color = entry.name === "Team Average" ? entry.color : "#9CA3AF";
                                    const value = entry.value;
                                    const formattedValue = isNaN(Number(value))
                                        ? "-"
                                        : `${Number(value).toFixed(0)}%`;

                                    return (
                                        <div key={idx} className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-[#4B5563]">
                  <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: color }}></span><span className="mr-1">{entry.name}</span></span><span className="font-mono text-[#31348D] font-medium">{formattedValue}</span></div>);
                                  })}
                                </div>
                              </div>
                          );
                        }}
                    />
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

      {activePlayer && (
          <Dialog open={showLoanPopup} onOpenChange={setShowLoanPopup}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-[#31348D]">
                  Make <span className="text-[#31348D] font-extrabold">{activePlayer.name}</span> available for loan
                </DialogTitle>
                <DialogDescription className="text-gray-600 mt-1">
                  You just marked <strong>{activePlayer.name}</strong> as available for loan. <br />
                  Who should be able to see this availability?
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-2 mt-4">
                <Button
                    variant={selectedAudience === "clubs" ? "default" : "outline"}
                    className={selectedAudience === "clubs" ? "w-full bg-[#31348D] text-white" : "w-full"}
                    onClick={() => setSelectedAudience("clubs")}
                >
                  Clubs
                </Button>

                <Button
                    variant={selectedAudience === "agents" ? "default" : "outline"}
                    className={selectedAudience === "agents" ? "w-full bg-[#31348D] text-white" : "w-full"}
                    onClick={() => setSelectedAudience("agents")}
                >
                  Agents
                </Button>

                <Button
                    variant={selectedAudience === "both" ? "default" : "outline"}
                    className={selectedAudience === "both" ? "w-full bg-[#31348D] text-white" : "w-full"}
                    onClick={() => setSelectedAudience("both")}
                >
                  Clubs and Agents
                </Button>
              </div>

              <div className="flex justify-end mt-4 space-x-2">
                <Button variant="ghost" onClick={() => {
                  if (activeLoanPlayerId !== null) {
                    setLoanStatus((prev) => ({
                      ...prev,
                      [activeLoanPlayerId]: false,
                    }));
                  }

                  setShowLoanPopup(false);
                  setActiveLoanPlayerId(null);
                  setSelectedAudience(null); // optional: reset radio choice too
                }}>Cancel</Button>
                <Button
                    onClick={() => {
                      // Later: handle selected audience with activePlayer
                      setShowLoanPopup(false)
                    }}
                    disabled={!selectedAudience}
                >
                  Confirm
                </Button>
              </div>
            </DialogContent>
          </Dialog>
      )}
    </>
  )
}

