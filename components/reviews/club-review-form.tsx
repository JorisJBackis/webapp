"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { StarRatingInput } from "./star-rating-input"
import { Clock, Coins, Users, Building, CheckCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ClubReviewFormProps {
  clubId: number
  clubName: string
  playerProfileId: string // UUID from player_profiles
  onSuccess?: () => void
  onCancel?: () => void
}

const CLUB_CATEGORIES = [
  { key: "Salary Punctuality", label: "Salary Punctuality", icon: Clock, description: "Are salaries paid on time?" },
  { key: "Fair Salary", label: "Fair Salary", icon: Coins, description: "Is the compensation fair for the level?" },
  { key: "Training Conditions", label: "Training Conditions", icon: Users, description: "Quality of facilities and training" },
  { key: "Club Management", label: "Club Management", icon: Building, description: "Professionalism of management" }
]

export function ClubReviewForm({
  clubId,
  clubName,
  playerProfileId,
  onSuccess,
  onCancel
}: ClubReviewFormProps) {
  const [overallRating, setOverallRating] = useState(0)
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>({
    "Salary Punctuality": 0,
    "Fair Salary": 0,
    "Training Conditions": 0,
    "Club Management": 0
  })
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const handleCategoryChange = (key: string, value: number) => {
    setCategoryRatings(prev => ({ ...prev, [key]: value }))
  }

  const isValid = () => {
    return overallRating > 0 && Object.values(categoryRatings).every(v => v > 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid()) {
      setError("Please rate all categories")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: insertError } = await supabase
        .from("club_reviews")
        .insert({
          club_id: clubId,
          player_profile_id: playerProfileId,
          overall_rating: overallRating,
          category_ratings: categoryRatings,
          comment: comment.trim() || null,
          is_dummy: false
        })

      if (insertError) throw insertError

      setIsSubmitted(true)
      onSuccess?.()
    } catch (err) {
      console.error("Error submitting review:", err)
      setError("Failed to submit review. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h3 className="text-xl font-semibold mb-2">Review Submitted!</h3>
            <p className="text-muted-foreground">
              Thank you for sharing your experience at {clubName}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-footylabs-darkblue to-footylabs-blue text-white">
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Review {clubName}
        </CardTitle>
        <CardDescription className="text-white/80">
          Share your experience to help other players make informed decisions
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Overall Rating */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Overall Rating</Label>
            <StarRatingInput
              value={overallRating}
              onChange={setOverallRating}
              size="lg"
            />
          </div>

          {/* Category Ratings */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Category Ratings</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              {CLUB_CATEGORIES.map(({ key, label, icon: Icon, description }) => (
                <div
                  key={key}
                  className={cn(
                    "p-4 rounded-lg border transition-colors",
                    categoryRatings[key] > 0
                      ? "border-footylabs-blue/30 bg-footylabs-blue/5"
                      : "border-border bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-footylabs-blue" />
                    <span className="font-medium text-sm">{label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{description}</p>
                  <StarRatingInput
                    value={categoryRatings[key]}
                    onChange={(value) => handleCategoryChange(key, value)}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-3">
            <Label htmlFor="comment" className="text-base font-semibold">
              Your Experience (Optional)
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share details about your time at the club - what was good, what could be improved..."
              className="min-h-[120px] resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/1000 characters
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={!isValid() || isSubmitting}
              className="bg-footylabs-blue hover:bg-footylabs-darkblue"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
