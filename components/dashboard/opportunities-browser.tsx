"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Briefcase, MapPin, Calendar, TrendingUp, Heart, ExternalLink, Filter, Target, Trophy, Star, TrendingUp as Growth, Users, Award, Zap, MessageCircle, StarIcon } from 'lucide-react'
import ClubReviewsModal from '@/components/common/club-reviews-modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Type from database functions
type Opportunity = Database['public']['Functions']['get_recruitment_needs']['Returns'][number]

interface FitReason {
  icon: any
  text: string
}

interface OpportunityWithFitScore extends Opportunity {
  fit_score: number
  fit_reasons: FitReason[]
  club_rating?: number
  review_count?: number
  posting_club_logo_url?: string | null
}

interface OpportunitiesBrowserProps {
  playerProfile: {
    playing_positions: string[]
    preferred_countries: string[]
    current_salary_range: string
    desired_salary_range?: string
    languages: string[]
  }
  userClubId?: number
}

// Mock function to calculate fit score based on player preferences
const calculateFitScore = (opportunity: Opportunity & { club_rating?: number, review_count?: number }, playerProfile: any): { score: number, reasons: FitReason[] } => {
  // Create consistent seed based on opportunity and player data
  const opportunitySeed = opportunity.need_id + (playerProfile.playing_positions?.[0]?.charCodeAt(0) || 0)
  const seededRandom = (min: number, max: number, offset = 0) => {
    const x = Math.sin(opportunitySeed + offset) * 10000
    return (x - Math.floor(x)) * (max - min) + min
  }

  let score = 60 // Base score
  const reasons: FitReason[] = []

  // Position match with icon
  if (playerProfile.playing_positions?.includes(opportunity.position_needed)) {
    score += 25
    reasons.push({
      icon: Target,
      text: `Perfect position match - You're exactly what they're looking for as a ${opportunity.position_needed}`
    })
  } else {
    const similarPositions: Record<string, string[]>  = {
      'Centre Forward': ['Winger', 'Attacking Midfielder'],
      'Winger': ['Centre Forward', 'Attacking Midfielder', 'Full Back'],
      'Centre Back': ['Full Back', 'Defensive Midfielder'],
      'Full Back': ['Centre Back', 'Winger', 'Defensive Midfielder'],
      'Central Midfielder': ['Attacking Midfielder', 'Defensive Midfielder'],
      'Attacking Midfielder': ['Central Midfielder', 'Centre Forward', 'Winger'],
      'Defensive Midfielder': ['Central Midfielder', 'Centre Back'],
      'Goalkeeper': []
    }
    
    if (playerProfile.playing_positions?.some((pos: string) => 
      similarPositions[pos]?.includes(opportunity.position_needed || '')
    )) {
      score += 10
      reasons.push({
        icon: Users,
        text: `Your ${playerProfile.playing_positions[0]} experience translates well to ${opportunity.position_needed}`
      })
    }
  }

  // Salary alignment with icon
  const playerSalaryPref = playerProfile.desired_salary_range || playerProfile.current_salary_range
  if (opportunity.salary_range && playerSalaryPref) {
    if (opportunity.salary_range === playerSalaryPref) {
      score += 15
      reasons.push({
        icon: TrendingUp,
        text: 'Salary range perfectly matches your current expectations'
      })
    } else if (opportunity.salary_range.includes('€') && playerSalaryPref.includes('€')) {
      score += 8
      reasons.push({
        icon: TrendingUp,
        text: 'Competitive salary package that could advance your career'
      })
    }
  }

  // Add compelling club-specific reasons with icons
  const clubReasons = [
    { icon: Trophy, text: 'Club has strong track record of developing players in your position' },
    { icon: Star, text: 'Perfect stepping stone to top European leagues' },
    { icon: Growth, text: 'Club showing upward trajectory with recent investments' },
    { icon: Award, text: 'Excellent coaching staff known for tactical development' },
    { icon: MapPin, text: 'Great location with international exposure opportunities' },
    { icon: Heart, text: 'Club culture aligns with your professional values' },
    { icon: Zap, text: 'High probability of regular first-team appearances' },
    { icon: Target, text: 'Club specifically targeting players with your profile' },
    { icon: Users, text: 'Training facilities and sports science program match your needs' },
    { icon: Star, text: 'Strong network of scouts from bigger clubs regularly watch here' }
  ]

  // Add 1-3 compelling reasons based on seeded randomness
  const numReasons = Math.floor(seededRandom(1, 4))
  const selectedReasons: FitReason[] = []
  for (let i = 0; i < numReasons; i++) {
    const reasonIndex = Math.floor(seededRandom(0, clubReasons.length, i))
    if (!selectedReasons.includes(clubReasons[reasonIndex])) {
      selectedReasons.push(clubReasons[reasonIndex])
      score += seededRandom(3, 8, i + 10)
    }
  }
  reasons.push(...selectedReasons)

  // Country preference bonus
  if (playerProfile.preferred_countries?.length > 0) {
    // Mock country detection from club name
    const clubCountries: Record<string, string> = {
      'Valencia': 'Spain', 'Betis': 'Spain', 'Sevilla': 'Spain',
      'Ajax': 'Netherlands', 'PSV': 'Netherlands', 'Feyenoord': 'Netherlands',
      'Porto': 'Portugal', 'Benfica': 'Portugal', 'Sporting': 'Portugal',
      'Roma': 'Italy', 'Milan': 'Italy', 'Inter': 'Italy',
      'Lyon': 'France', 'Lille': 'France', 'Monaco': 'France'
    }
    
    const clubCountry = Object.entries(clubCountries).find(([club]) => 
      opportunity.posting_club_name.includes(club)
    )?.[1]
    
    if (clubCountry && playerProfile.preferred_countries.includes(clubCountry)) {
      score += 12
      reasons.push({
        icon: MapPin,
        text: `Located in ${clubCountry} - one of your preferred countries`
      })
    }
  }

  // Club rating bonus
  if (opportunity.club_rating && opportunity.review_count) {
    if (opportunity.club_rating >= 4.0 && opportunity.review_count >= 4) {
      score += 15
      reasons.push({
        icon: Award,
        text: `Highly-rated club with excellent player feedback (${opportunity.club_rating.toFixed(1)}/5.0)`
      })
    } else if (opportunity.club_rating >= 3.5) {
      score += 8
      reasons.push({
        icon: Trophy,
        text: `Well-regarded club with positive player reviews (${opportunity.club_rating.toFixed(1)}/5.0)`
      })
    }
  }

  return { score: Math.min(Math.round(score), 95), reasons }
}

