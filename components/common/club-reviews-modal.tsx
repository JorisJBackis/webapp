"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Star, StarHalf, Clock, Coins, Users, Building, AlertCircle } from 'lucide-react'

interface ClubReviewsModalProps {
  isOpen: boolean
  onClose: () => void
  clubId: number
  clubName: string
}

interface ClubReview {
  id: number
  overall_rating: number
  comment: string
  category_ratings: {
    'Salary Punctuality': number
    'Training Conditions': number  
    'Club Management': number
    'Fair Salary': number
  }
  created_at: string
}

interface ReviewSummary {
  averageRating: number
  totalReviews: number
  categoryAverages: {
    'Salary Punctuality': number
    'Training Conditions': number
    'Club Management': number
    'Fair Salary': number
  }
}

const StarRating = ({ rating }: { rating: number }) => {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  return (
    <div className="flex items-center">
      {Array(fullStars).fill(0).map((_, i) => (
        <Star key={`full-${i}`} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      ))}
      {hasHalfStar && <StarHalf className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
      {Array(emptyStars).fill(0).map((_, i) => (
        <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
      ))}
      <span className="ml-2 text-sm font-medium">{rating.toFixed(1)}</span>
    </div>
  )
}

const CategoryIcon = ({ category }: { category: string }) => {
  switch (category) {
    case 'Salary Punctuality':
      return <Clock className="h-4 w-4" />
    case 'Fair Salary':
      return <Coins className="h-4 w-4" />
    case 'Training Conditions':
      return <Users className="h-4 w-4" />
    case 'Club Management':
      return <Building className="h-4 w-4" />
    default:
      return <Star className="h-4 w-4" />
  }
}

export default function ClubReviewsModal({ isOpen, onClose, clubId, clubName }: ClubReviewsModalProps) {
  const [reviews, setReviews] = useState<ClubReview[]>([])
  const [summary, setSummary] = useState<ReviewSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (isOpen && clubId) {
      fetchReviews()
    }
  }, [isOpen, clubId])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      
      // Fetch club reviews
      const { data: reviewsData, error } = await supabase
        .from('club_reviews')
        .select('*')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setReviews(reviewsData || [])

      // Calculate summary
      if (reviewsData && reviewsData.length > 0) {
        const totalReviews = reviewsData.length
        const avgRating = reviewsData.reduce((sum, review) => sum + review.overall_rating, 0) / totalReviews
        
        const categoryTotals = {
          'Salary Punctuality': 0,
          'Training Conditions': 0,
          'Club Management': 0,
          'Fair Salary': 0
        }

        reviewsData.forEach(review => {
          Object.entries(review.category_ratings).forEach(([category, rating]) => {
            if (category in categoryTotals) {
              categoryTotals[category as keyof typeof categoryTotals] += rating as number
            }
          })
        })

        const categoryAverages = Object.entries(categoryTotals).reduce((acc, [category, total]) => {
          acc[category as keyof typeof categoryTotals] = total / totalReviews
          return acc
        }, {} as typeof categoryTotals)

        setSummary({
          averageRating: avgRating,
          totalReviews,
          categoryAverages
        })
      }

    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600'
    if (rating >= 3) return 'text-yellow-600' 
    return 'text-red-600'
  }

  const getRatingBadgeColor = (rating: number) => {
    if (rating >= 4) return 'bg-green-100 text-green-800'
    if (rating >= 3) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {clubName} - Player Reviews
          </DialogTitle>
          <DialogDescription>
            See what other players say about this club - the inside scoop on salary, training, and management
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-2">No reviews yet</p>
            <p className="text-muted-foreground">Be the first to share your experience at this club</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            {summary && (
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Overall Rating</h3>
                        <Badge className={getRatingBadgeColor(summary.averageRating)}>
                          {summary.totalReviews} review{summary.totalReviews !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="flex items-center mb-2">
                        <StarRating rating={summary.averageRating} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Based on {summary.totalReviews} player review{summary.totalReviews !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
                      <div className="space-y-3">
                        {Object.entries(summary.categoryAverages).map(([category, rating]) => (
                          <div key={category} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CategoryIcon category={category} />
                              <span className="text-sm">{category}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={(rating / 5) * 100} className="w-20" />
                              <span className={`text-sm font-medium ${getRatingColor(rating)}`}>
                                {rating.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Individual Reviews */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Player Reviews</h3>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-3">
                        <StarRating rating={review.overall_rating} />
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <p className="text-sm mb-4 leading-relaxed">{review.comment}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t">
                        {Object.entries(review.category_ratings).map(([category, rating]) => (
                          <div key={category} className="text-center">
                            <div className="flex items-center justify-center mb-1">
                              <CategoryIcon category={category} />
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">{category}</p>
                            <p className={`text-sm font-medium ${getRatingColor(rating as number)}`}>
                              {rating}/5
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}