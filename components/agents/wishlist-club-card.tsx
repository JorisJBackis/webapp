"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Edit2, Trash2, Eye, PlusCircle, ChevronDown, ChevronUp, User } from 'lucide-react'
import WishlistFilterSummary, { WishlistFilters } from './wishlist-filter-summary'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Type for a matching player preview
export interface MatchingPlayerPreview {
  player_id: number
  player_name: string
  picture_url: string | null
  match_score: number
}

// Type for a position (child wishlist)
export interface WishlistPosition {
  id: number
  name: string
  filters: WishlistFilters
  created_at: string
  matching_player_count?: number
  matching_players?: MatchingPlayerPreview[]
}

// Type for a club with positions
export interface WishlistClub {
  id: number
  name: string
  club_logo_url: string | null
  base_filters: WishlistFilters
  created_at: string
  updated_at: string
  positions: WishlistPosition[]
}

interface WishlistClubCardProps {
  club: WishlistClub
  onEditClub: (club: WishlistClub) => void
  onDeleteClub: (clubId: number) => Promise<void>
  onAddPosition: (club: WishlistClub) => void
  onEditPosition: (club: WishlistClub, position: WishlistPosition) => void
  onDeletePosition: (positionId: number) => Promise<void>
  onViewMatches: (club: WishlistClub, position: WishlistPosition) => void
}

export default function WishlistClubCard({
  club,
  onEditClub,
  onDeleteClub,
  onAddPosition,
  onEditPosition,
  onDeletePosition,
  onViewMatches
}: WishlistClubCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [deleteClubDialog, setDeleteClubDialog] = useState(false)
  const [deletePosition, setDeletePosition] = useState<WishlistPosition | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteClub = async () => {
    setIsDeleting(true)
    try {
      await onDeleteClub(club.id)
    } finally {
      setIsDeleting(false)
      setDeleteClubDialog(false)
    }
  }

  const handleDeletePosition = async () => {
    if (!deletePosition) return
    setIsDeleting(true)
    try {
      await onDeletePosition(deletePosition.id)
    } finally {
      setIsDeleting(false)
      setDeletePosition(null)
    }
  }

  const hasBaseFilters = Object.values(club.base_filters || {}).some(v =>
    v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : true)
  )

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {club.club_logo_url && (
                <img
                  src={club.club_logo_url}
                  alt=""
                  className="h-10 w-10 object-contain rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              )}
              <div>
                <CardTitle className="text-lg">{club.name}</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {club.positions.length} position{club.positions.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddPosition(club)}
              >
                <PlusCircle className="h-4 w-4 mr-1" />
                Add Position
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEditClub(club)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDeleteClubDialog(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Base Filters Summary */}
          {hasBaseFilters && (
            <div className="mt-3 pt-3 border-t">
              <div className="text-xs text-muted-foreground mb-1">Base filters (apply to all positions):</div>
              <WishlistFilterSummary filters={club.base_filters} compact />
            </div>
          )}
        </CardHeader>

        {expanded && (
          <CardContent className="pt-0">
            {club.positions.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground border rounded-md">
                <p>No positions added yet</p>
                <p className="text-sm">Add a position to start matching players</p>
              </div>
            ) : (
              <div className="space-y-2">
                {club.positions.map((position) => (
                  <div
                    key={position.id}
                    className="p-3 border rounded-md hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{position.name}</div>
                        <WishlistFilterSummary filters={position.filters} compact />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={position.matching_player_count ? "default" : "secondary"}>
                          {position.matching_player_count ?? 0} matches
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewMatches(club, position)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEditPosition(club, position)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletePosition(position)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Player Previews */}
                    {position.matching_players && position.matching_players.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-1 flex-wrap">
                          <TooltipProvider delayDuration={100}>
                            {position.matching_players.slice(0, 8).map((player) => (
                              <Tooltip key={player.player_id}>
                                <TooltipTrigger asChild>
                                  <div className="relative cursor-pointer">
                                    <Avatar className="h-12 w-12 border-2 border-background">
                                      <AvatarImage
                                        src={player.picture_url || undefined}
                                        alt={player.player_name}
                                        // className="object-cover"
                                      />
                                      <AvatarFallback className="text-xs">
                                        <User className="h-5 w-5" />
                                      </AvatarFallback>
                                    </Avatar>
                                    <Badge
                                      className={`absolute -bottom-1 -right-1 h-5 min-w-5 px-1 text-[10px] font-bold ${
                                        player.match_score >= 80 ? 'bg-green-500 hover:bg-green-500' :
                                        player.match_score >= 50 ? 'bg-yellow-500 hover:bg-yellow-500 text-black' :
                                        'bg-red-500 hover:bg-red-500'
                                      }`}
                                    >
                                      {player.match_score}%
                                    </Badge>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-center">
                                  <p className="font-medium">{player.player_name}</p>
                                  <p className="text-xs text-muted-foreground">{player.match_score}% match</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                            {position.matching_players.length > 8 && (
                              <div
                                className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium cursor-pointer"
                                onClick={() => onViewMatches(club, position)}
                              >
                                +{position.matching_players.length - 8}
                              </div>
                            )}
                          </TooltipProvider>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Delete Club Dialog */}
      <AlertDialog open={deleteClubDialog} onOpenChange={setDeleteClubDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Club</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{club.name}"? This will also delete all {club.positions.length} position(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClub}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Position Dialog */}
      <AlertDialog open={!!deletePosition} onOpenChange={() => setDeletePosition(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Position</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletePosition?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePosition}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
