"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Shield, Star, Heart, X } from "lucide-react"

interface ReviewPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onReviewClub: () => void
  onReviewAgency?: () => void
  clubName: string
  agencyName?: string | null
}

export function ReviewPromptModal({
  isOpen,
  onClose,
  onReviewClub,
  onReviewAgency,
  clubName,
  agencyName
}: ReviewPromptModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Heart className="w-5 h-5 text-red-500" />
            Help Fellow Players
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Share your experience to make the world of football more transparent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Anonymity guarantee */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-300 text-sm">
                100% Anonymous
              </p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                Your identity is never revealed. Only your ratings and feedback are shared.
              </p>
            </div>
          </div>

          {/* Why it matters */}
          <p className="text-sm text-muted-foreground">
            Your honest review helps other players make informed decisions about clubs and agencies.
            It only takes a minute!
          </p>

          {/* Review buttons */}
          <div className="space-y-2 pt-2">
            <Button
              onClick={onReviewClub}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <Star className="w-4 h-4 text-amber-500" />
              Review {clubName}
            </Button>

            {agencyName && onReviewAgency && (
              <Button
                onClick={onReviewAgency}
                className="w-full justify-start gap-2"
                variant="outline"
              >
                <Star className="w-4 h-4 text-amber-500" />
                Review {agencyName}
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
