// File: webapp-footylabs/components/dashboard/player-stats.tsx
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Type for the data returned by our new DB function
// Make sure it matches the RETURNS TABLE definition in SQL
type LatestPlayer = {
  id: number
  name: string
  position: string | null // Match DB function output type
  stats: Database["public"]["Tables"]["players"]["Row"]["stats"] // Use Json type
  updated_at: string | null // Match DB function output type
}

// Type for display (keeping dummy data for now)
type PlayerDisplayData = {
  id: number
  name: string
  position: string
  appearances: number // Dummy data
  goals: number // Dummy data
  assists: number // Dummy data
  rating: number // Dummy data
}

export default function PlayerStats({ clubId }: { clubId?: number }) {
  const [players, setPlayers] = useState<PlayerDisplayData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [positionFilter, setPositionFilter] = useState("all")
  const supabase = createClient()

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
            // You can access player.stats here if needed in the future
            // e.g., const goalsFromStats = player.stats?.Goals || 0;

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

  // Filter logic remains the same
  const filteredPlayers = players.filter((player) => {
    const matchesSearch = player.name.toLowerCase().includes(search.toLowerCase())
    const matchesPosition = positionFilter === "all" || player.position.toLowerCase() === positionFilter.toLowerCase()
    return matchesSearch && matchesPosition
  })

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="border-b bg-gray-100">
        <CardTitle className="text-[#31348D]">Player Statistics</CardTitle>
        <CardDescription className="text-black/70">
          Latest performance metrics for all players in the current season
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Search and Filter inputs ... */}
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
                  <TableHead className="text-black">Name</TableHead>
                  <TableHead className="text-black">Position</TableHead>
                  <TableHead className="text-black text-right">Appearances</TableHead>
                  <TableHead className="text-black text-right">Goals</TableHead>
                  <TableHead className="text-black text-right">Assists</TableHead>
                  <TableHead className="text-black text-right">Rating</TableHead>
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
                    <TableRow key={player.id}>
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
  )
}

