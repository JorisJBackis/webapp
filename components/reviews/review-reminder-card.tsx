"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, X, Shield } from "lucide-react"

interface ReviewReminderCardProps {
  clubName: string
  agencyName?: string | null
  hasClubReview: boolean
  hasAgencyReview: boolean
  onReviewClub: () => void
  onReviewAgency?: () => void
}

const DISMISS_KEY = "review_reminder_dismissed"
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

export function ReviewReminderCard({
  clubName,
  agencyName,
  hasClubReview,
  hasAgencyReview,
  onReviewClub,
  onReviewAgency
}: ReviewReminderCardProps) {
  const [isDismissed, setIsDismissed] = useState(true) // Start hidden to avoid flash

  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt)
      if (elapsed < DISMISS_DURATION) {
        setIsDismissed(true)
        return
      }
    }
    setIsDismissed(false)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
    setIsDismissed(true)
  }

  // Don't show if both reviews are done or if dismissed
  if (isDismissed || (hasClubReview && (hasAgencyReview || !agencyName))) {
    return null
  }

  const needsClubReview = !hasClubReview
  const needsAgencyReview = agencyName && !hasAgencyReview

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-800/30">
              <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">
                Help make football more transparent
              </p>
              <p className="text-xs text-muted-foreground">
                Share your anonymous experience to help other players.
              </p>
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Shield className="w-3 h-3" />
                100% anonymous
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {needsClubReview && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onReviewClub}
                    className="h-7 text-xs bg-white dark:bg-background"
                  >
                    <Star className="w-3 h-3 mr-1 text-amber-500" />
                    Review {clubName}
                  </Button>
                )}
                {needsAgencyReview && onReviewAgency && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onReviewAgency}
                    className="h-7 text-xs bg-white dark:bg-background"
                  >
                    <Star className="w-3 h-3 mr-1 text-amber-500" />
                    Review {agencyName}
                  </Button>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
