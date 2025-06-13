"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Star, Loader2, AlertCircle, ArrowUpDown, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// UI Components
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Import the player detail modal
import PlayerDetailModal from "@/components/common/player-detail-modal"

// Types
type Player = {
  id: number
  name: string
  position: string
  club_id: number | null
  stats: any
  created_at: string
  updated_at: string
  wyscout_player_id: number | null
  club_name?: string
  age?: number | null
  height?: number | null
  foot?: string | null
  contract_expiry?: string | null
  player_league_name?: string | null
  avg_percentile?: number | null
}

// Format FootyLabs score (same as in player-detail-modal.tsx)
const formatFootylabsScore = (score: number | string | null | undefined): string => {
  if (score === null || score === undefined) return "N/A"
  const numScore = Number(score)
  if (isNaN(numScore)) return "N/A"
  return (numScore * 10).toFixed(1) // Assuming score is 0-1 percentile
}

// Get color based on score (same as in player-detail-modal.tsx)
const getScoreColor = (score: number | string | null | undefined): string => {
  if (score === null || score === undefined) return "text-muted-foreground"
  const numScore = Number(score)
  if (isNaN(numScore)) return "text-muted-foreground"
  const scaledScore = numScore * 100 // Scale 0-1 percentile to 0-100
  if (scaledScore <= 33.3) return "text-red-600 font-medium"
  if (scaledScore <= 66.6) return "text-amber-500 font-medium"
  return "text-green-600 font-medium"
}

