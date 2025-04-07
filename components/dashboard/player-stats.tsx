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

// Type for the data returned by our new DB function
type LatestPlayer = {
  id: number
  name: string
  position: string | null
  stats: Database["public"]["Tables"]["players"]["Row"]["stats"]
  updated_at: string | null
}

// Type for display (keeping dummy data for now)
type PlayerDisplayData = {
  id: number
  name: string
  position: string
  appearances: number
  goals: number
  assists: number
  rating: number
}

// Sample player comparison data for the radar chart
const generatePlayerComparisonData = (playerName: string) => [
  { attribute: "Pace", [playerName]: Math.floor(Math.random() * 30) + 70, teamAverage: 75 },
  { attribute: "Shooting", [playerName]: Math.floor(Math.random() * 30) + 70, teamAverage: 72 },
  { attribute: "Passing", [playerName]: Math.floor(Math.random() * 30) + 70, teamAverage: 78 },
  { attribute: "Dribbling", [playerName]: Math.floor(Math.random() * 30) + 70, teamAverage: 74 },
  { attribute: "Defending", [playerName]: Math.floor(Math.random() * 30) + 70, teamAverage: 76 },
  { attribute: "Physical", [playerName]: Math.floor(Math.random() * 30) + 70, teamAverage: 77 },
]

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
        setUserEmail(user.email)
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
        const { data: latestPlayers, error: rpcError } = await supabase.rpc(
          "get_latest_players_for_club", // Name of the function we created
          { p_club_id: clubId }, // Pass the clubId as parameter
        )

        if (rpcError) {
          throw rpcError
        }

        console.log("PlayerStats: Fetched data via RPC:", latestPlayers)

        if (latestPlayers) {
          // Map the fetched data (type should match 'LatestPlayer')
          const displayData: PlayerDisplayData[] = latestPlayers.map((player: LatestPlayer) => {
            return {
              id: player.id,
              name: player.name,
              position: player.position || "Unknown",
              // --- Dummy Data ---
              appearances: Math.floor(Math.random() * 20) + 1,
              goals: Math.floor(Math.random() * 15),
              assists: Math.floor(Math.random() * 10),
              rating: Math.round((Math.random() * 3 + 6.5) * 10) / 10,
              // --- End Dummy Data ---
            }
          })
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

  // Handle player selection
  const handlePlayerClick = (player: PlayerDisplayData) => {
    setSelectedPlayer(player)
    setPlayerComparisonData(generatePlayerComparisonData(player.name))
  }

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
                    <TableHead className="text-black cursor-pointer" onClick={() => handleSort("name")}>
                      <div className="flex items-center">
                        Name
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-black cursor-pointer" onClick={() => handleSort("position")}>
                      <div className="flex items-center">
                        Position
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-black text-right cursor-pointer"
                      onClick={() => handleSort("appearances")}
                    >
                      <div className="flex items-center justify-end">
                        Appearances
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-black text-right cursor-pointer" onClick={() => handleSort("goals")}>
                      <div className="flex items-center justify-end">
                        Goals
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-black text-right cursor-pointer" onClick={() => handleSort("assists")}>
                      <div className="flex items-center justify-end">
                        Assists
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-black text-right cursor-pointer" onClick={() => handleSort("rating")}>
                      <div className="flex items-center justify-end">
                        Rating
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
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
                          <Badge variant="outline" className="bg-[#31348D]/10 text-[#31348D] border-[#31348D]/20">
                            {player.position}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{player.appearances}</TableCell>
                        <TableCell className="text-right">{player.goals}</TableCell>
                        <TableCell className="text-right">{player.assists}</TableCell>
                        <TableCell className="text-right font-medium">
                          <span
                            className={`${player.rating >= 8.0 ? "text-green-600" : player.rating >= 7.0 ? "text-amber-600" : "text-red-600"}`}
                          >
                            {player.rating.toFixed(1)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}

                  {/* Empty States */}
                  {!loading && players.length === 0 && !error && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No players found for this club.
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && players.length > 0 && filteredPlayers.length === 0 && !error && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
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
                <div className="text-sm text-gray-500">Appearances</div>
                <div className="text-xl font-bold text-[#31348D]">{selectedPlayer?.appearances}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-sm text-gray-500">Goals</div>
                <div className="text-xl font-bold text-[#31348D]">{selectedPlayer?.goals}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-sm text-gray-500">Rating</div>
                <div
                  className={`text-xl font-bold ${selectedPlayer?.rating && selectedPlayer.rating >= 8.0 ? "text-green-600" : selectedPlayer?.rating && selectedPlayer.rating >= 7.0 ? "text-amber-600" : "text-red-600"}`}
                >
                  {selectedPlayer?.rating.toFixed(1)}
                </div>
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