const getFitScoreColor = (score: number) => {
  if (score >= 85) return 'bg-success hover:bg-success/90'
  if (score >= 70) return 'bg-yellow-500 hover:bg-yellow-500/90'
  return 'bg-gray-400 hover:bg-gray-400/90'
}

const getFitScoreLabel = (score: number) => {
  if (score >= 85) return 'Excellent Fit'
  if (score >= 70) return 'Good Fit'
  if (score >= 55) return 'Potential Fit'
  return 'Limited Fit'
}

const StarRating = ({ rating, size = "sm" }: { rating: number, size?: "sm" | "md" }) => {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)
  
  const starSize = size === "md" ? "h-4 w-4" : "h-3 w-3"

  return (
    <div className="flex items-center">
      {Array(fullStars).fill(0).map((_, i) => (
        <Star key={`full-${i}`} className={`${starSize} fill-yellow-400 text-yellow-400`} />
      ))}
      {hasHalfStar && <Star className={`${starSize} fill-yellow-400 text-yellow-400 opacity-50`} />}
      {Array(emptyStars).fill(0).map((_, i) => (
        <Star key={`empty-${i}`} className={`${starSize} text-gray-300`} />
      ))}
      <span className={`ml-1 font-medium ${size === "md" ? "text-sm" : "text-xs"}`}>
        {rating.toFixed(1)}
      </span>
    </div>
  )
}

const getRatingColor = (rating: number) => {
  if (rating >= 4) return 'text-green-600'
  if (rating >= 3) return 'text-yellow-600'
  return 'text-red-600'
}

