"use client"

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Edit2, Trash2, Eye, Users } from "lucide-react"
import WishlistFilterSummary from './wishlist-filter-summary'
import { AgentWishlist } from './wishlist-form-modal'

interface WishlistListTableProps {
  wishlists: AgentWishlist[]
  onEdit: (wishlist: AgentWishlist) => void
  onDelete: (wishlistId: number) => Promise<void>
  onViewMatches: (wishlist: AgentWishlist) => void
}

export default function WishlistListTable({
  wishlists,
  onEdit,
  onDelete,
  onViewMatches
}: WishlistListTableProps) {
  const [deleteWishlist, setDeleteWishlist] = useState<AgentWishlist | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteConfirm = async () => {
    if (!deleteWishlist) return

    setIsDeleting(true)
    try {
      await onDelete(deleteWishlist.id)
    } finally {
      setIsDeleting(false)
      setDeleteWishlist(null)
    }
  }

  if (wishlists.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg mb-2">No wishlists yet</p>
        <p>Create your first wishlist to find matching players in your roster</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Wishlist Name</TableHead>
              <TableHead>Filters</TableHead>
              <TableHead className="text-center">Matching Players</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {wishlists.map((wishlist) => (
              <TableRow key={wishlist.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {wishlist.club_logo_url && (
                      <img
                        src={wishlist.club_logo_url}
                        alt=""
                        className="h-8 w-8 object-contain rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    )}
                    <span className="font-medium">{wishlist.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <WishlistFilterSummary filters={wishlist.filters} compact />
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={wishlist.matching_player_count && wishlist.matching_player_count > 0 ? "default" : "secondary"}
                  >
                    {wishlist.matching_player_count ?? 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(wishlist.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewMatches(wishlist)}
                      className="gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(wishlist)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteWishlist(wishlist)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteWishlist} onOpenChange={() => setDeleteWishlist(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Wishlist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteWishlist?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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