export default function LeaguePlayerBrowser({ initialUserClubId }: { initialUserClubId: number | null }) {
  const [players, setPlayers] = useState<Player[]>([])
  const [allPlayers, setAllPlayers] = useState<Player[]>([]) // Store all unique players
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(25)
  const [sortColumn, setSortColumn] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  // Filter states
  const [filters, setFilters] = useState({
    name: "",
    position: "all",
    foot: "all",
    minHeight: "",
    maxHeight: "",
    minAge: "",
    maxAge: "",
  })

  const [watchlistPlayerIds, setWatchlistPlayerIds] = useState<Set<number>>(new Set())
  const [togglingWatchlist, setTogglingWatchlist] = useState<Set<number>>(new Set())

  const supabase = createClient()
  const { toast } = useToast()

  // Fetch watchlist status
  const fetchWatchlistStatus = useCallback(async () => {
    if (!initialUserClubId) return

    try {
      const { data, error } = await supabase.from("watchlist").select("player_id").eq("club_id", initialUserClubId)

      if (error) throw error

      const playerIds = new Set(data?.map((item) => item.player_id) || [])
      setWatchlistPlayerIds(playerIds)
      console.log("Watchlist loaded:", playerIds.size, "players")
    } catch (err) {
      console.error("Error fetching watchlist status:", err)
    }
  }, [initialUserClubId, supabase])

  // Toggle watchlist status
  const toggleWatchlist = async (playerId: number, playerName: string, isInWatchlist: boolean) => {
    if (!initialUserClubId) return

    setTogglingWatchlist((prev) => new Set(prev).add(playerId))

    try {
      if (isInWatchlist) {
        // Remove from watchlist
        const { error } = await supabase
          .from("watchlist")
          .delete()
          .eq("club_id", initialUserClubId)
          .eq("player_id", playerId)

        if (error) throw error

        setWatchlistPlayerIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(playerId)
          return newSet
        })

        toast({
          title: "Player removed",
          description: `${playerName} has been removed from your watchlist.`,
        })
      } else {
        // Add to watchlist
        const { error } = await supabase.from("watchlist").insert({
          club_id: initialUserClubId,
          player_id: playerId,
        })

        if (error) throw error

        setWatchlistPlayerIds((prev) => new Set(prev).add(playerId))

        toast({
          title: "Player added",
          description: `${playerName} has been added to your watchlist.`,
        })
      }
    } catch (err: any) {
      console.error("Error toggling watchlist:", err)
      toast({
        title: "Error",
        description: `Could not update watchlist: ${err.message}`,
        variant: "destructive",
      })
    } finally {
      setTogglingWatchlist((prev) => {
        const newSet = new Set(prev)
        newSet.delete(playerId)
        return newSet
      })
    }
  }

  // Handle filter change
  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }))
  }

  // Fetch all players and process them
  const fetchAllPlayers = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("Fetching ALL players from database...")

      // Fetch ALL players without any limits
      const { data: allData, error } = await supabase
        .from("players")
        .select(
          `
          id,
          name,
          position,
          club_id,
          stats,
          created_at,
          updated_at,
          wyscout_player_id,
          clubs:club_id (
            name,
            league
          )
        `,
        )
        .order("updated_at", { ascending: false }) // Order by updated_at desc to get latest first

      if (error) throw error

      console.log(`Fetched ${allData?.length || 0} total player records from database`)

      // Process results to get only the latest record per player name based on updated_at
      const latestPlayerMap = new Map()
      allData?.forEach((player) => {
        const playerName = player.name
        if (
          !latestPlayerMap.has(playerName) ||
          new Date(player.updated_at) > new Date(latestPlayerMap.get(playerName).updated_at)
        ) {
          latestPlayerMap.set(playerName, player)
        }
      })

      // Convert back to array
      const uniquePlayers = Array.from(latestPlayerMap.values()).map((player) => ({
        ...player,
        club_name: player.clubs?.name || "Unknown Club",
        player_league_name: player.clubs?.league || null,
        age: player.stats?.age || null,
        height: player.stats?.height || null,
        foot: player.stats?.foot || null,
        contract_expiry: player.stats?.contract_expiry || null,
        avg_percentile: player.stats?.avg_percentile || null,
      }))

      console.log(`Processed to ${uniquePlayers.length} unique players (latest record per player)`)

      setAllPlayers(uniquePlayers)
      setTotalCount(uniquePlayers.length)

      // Apply filters and pagination to get the current page
      applyFiltersAndPagination(uniquePlayers)
    } catch (err: any) {
      console.error("Error fetching players:", err)
      setError(`Failed to load players: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Apply filters and pagination to the all players data
  const applyFiltersAndPagination = useCallback(
    (playersData: Player[]) => {
      console.log("Applying filters:", filters)

      // Apply filters
      const filteredPlayers = playersData.filter((player) => {
        // Name filter
        if (filters.name && !player.name.toLowerCase().includes(filters.name.toLowerCase())) {
          return false
        }

        // Position filter
        if (filters.position !== "all" && player.position !== filters.position) {
          return false
        }

        // Height filters
        if (filters.minHeight && (!player.height || player.height < Number.parseInt(filters.minHeight))) {
          return false
        }
        if (filters.maxHeight && (!player.height || player.height > Number.parseInt(filters.maxHeight))) {
          return false
        }

        // Age filters
        if (filters.minAge && (!player.age || player.age < Number.parseInt(filters.minAge))) {
          return false
        }
        if (filters.maxAge && (!player.age || player.age > Number.parseInt(filters.maxAge))) {
          return false
        }

        // Foot filter
        if (filters.foot !== "all" && player.foot !== filters.foot) {
          return false
        }

        return true
      })

      console.log(`Filtered to ${filteredPlayers.length} players`)

      // Apply sorting
      if (sortColumn === "name") {
        filteredPlayers.sort((a, b) => {
          const comparison = a.name.localeCompare(b.name)
          return sortDirection === "asc" ? comparison : -comparison
        })
      } else if (sortColumn === "position") {
        filteredPlayers.sort((a, b) => {
          const comparison = a.position.localeCompare(b.position)
          return sortDirection === "asc" ? comparison : -comparison
        })
      } else if (sortColumn === "club_name") {
        filteredPlayers.sort((a, b) => {
          const comparison = (a.club_name || "").localeCompare(b.club_name || "")
          return sortDirection === "asc" ? comparison : -comparison
        })
      } else if (sortColumn === "stats->age") {
        filteredPlayers.sort((a, b) => {
          const ageA = a.age || 0
          const ageB = b.age || 0
          return sortDirection === "asc" ? ageA - ageB : ageB - ageA
        })
      } else if (sortColumn === "stats->height") {
        filteredPlayers.sort((a, b) => {
          const heightA = a.height || 0
          const heightB = b.height || 0
          return sortDirection === "asc" ? heightA - heightB : heightB - heightA
        })
      } else if (sortColumn === "stats->avg_percentile") {
        filteredPlayers.sort((a, b) => {
          const scoreA = a.avg_percentile || 0
          const scoreB = b.avg_percentile || 0
          return sortDirection === "asc" ? scoreA - scoreB : scoreB - scoreA
        })
      }

      // Update total count for filtered results
      setTotalCount(filteredPlayers.length)

      // Apply pagination
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      const paginatedPlayers = filteredPlayers.slice(startIndex, endIndex)

      console.log(`Showing ${paginatedPlayers.length} players on page ${currentPage}`)

      setPlayers(paginatedPlayers)
    },
    [filters, sortColumn, sortDirection, currentPage, itemsPerPage],
  )

  // Re-apply filters when filters, sorting, or pagination changes
  useEffect(() => {
    if (allPlayers.length > 0) {
      applyFiltersAndPagination(allPlayers)
    }
  }, [allPlayers, applyFiltersAndPagination])

  // Initial data loading
  useEffect(() => {
    fetchAllPlayers()
    fetchWatchlistStatus()
  }, [fetchAllPlayers, fetchWatchlistStatus])

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  // Handle player row click
  const handlePlayerRowClick = (player: Player) => {
    setSelectedPlayer(player)
  }

  // Handle modal close
  const handleCloseModal = () => {
    setSelectedPlayer(null)
  }

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  // Generate pagination items
  const paginationItems = useMemo(() => {
    const items = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              isActive={i === currentPage}
              onClick={(e) => {
                e.preventDefault()
                setCurrentPage(i)
              }}
            >
              {i}
            </PaginationLink>
          </PaginationItem>,
        )
      }
    } else {
      // Show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            href="#"
            isActive={1 === currentPage}
            onClick={(e) => {
              e.preventDefault()
              setCurrentPage(1)
            }}
          >
            1
          </PaginationLink>
        </PaginationItem>,
      )

      // Show ellipsis or pages
      if (currentPage > 3) {
        items.push(<PaginationEllipsis key="start-ellipsis" />)
      }

      // Show current page and surrounding pages
      const startPage = Math.max(2, currentPage - 1)
      const endPage = Math.min(totalPages - 1, currentPage + 1)

      for (let i = startPage; i <= endPage; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              href="#"
              isActive={i === currentPage}
              onClick={(e) => {
                e.preventDefault()
                setCurrentPage(i)
              }}
            >
              {i}
            </PaginationLink>
          </PaginationItem>,
        )
      }

      // Show ellipsis or pages
      if (currentPage < totalPages - 2) {
        items.push(<PaginationEllipsis key="end-ellipsis" />)
      }

      // Show last page
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            href="#"
            isActive={totalPages === currentPage}
            onClick={(e) => {
              e.preventDefault()
              setCurrentPage(totalPages)
            }}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>,
      )
    }

    return items
  }, [currentPage, totalPages])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Filter className="mr-2 h-5 w-5" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label htmlFor="playerNameSearch">Player Name</Label>
            <Input
              id="playerNameSearch"
              placeholder="Search players..."
              value={filters.name}
              onChange={(e) => handleFilterChange("name", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="positionFilter">Position</Label>
            <Select value={filters.position} onValueChange={(value) => handleFilterChange("position", value)}>
              <SelectTrigger id="positionFilter">
                <SelectValue placeholder="Any Position" />
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
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="footFilter">Preferred Foot</Label>
            <Select value={filters.foot} onValueChange={(value) => handleFilterChange("foot", value)}>
              <SelectTrigger id="footFilter">
                <SelectValue placeholder="Any Foot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Foot</SelectItem>
                <SelectItem value="Left">Left</SelectItem>
                <SelectItem value="Right">Right</SelectItem>
                <SelectItem value="Both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="minHeight">Min Height (cm)</Label>
              <Input
                id="minHeight"
                type="number"
                placeholder="Min"
                value={filters.minHeight}
                onChange={(e) => handleFilterChange("minHeight", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxHeight">Max Height (cm)</Label>
              <Input
                id="maxHeight"
                type="number"
                placeholder="Max"
                value={filters.maxHeight}
                onChange={(e) => handleFilterChange("maxHeight", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="minAge">Min Age</Label>
              <Input
                id="minAge"
                type="number"
                placeholder="Min"
                value={filters.minAge}
                onChange={(e) => handleFilterChange("minAge", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxAge">Max Age</Label>
              <Input
                id="maxAge"
                type="number"
                placeholder="Max"
                value={filters.maxAge}
                onChange={(e) => handleFilterChange("maxAge", e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => {
                setCurrentPage(1)
                if (allPlayers.length > 0) {
                  applyFiltersAndPagination(allPlayers)
                }
              }}
            >
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Players ({loading ? "..." : totalCount})</CardTitle>
          <CardDescription>Browse all players and add to your watchlist.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-[#31348D]" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && !error && players.length === 0 && (
            <p className="text-center text-muted-foreground py-10">No players found matching your filters.</p>
          )}

          {!loading && !error && players.length > 0 && (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                        Name <ArrowUpDown className="inline h-4 w-4 ml-1" />
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort("club_name")}>
                        Club <ArrowUpDown className="inline h-4 w-4 ml-1" />
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort("position")}>
                        Position <ArrowUpDown className="inline h-4 w-4 ml-1" />
                      </TableHead>
                      <TableHead className="text-center cursor-pointer" onClick={() => handleSort("stats->age")}>
                        Age <ArrowUpDown className="inline h-4 w-4 ml-1" />
                      </TableHead>
                      <TableHead className="text-center cursor-pointer" onClick={() => handleSort("stats->height")}>
                        Height <ArrowUpDown className="inline h-4 w-4 ml-1" />
                      </TableHead>
                      <TableHead
                        className="text-center cursor-pointer"
                        onClick={() => handleSort("stats->avg_percentile")}
                      >
                        FootyLabs Score <ArrowUpDown className="inline h-4 w-4 ml-1" />
                      </TableHead>
                      <TableHead className="text-center">Watchlist</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {players.map((player) => (
                      <TableRow
                        key={player.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handlePlayerRowClick(player)}
                      >
                        <TableCell className="font-medium">{player.name}</TableCell>
                        <TableCell>{player.club_name || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{player.position}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{player.age || "N/A"}</TableCell>
                        <TableCell className="text-center">{player.height ? `${player.height} cm` : "N/A"}</TableCell>
                        <TableCell className="text-center">
                          <span className={getScoreColor(player.stats?.avg_percentile)}>
                            {formatFootylabsScore(player.stats?.avg_percentile)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              const isInWatchlist = watchlistPlayerIds.has(player.id)
                              toggleWatchlist(player.id, player.name, isInWatchlist)
                            }}
                            disabled={togglingWatchlist.has(player.id)}
                            className="p-1"
                          >
                            {togglingWatchlist.has(player.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Star
                                className={`h-4 w-4 ${
                                  watchlistPlayerIds.has(player.id)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-400 hover:text-yellow-400"
                                }`}
                              />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <Pagination className="mt-6">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }}
                        aria-disabled={currentPage === 1}
                        tabIndex={currentPage === 1 ? -1 : undefined}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                      />
                    </PaginationItem>
                    {paginationItems}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                        }}
                        aria-disabled={currentPage === totalPages}
                        tabIndex={currentPage === totalPages ? -1 : undefined}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Player Detail Modal */}
      <PlayerDetailModal isOpen={!!selectedPlayer} onClose={handleCloseModal} player={selectedPlayer} />
    </div>
  )
}
