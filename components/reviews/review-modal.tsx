"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { StarRatingInput } from "./star-rating-input"
import {
  MessageSquare,
  Briefcase,
  Compass,
  FileSignature,
  DollarSign,
  Clock,
  Dumbbell,
  Users,
  CheckCircle,
  Loader2,
  Trash2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ReviewModalProps {
  isOpen: boolean
  onClose: () => void
  onReviewChange?: () => void  // Callback when review is added/updated/deleted
  type: 'club' | 'agency'
  targetId: number | null
  targetName: string
  playerProfileId: string
}

// Club review categories
const CLUB_CATEGORIES = [
  {
    key: "Salary Punctuality",
    label: "Salary Punctuality",
    icon: Clock,
    description: "Are salaries paid on time?"
  },
  {
    key: "Fair Salary",
    label: "Fair Salary",
    icon: DollarSign,
    description: "Is the salary fair for your role?"
  },
  {
    key: "Training Conditions",
    label: "Training Conditions",
    icon: Dumbbell,
    description: "Quality of facilities and training"
  },
  {
    key: "Club Management",
    label: "Club Management",
    icon: Users,
    description: "How well is the club managed?"
  }
]

// Agency review categories - 4 most crucial
const AGENCY_CATEGORIES = [
  {
    key: "Communication",
    label: "Communication",
    icon: MessageSquare,
    description: "Responsiveness and clarity"
  },
  {
    key: "Contract Negotiation",
    label: "Contract Negotiation",
    icon: FileSignature,
    description: "Effectiveness in negotiations"
  },
  {
    key: "Career Guidance",
    label: "Career Guidance",
    icon: Compass,
    description: "Quality of career advice"
  },
  {
    key: "Professionalism",
    label: "Professionalism",
    icon: Briefcase,
    description: "Professional conduct and reliability"
  }
]

export function ReviewModal({
  isOpen,
  onClose,
  onReviewChange,
  type,
  targetId,
  targetName,
  playerProfileId
}: ReviewModalProps) {
  const categories = type === 'club' ? CLUB_CATEGORIES : AGENCY_CATEGORIES

  const [overallRating, setOverallRating] = useState(0)
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>(
    Object.fromEntries(categories.map(c => [c.key, 0]))
  )
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingReviewId, setExistingReviewId] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const supabase = createClient()

  // Fetch existing review when modal opens
  useEffect(() => {
    const fetchExistingReview = async () => {
      if (!isOpen || !targetId || !playerProfileId) return

      // Reset form to correct category keys for this type
      setOverallRating(0)
      setCategoryRatings(Object.fromEntries(categories.map(c => [c.key, 0])))
      setComment("")
      setExistingReviewId(null)
      setIsEditing(false)
      setIsLoading(true)
      setError(null)

      try {
        if (type === 'club') {
          const { data, error: fetchError } = await supabase
            .from("club_reviews")
            .select("id, overall_rating, category_ratings, comment")
            .eq("club_transfermarkt_id", targetId)
            .eq("player_profile_id", playerProfileId)
            .single()

          if (fetchError && fetchError.code !== 'PGRST116') {
            // PGRST116 = no rows found, which is fine
            console.error("Error fetching existing review:", fetchError)
          }

          if (data) {
            setExistingReviewId(data.id)
            setOverallRating(data.overall_rating)
            setCategoryRatings(data.category_ratings || {})
            setComment(data.comment || "")
            setIsEditing(true)
          }
        } else {
          const { data, error: fetchError } = await supabase
            .from("agent_reviews")
            .select("id, overall_rating, category_ratings, comment")
            .eq("agency_id", targetId)
            .eq("player_profile_id", playerProfileId)
            .single()

          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error("Error fetching existing review:", fetchError)
          }

          if (data) {
            setExistingReviewId(data.id)
            setOverallRating(data.overall_rating)
            setCategoryRatings(data.category_ratings || {})
            setComment(data.comment || "")
            setIsEditing(true)
          }
        }
      } catch (err) {
        console.error("Error in fetchExistingReview:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchExistingReview()
  }, [isOpen, targetId, playerProfileId, type])

  const handleCategoryChange = (key: string, value: number) => {
    setCategoryRatings(prev => ({ ...prev, [key]: value }))
  }

  // Compute validity directly instead of using a function (fixes closure bug)
  const allCategoriesRated = Object.values(categoryRatings).every(v => v > 0)
  const isFormValid = overallRating > 0 && allCategoriesRated

  const resetForm = () => {
    setOverallRating(0)
    setCategoryRatings(Object.fromEntries(categories.map(c => [c.key, 0])))
    setComment("")
    setError(null)
    setIsSubmitted(false)
    setIsDeleted(false)
    setExistingReviewId(null)
    setIsEditing(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid || !targetId) {
      setError("Please rate all categories")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (type === 'club') {
        if (isEditing && existingReviewId) {
          // Update existing review
          const { error: updateError } = await supabase
            .from("club_reviews")
            .update({
              overall_rating: overallRating,
              category_ratings: categoryRatings,
              comment: comment.trim() || null,
            })
            .eq("id", existingReviewId)

          if (updateError) throw updateError
        } else {
          // Insert new review
          const { error: insertError } = await supabase
            .from("club_reviews")
            .insert({
              club_transfermarkt_id: targetId,
              player_profile_id: playerProfileId,
              overall_rating: overallRating,
              category_ratings: categoryRatings,
              comment: comment.trim() || null,
              is_dummy: false
            })

          if (insertError) throw insertError
        }
      } else {
        if (isEditing && existingReviewId) {
          // Update existing review
          const { error: updateError } = await supabase
            .from("agent_reviews")
            .update({
              overall_rating: overallRating,
              category_ratings: categoryRatings,
              comment: comment.trim() || null,
            })
            .eq("id", existingReviewId)

          if (updateError) throw updateError
        } else {
          // Insert new review
          const { error: insertError } = await supabase
            .from("agent_reviews")
            .insert({
              agency_id: targetId,
              agent_name: targetName,
              player_profile_id: playerProfileId,
              overall_rating: overallRating,
              category_ratings: categoryRatings,
              comment: comment.trim() || null,
              is_dummy: false
            })

          if (insertError) throw insertError
        }
      }

      setIsSubmitted(true)
      onReviewChange?.()
    } catch (err: any) {
      console.error("Error submitting review:", JSON.stringify(err, null, 2))
      setError(err?.message || "Failed to submit review. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!existingReviewId) return

    setIsDeleting(true)
    setError(null)

    try {
      if (type === 'club') {
        const { error: deleteError } = await supabase
          .from("club_reviews")
          .delete()
          .eq("id", existingReviewId)

        if (deleteError) throw deleteError
      } else {
        const { error: deleteError } = await supabase
          .from("agent_reviews")
          .delete()
          .eq("id", existingReviewId)

        if (deleteError) throw deleteError
      }

      setIsDeleted(true)
      onReviewChange?.()
    } catch (err: any) {
      console.error("Error deleting review:", JSON.stringify(err, null, 2))
      setError(err?.message || "Failed to delete review. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <DialogHeader className="sr-only">
              <DialogTitle>Loading Review</DialogTitle>
            </DialogHeader>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isSubmitted || isDeleted ? (
          <div className="text-center py-8">
            <DialogHeader className="sr-only">
              <DialogTitle>{isDeleted ? "Review Deleted" : isEditing ? "Review Updated" : "Review Submitted"}</DialogTitle>
            </DialogHeader>
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h3 className="text-xl font-semibold mb-2">
              {isDeleted ? "Review Deleted!" : isEditing ? "Review Updated!" : "Review Submitted!"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {isDeleted
                ? `Your review for ${targetName} has been removed`
                : `Thank you for reviewing ${targetName}`}
            </p>
            <Button onClick={handleClose}>Close</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {isEditing ? `Edit Review for ${targetName}` : `Review ${targetName}`}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Update your review below"
                  : type === 'club'
                    ? "Share your experience with this club"
                    : "Help other players understand what it's like to work with this agency"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5 mt-4">
              {/* Overall Rating */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Overall Rating</Label>
                <StarRatingInput
                  value={overallRating}
                  onChange={setOverallRating}
                  size="lg"
                />
              </div>

              {/* Category Ratings */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Category Ratings</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {categories.map(({ key, label, icon: Icon, description }) => (
                    <div
                      key={key}
                      className={cn(
                        "p-3 rounded-lg border transition-colors",
                        categoryRatings[key] > 0
                          ? "border-primary/30 bg-primary/5"
                          : "border-border bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{description}</p>
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
              <div className="space-y-2">
                <Label htmlFor="comment" className="text-base font-semibold">
                  Your Experience (Optional)
                </Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={type === 'club'
                    ? "Share your experience at this club..."
                    : "Share your experience with this agency..."}
                  className="min-h-[80px] resize-none"
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {comment.length}/2000
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 justify-between pt-2">
                <div>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={handleDelete}
                      disabled={isDeleting || isSubmitting}
                      title="Delete Review"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isFormValid || isSubmitting || isDeleting}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isEditing ? "Updating..." : "Submitting..."}
                      </>
                    ) : (
                      isEditing ? "Update Review" : "Submit Review"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
