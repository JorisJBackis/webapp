"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Loader2, AlertCircle, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// UI Components
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Import the player detail modal
import PlayerDetailModal, { type PlayerDataForModal } from "@/components/common/player-detail-modal"

type WatchlistPlayer = {
  id: number
  name: string
  position: string
  club_name?: string
  club_league?: string
  stats?: any
  watchlist_id: number
  wyscout_player_id?: number
  club_id?: number
}

export default function MyWatchlist({ userClubId }: { userClubId: number }) {
  const [players, setPlayers] = useState<WatchlistPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set())

  // Modal state
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDataForModal | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()

  // Fetch watchlist players
  const fetchWatchlistPlayers = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("Fetching watchlist for club ID:", userClubId)

      const { data, error } = await supabase
        .from("watchlist")
        .select(`
          id,
          player_id,
          players:player_id (
            id,
            name,
            position,
            stats,
            wyscout_player_id,
            club_id,
            clubs:club_id (
              name,
              league
            )
          )
        `)
        .eq("club_id", userClubId)

      if (error) throw error

      // Process results
      const processedPlayers =
        data?.map((item) => ({
          id: item.players.id,
          name: item.players.name,
          position: item.players.position,
          club_name: item.players.clubs?.name || "Unknown Club",
          club_league: item.players.clubs?.league || "Unknown League",
          stats: item.players.stats,
          wyscout_player_id: item.players.wyscout_player_id,
          club_id: item.players.club_id,
          watchlist_id: item.id,
        })) || []

      setPlayers(processedPlayers)
      console.log(`Loaded ${processedPlayers.length} watchlist players`)
    } catch (err: any) {
      console.error("Error fetching watchlist players:", err)
      setError(`Failed to load watchlist: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Remove player from watchlist
  const removeFromWatchlist = async (watchlistId: number, playerName: string) => {
    setRemovingIds((prev) => new Set(prev).add(watchlistId))

    try {
      const { error } = await supabase.from("watchlist").delete().eq("id", watchlistId)

      if (error) throw error

      // Update local state
      setPlayers((prev) => prev.filter((p) => p.watchlist_id !== watchlistId))

      toast({
        title: "Player removed",
        description: `${playerName} has been removed from your watchlist.`,
      })
    } catch (err: any) {
      console.error("Error removing from watchlist:", err)
      toast({
        title: "Error",
        description: `Could not remove player: ${err.message}`,
        variant: "destructive",
      })
    } finally {
      setRemovingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(watchlistId)
        return newSet
      })
    }
  }

  // Handle player row click to open modal
  const handlePlayerClick = (player: WatchlistPlayer) => {
    const playerForModal: PlayerDataForModal = {
      id: player.id,
      name: player.name,
      position: player.position,
      player_pos: player.position,
      stats: player.stats,
      club_id: player.club_id,
      wyscout_player_id: player.wyscout_player_id,
      player_league_name: player.club_league,
    }

    setSelectedPlayer(playerForModal)
    setIsModalOpen(true)
  }

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedPlayer(null)
  }

  // Initial data loading
  useEffect(() => {
    if (userClubId) {
      fetchWatchlistPlayers()
    }
  }, [userClubId])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Watchlist ({players.length})</CardTitle>
          <CardDescription>Players you're keeping an eye on. Click on a player to view detailed stats.</CardDescription>
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
            <div className="text-center py-10">
              <p className="text-muted-foreground mb-4">Your watchlist is empty.</p>
              <p className="text-sm text-muted-foreground">
                Add players to your watchlist by clicking the star icon in the Browse Players tab.
              </p>
            </div>
          )}

          {!loading && !error && players.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead>League</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((player) => (
                    <TableRow
                      key={player.watchlist_id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handlePlayerClick(player)}
                    >
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell>{player.club_name}</TableCell>
                      <TableCell>{player.club_league}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{player.position}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation() // Prevent row click when clicking remove button
                            removeFromWatchlist(player.watchlist_id, player.name)
                          }}
                          disabled={removingIds.has(player.watchlist_id)}
                          className="p-1 hover:bg-red-50 hover:text-red-600"
                        >
                          {removingIds.has(player.watchlist_id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player Detail Modal */}
      <PlayerDetailModal isOpen={isModalOpen} onClose={handleCloseModal} player={selectedPlayer} />
    </div>
  )
}
