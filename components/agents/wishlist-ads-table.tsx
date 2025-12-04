"use client"

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlusCircle } from "lucide-react"
import CreateAdModal from "./create-ad-from-wishlist-modal"

type WatchlistPlayer = {
  watchlist_id: number
  club_id: number
  club_name: string
  player_id: number
  player_name: string
  player_position: string
  wyscout_player_id: number
  player_club_id: number | null
  player_club_name: string | null
  added_to_watchlist_at: string
  is_in_roster: boolean
}

interface WishlistAdsTableProps {
  players: WatchlistPlayer[]
  agentId: string | null
  onAdCreated: () => void
}

export default function WishlistAdsTable({ players, agentId, onAdCreated }: WishlistAdsTableProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<WatchlistPlayer | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const handleCreateAd = (player: WatchlistPlayer) => {
    setSelectedPlayer(player)
    setShowCreateModal(true)
  }

  const handleModalClose = () => {
    setShowCreateModal(false)
    setSelectedPlayer(null)
  }

  const handleAdCreated = () => {
    onAdCreated()
    handleModalClose()
  }

  // Group players by club
  const playersByClub = players.reduce((acc, player) => {
    if (!acc[player.club_id]) {
      acc[player.club_id] = {
        club_id: player.club_id,
        club_name: player.club_name,
        players: []
      }
    }
    acc[player.club_id].players.push(player)
    return acc
  }, {} as Record<number, { club_id: number; club_name: string; players: WatchlistPlayer[] }>)

  return (
    <>
      <div className="space-y-6">
        {Object.values(playersByClub).map((clubGroup) => (
          <div key={clubGroup.club_id} className="space-y-2">
            <h3 className="text-lg font-semibold text-primary">{clubGroup.club_name}</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Current Club</TableHead>
                    <TableHead>Added to Watchlist</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clubGroup.players.map((player) => (
                    <TableRow key={player.watchlist_id}>
                      <TableCell className="font-medium">{player.player_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{player.player_position}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {player.player_club_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(player.added_to_watchlist_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleCreateAd(player)}
                          className="gap-2"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Create Ad
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && selectedPlayer && agentId && (
        <CreateAdModal
          isOpen={showCreateModal}
          onClose={handleModalClose}
          player={selectedPlayer}
          agentId={agentId}
          onAdCreated={handleAdCreated}
        />
      )}
    </>
  )
}