export default function OpportunitiesBrowser({ playerProfile, userClubId }: OpportunitiesBrowserProps) {
  const [opportunities, setOpportunities] = useState<OpportunityWithFitScore[]>([])
  const [filteredOpportunities, setFilteredOpportunities] = useState<OpportunityWithFitScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savedOpportunities, setSavedOpportunities] = useState<Set<number>>(new Set())
  
  // Filters
  const [positionFilter, setPositionFilter] = useState('all')
  const [minFitScore, setMinFitScore] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')

  // Reviews modal state
  const [reviewsModal, setReviewsModal] = useState<{
    isOpen: boolean
    clubId: number
    clubName: string
  }>({ isOpen: false, clubId: 0, clubName: '' })

  const supabase = createClient()

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!supabase) return;

        // Use a dummy club ID if not provided (for the RPC function requirement)
        const { data, error: rpcError } = await supabase.rpc('get_recruitment_needs', {
          p_requesting_club_id: userClubId || 1
        })

        if (rpcError) throw rpcError

        // Fetch club ratings and logos for each opportunity
        const opportunitiesWithRatings = await Promise.all((data || []).map(async (opportunity) => {
          // Get club reviews to calculate rating
          const { data: reviews } = await supabase
            .from('club_reviews')
            .select('overall_rating')
            .eq('club_id', opportunity.created_by_club_id)

          // Get club logo
          const { data: club } = await supabase
            .from('clubs')
            .select('logo_url')
            .eq('id', opportunity.created_by_club_id)
            .single()

          let club_rating = undefined
          let review_count = 0

          if (reviews && reviews.length > 0) {
            review_count = reviews.length
            club_rating = reviews.reduce((sum, review) => sum + review.overall_rating, 0) / reviews.length
          }

          return {
            ...opportunity,
            club_rating,
            review_count,
            posting_club_logo_url: club?.logo_url
          }
        }))

        // Calculate fit scores for each opportunity
        const opportunitiesWithFit: OpportunityWithFitScore[] = opportunitiesWithRatings.map(opportunity => {
          const { score, reasons } = calculateFitScore(opportunity, playerProfile)
          return {
            ...opportunity,
            fit_score: score,
            fit_reasons: reasons
          }
        })

        // Sort by fit score (highest first)
        opportunitiesWithFit.sort((a, b) => b.fit_score - a.fit_score)

        setOpportunities(opportunitiesWithFit)
        setFilteredOpportunities(opportunitiesWithFit)
      } catch (err: any) {
        console.error('Error fetching opportunities:', err)
        setError('Failed to load opportunities')
      } finally {
        setLoading(false)
      }
    }

    fetchOpportunities()
  }, [playerProfile, userClubId])

  // Apply filters
  useEffect(() => {
    let filtered = opportunities

    // Position filter
    if (positionFilter !== 'all') {
      filtered = filtered.filter(opp => opp.position_needed === positionFilter)
    }

    // Fit score filter
    filtered = filtered.filter(opp => opp.fit_score >= minFitScore)

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(opp => 
        opp.posting_club_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.position_needed.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opp.notes && opp.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    setFilteredOpportunities(filtered)
  }, [opportunities, positionFilter, minFitScore, searchTerm])

  const toggleSaveOpportunity = (needId: number) => {
    const newSaved = new Set(savedOpportunities)
    if (newSaved.has(needId)) {
      newSaved.delete(needId)
    } else {
      newSaved.add(needId)
    }
    setSavedOpportunities(newSaved)
  }

  const getUniquePositions = () => {
    const positions = [...new Set(opportunities.map(opp => opp.position_needed))]
    return positions.sort()
  }

  const openReviewsModal = (clubId: number, clubName: string) => {
    setReviewsModal({ isOpen: true, clubId, clubName })
  }

  const closeReviewsModal = () => {
    setReviewsModal({ isOpen: false, clubId: 0, clubName: '' })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Career Opportunities</CardTitle>
          <CardDescription>Discover clubs looking for players like you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Career Opportunities</CardTitle>
          <CardDescription>Discover clubs looking for players like you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-red-600">
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Career Opportunities
              </CardTitle>
              <CardDescription>
                {filteredOpportunities.length} opportunities matched to your profile
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search clubs or roles</Label>
              <Input
                id="search"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="position">Position</Label>
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  {getUniquePositions().map(position => (
                    <SelectItem key={position} value={position}>
                      {position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fit">Minimum Fit Score</Label>
              <Select value={minFitScore.toString()} onValueChange={(value) => setMinFitScore(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any Fit</SelectItem>
                  <SelectItem value="70">Good Fit (70%+)</SelectItem>
                  <SelectItem value="85">Excellent Fit (85%+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={() => {
                setPositionFilter('all')
                setMinFitScore(0)
                setSearchTerm('')
              }}>
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Opportunities List */}
          <div className="space-y-4">
            {filteredOpportunities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No opportunities match your filters</p>
                <p>Try adjusting your search criteria or check back later for new opportunities</p>
              </div>
            ) : (
              filteredOpportunities.map(opportunity => (
                <Card key={opportunity.need_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {opportunity.posting_club_logo_url && (
                                <img 
                                  src={opportunity.posting_club_logo_url} 
                                  alt={`${opportunity.posting_club_name} logo`}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              )}
                              <div>
                                <h3 className="text-lg font-semibold">{opportunity.posting_club_name}</h3>
                                {opportunity.club_rating && opportunity.review_count ? (
                                  <div 
                                    className="flex items-center gap-2 mt-1 cursor-pointer hover:opacity-80"
                                    onClick={() => openReviewsModal(opportunity.created_by_club_id, opportunity.posting_club_name)}
                                  >
                                    <StarRating rating={opportunity.club_rating} size="md" />
                                    <span className="text-xs text-muted-foreground">
                                      ({opportunity.review_count} reviews)
                                    </span>
                                  </div>
                                ) : (
                                  <p 
                                    className="text-xs text-muted-foreground mt-1 cursor-pointer hover:opacity-80"
                                    onClick={() => openReviewsModal(opportunity.created_by_club_id, opportunity.posting_club_name)}
                                  >
                                    No reviews yet - be the first!
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge 
                              className={`${getFitScoreColor(opportunity.fit_score)} text-primary-foreground`}
                            >
                              {opportunity.fit_score}% {getFitScoreLabel(opportunity.fit_score)}
                            </Badge>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSaveOpportunity(opportunity.need_id)}
                            className={savedOpportunities.has(opportunity.need_id) ? 'text-red-500' : 'text-gray-400'}
                          >
                            <Heart className={`h-4 w-4 ${savedOpportunities.has(opportunity.need_id) ? 'fill-current' : ''}`} />
                          </Button>
                        </div>

                        {/* Position and Requirements */}
                        <div className="mb-3">
                          <p className="text-xl font-medium text-primary mb-2">
                            {opportunity.position_needed}
                          </p>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {(opportunity.min_age || opportunity.max_age) && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Age: {opportunity.min_age || '?'} - {opportunity.max_age || '?'}
                              </div>
                            )}
                            
                            {opportunity.salary_range && (
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-4 w-4" />
                                {opportunity.salary_range}
                              </div>
                            )}

                            {opportunity.preferred_foot && (
                              <div className="flex items-center gap-1">
                                <span>⚽</span>
                                {opportunity.preferred_foot} foot
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Fit Reasons */}
                        {opportunity.fit_reasons.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Why this is a good fit:</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {opportunity.fit_reasons.map((reason, index) => {
                                const IconComponent = reason.icon
                                return (
                                  <li key={index} className="flex items-start gap-2">
                                    <IconComponent className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                    {reason.text}
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )}

                        {/* Notes */}
                        {opportunity.notes && (
                          <div className="mb-4">
                            <p className="text-sm">
                              <span className="font-medium">Requirements:</span> {opportunity.notes}
                            </p>
                          </div>
                        )}

                        {/* Posted Date */}
                        <p className="text-xs text-muted-foreground mb-4">
                          Posted {new Date(opportunity.need_created_at).toLocaleDateString()}
                        </p>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button size="sm" className="">
                            Express Interest
                          </Button>
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => openReviewsModal(opportunity.created_by_club_id, opportunity.posting_club_name)}
                            className="border-yellow-400 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-600 dark:text-yellow-300 dark:hover:bg-yellow-800"
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Player Reviews
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reviews Modal */}
      <ClubReviewsModal
        isOpen={reviewsModal.isOpen}
        onClose={closeReviewsModal}
        clubId={reviewsModal.clubId}
        clubName={reviewsModal.clubName}
      />
    </div>
  )
}