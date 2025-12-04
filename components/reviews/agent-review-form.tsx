"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { StarRatingInput } from "./star-rating-input"
import { MessageSquare, Briefcase, Compass, FileSignature, Eye, UserCircle, CheckCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AgentReviewFormProps {
  agentName: string
  playerProfileId: string // UUID from player_profiles
  onSuccess?: () => void
  onCancel?: () => void
}

const AGENT_CATEGORIES = [
  {
    key: "Communication",
    label: "Communication",
    icon: MessageSquare,
    description: "Responsiveness and clarity in communication"
  },
  {
    key: "Professionalism",
    label: "Professionalism",
    icon: Briefcase,
    description: "Professional conduct and behavior"
  },
  {
    key: "Career Guidance",
    label: "Career Guidance",
    icon: Compass,
    description: "Quality of advice for career development"
  },
  {
    key: "Contract Negotiation",
    label: "Contract Negotiation",
    icon: FileSignature,
    description: "Effectiveness in negotiating contracts and deals"
  },
  {
    key: "Transparency",
    label: "Transparency",
    icon: Eye,
    description: "Honesty about opportunities and fees"
  }
]

export function AgentReviewForm({
  agentName,
  playerProfileId,
  onSuccess,
  onCancel
}: AgentReviewFormProps) {
  const [overallRating, setOverallRating] = useState(0)
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>({
    "Communication": 0,
    "Professionalism": 0,
    "Career Guidance": 0,
    "Contract Negotiation": 0,
    "Transparency": 0
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
        .from("agent_reviews")
        .insert({
          agent_name: agentName,
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
              Thank you for reviewing {agentName}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-footylabs-darkblue to-footylabs-newblue text-white">
        <CardTitle className="flex items-center gap-2">
          <UserCircle className="h-5 w-5" />
          Review {agentName}
        </CardTitle>
        <CardDescription className="text-white/80">
          Help other players understand what it&apos;s like to work with this agent
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {AGENT_CATEGORIES.map(({ key, label, icon: Icon, description }) => (
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
              placeholder="Share your experience working with this agent - communication style, reliability, how they handled your career..."
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
