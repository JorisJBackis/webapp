"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, TrendingUp, Users, Target, CheckCircle2, AlertCircle, Filter, Briefcase, Heart, Star, X } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import ClubReviewsModal from '@/components/common/club-reviews-modal'
import type { OpportunityWithMatches } from '@/app/dashboard/agents/opportunities/page'

interface OpportunitiesTableProps {
  opportunities: OpportunityWithMatches[]
}

// Mini Player Card Component for Matched Players
function OpportunityMatchCard({ player, renderMatchBadges }: { player: any, renderMatchBadges: (reasons: any) => JSX.Element[] }) {
  const [playerData, setPlayerData] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!supabase) return

      const { data } = await supabase
        .from('players_transfermarkt')
        .select('picture_url, transfermarkt_url')
        .eq('id', player.player_id)
        .single()

      setPlayerData(data)
    }

    fetchPlayerData()
  }, [player.player_id, supabase])

  return (
    <Card className="overflow-hidden hover:shadow-md transition-all border-l-4 border-l-green-500">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Player Photo */}
          <div className="flex-shrink-0">
            {playerData?.transfermarkt_url ? (
              <a
                href={playerData.transfermarkt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:opacity-80 transition-opacity"
              >
                {playerData?.picture_url ? (
                  <img
                    src={playerData.picture_url}
                    alt={player.player_name}
                    className="w-16 h-16 rounded-lg object-cover border-2 border-background shadow cursor-pointer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow cursor-pointer">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </a>
            ) : (
              <>
                {playerData?.picture_url ? (
                  <img
                    src={playerData.picture_url}
                    alt={player.player_name}
                    className="w-16 h-16 rounded-lg object-cover border-2 border-background shadow"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            {playerData?.transfermarkt_url ? (
              <a
                href={playerData.transfermarkt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                <h4 className="font-bold text-sm mb-2 truncate">{player.player_name}</h4>
              </a>
            ) : (
              <h4 className="font-bold text-sm mb-2 truncate">{player.player_name}</h4>
            )}

            {/* Match Badges */}
            <div className="flex flex-wrap gap-1">
              {renderMatchBadges(player.match_reasons)}
            </div>

            {/* Quick Stats */}
            <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
              {player.match_reasons.player_position && (
                <div>Position: {player.match_reasons.player_position}</div>
              )}
              {player.match_reasons.player_age && (
                <div>Age: {player.match_reasons.player_age}</div>
              )}
              {player.match_reasons.player_height && (
                <div>Height: {player.match_reasons.player_height} cm</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function OpportunitiesTable({ opportunities }: OpportunitiesTableProps) {
  const [positionFilter, setPositionFilter] = useState('all')
  const [matchFilter, setMatchFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredOpportunities, setFilteredOpportunities] = useState<OpportunityWithMatches[]>(opportunities)
  const [savedOpportunities, setSavedOpportunities] = useState<Set<number>>(new Set())
  const [clubRatings, setClubRatings] = useState<Record<number, { rating: number, count: number, logo: string | null }>>({})

  // Reviews modal state
  const [reviewsModal, setReviewsModal] = useState<{
    isOpen: boolean
    clubId: number
    clubName: string
  }>({ isOpen: false, clubId: 0, clubName: '' })

  const supabase = createClient()

  // Fetch club ratings and logos
  useEffect(() => {
    const fetchClubData = async () => {
      if (!supabase) return

      const clubIds = [...new Set(opportunities.map(opp => opp.created_by_club_id))]
      const ratingsData: Record<number, { rating: number, count: number, logo: string | null }> = {}

      await Promise.all(clubIds.map(async (clubId) => {
        // Get club reviews
        const { data: reviews } = await supabase
          .from('club_reviews')
          .select('overall_rating')
          .eq('club_id', clubId)

        // Get club logo
        const { data: club } = await supabase
          .from('clubs')
          .select('logo_url')
          .eq('id', clubId)
          .single()

        if (reviews && reviews.length > 0) {
          const avgRating = reviews.reduce((sum, review) => sum + review.overall_rating, 0) / reviews.length
          ratingsData[clubId] = {
            rating: avgRating,
            count: reviews.length,
            logo: club?.logo_url || null
          }
        } else {
          ratingsData[clubId] = {
            rating: 0,
            count: 0,
            logo: club?.logo_url || null
          }
        }
      }))

      setClubRatings(ratingsData)
    }

    fetchClubData()
  }, [opportunities, supabase])

  // Apply filters
  useEffect(() => {
    let filtered = opportunities

    // Position filter
    if (positionFilter !== 'all') {
      filtered = filtered.filter(opp => opp.position_needed === positionFilter)
    }

    // Match filter
    if (matchFilter === 'with-matches') {
      filtered = filtered.filter(opp => opp.matched_players.length > 0)
    } else if (matchFilter === 'no-matches') {
      filtered = filtered.filter(opp => opp.matched_players.length === 0)
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(opp =>
        opp.posting_club_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.position_needed.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opp.notes && opp.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    setFilteredOpportunities(filtered)
  }, [opportunities, positionFilter, matchFilter, searchTerm])

  const getUniquePositions = () => {
    const positions = [...new Set(opportunities.map(opp => opp.position_needed))]
    return positions.sort()
  }

  const formatBudget = (budget: number | null) => {
    if (budget == null) return '-'
    return `€${budget.toLocaleString()}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getMatchCount = (matchCount: number) => {
    if (matchCount === 0) return null
    return matchCount
  }

  const toggleSaveOpportunity = (needId: number) => {
    const newSaved = new Set(savedOpportunities)
    if (newSaved.has(needId)) {
      newSaved.delete(needId)
    } else {
      newSaved.add(needId)
    }
    setSavedOpportunities(newSaved)
  }

  const openReviewsModal = (clubId: number, clubName: string) => {
    setReviewsModal({ isOpen: true, clubId, clubName })
  }

  const closeReviewsModal = () => {
    setReviewsModal({ isOpen: false, clubId: 0, clubName: '' })
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

  const renderMatchBadges = (reasons: any) => {
    const badges = []

    // Position badge - green if exact, orange if semi, red if no match
    const positionMatchType = reasons.position_match_type || 'none'
    badges.push(
      <Tooltip key="position">
        <TooltipTrigger asChild>
          <Badge
            variant="default"
            className={`text-xs cursor-help ${
              positionMatchType === 'exact'
                ? 'bg-green-600'
                : positionMatchType === 'semi'
                ? 'bg-orange-500'
                : 'bg-red-600'
            }`}
          >
            {positionMatchType === 'exact' ? (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            ) : positionMatchType === 'semi' ? (
              <CheckCircle2 className="h-3 w-3 mr-1 opacity-75" />
            ) : (
              <X className="h-3 w-3 mr-1" />
            )}
            Position
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{reasons.player_position || 'Unknown'}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {positionMatchType === 'exact' && '🎯 Exact match'}
            {positionMatchType === 'semi' && '✨ Versatile fit'}
            {positionMatchType === 'none' && '❌ Not a match'}
          </p>
        </TooltipContent>
      </Tooltip>
    )

    // Age badge - green if match, red if no match
    badges.push(
      <Tooltip key="age">
        <TooltipTrigger asChild>
          <Badge
            variant="default"
            className={`text-xs cursor-help ${reasons.age_match ? 'bg-green-600' : 'bg-red-600'}`}
          >
            {reasons.age_match ? (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            ) : (
              <X className="h-3 w-3 mr-1" />
            )}
            Age
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{reasons.player_age || 'Unknown'} years old</p>
        </TooltipContent>
      </Tooltip>
    )

    // Height badge - green if match, red if no match
    badges.push(
      <Tooltip key="height">
        <TooltipTrigger asChild>
          <Badge
            variant="default"
            className={`text-xs cursor-help ${reasons.height_match ? 'bg-green-600' : 'bg-red-600'}`}
          >
            {reasons.height_match ? (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            ) : (
              <X className="h-3 w-3 mr-1" />
            )}
            Height
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{reasons.player_height ? `${reasons.player_height} cm` : 'Unknown'}</p>
        </TooltipContent>
      </Tooltip>
    )

    // Foot badge - green if match, red if no match
    badges.push(
      <Tooltip key="foot">
        <TooltipTrigger asChild>
          <Badge
            variant="default"
            className={`text-xs cursor-help ${reasons.foot_match ? 'bg-green-600' : 'bg-red-600'}`}
          >
            {reasons.foot_match ? (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            ) : (
              <X className="h-3 w-3 mr-1" />
            )}
            Foot
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{reasons.player_foot || 'Unknown'}</p>
        </TooltipContent>
      </Tooltip>
    )

    return badges
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
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
          <Label htmlFor="match">Show</Label>
          <Select value={matchFilter} onValueChange={setMatchFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All opportunities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Opportunities</SelectItem>
              <SelectItem value="with-matches">With Matches Only</SelectItem>
              <SelectItem value="no-matches">No Matches</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPositionFilter('all')
              setMatchFilter('all')
              setSearchTerm('')
            }}
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Results summary */}
      <div className="text-sm text-muted-foreground">
        {filteredOpportunities.length} opportunities
        {matchFilter === 'with-matches' && ' with matches from your roster'}
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
                          {clubRatings[opportunity.created_by_club_id]?.logo && (
                            <img
                              src={clubRatings[opportunity.created_by_club_id].logo}
                              alt={`${opportunity.posting_club_name} logo`}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <h3 className="text-lg font-semibold">{opportunity.posting_club_name}</h3>
                            {clubRatings[opportunity.created_by_club_id] && clubRatings[opportunity.created_by_club_id].count > 0 ? (
                              <div
                                className="flex items-center gap-2 mt-1 cursor-pointer hover:opacity-80"
                                onClick={() => openReviewsModal(opportunity.created_by_club_id, opportunity.posting_club_name)}
                              >
                                <StarRating rating={clubRatings[opportunity.created_by_club_id].rating} size="md" />
                                <span className="text-xs text-muted-foreground">
                                  ({clubRatings[opportunity.created_by_club_id].count} reviews)
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
                        {opportunity.matched_players.length > 0 && (
                          <Badge className="bg-green-600 text-primary-foreground">
                            {opportunity.matched_players.length} {opportunity.matched_players.length === 1 ? 'Match' : 'Matches'}
                          </Badge>
                        )}
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

                    {/* Position */}
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
                            Salary: {opportunity.salary_range}
                          </div>
                        )}

                        {opportunity.preferred_foot && (
                          <div className="flex items-center gap-1">
                            <span>⚽</span>
                            {opportunity.preferred_foot} foot
                          </div>
                        )}

                        {(opportunity.min_height || opportunity.max_height) && (
                          <div className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            Height: {opportunity.min_height || '?'} - {opportunity.max_height || '?'} cm
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Budget */}
                    {(opportunity.budget_transfer_max || opportunity.budget_loan_fee_max) && (
                      <div className="mb-3 text-sm">
                        <span className="font-medium">Budget: </span>
                        {opportunity.budget_transfer_max && (
                          <span>Transfer up to {formatBudget(opportunity.budget_transfer_max)}</span>
                        )}
                        {opportunity.budget_loan_fee_max && (
                          <span>
                            {opportunity.budget_transfer_max && ' or '}
                            Loan fee up to {formatBudget(opportunity.budget_loan_fee_max)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Matched Players from Roster */}
                    {opportunity.matched_players.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          Your Roster Matches ({opportunity.matched_players.length})
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {opportunity.matched_players.map(player => (
                            <OpportunityMatchCard
                              key={player.player_id}
                              player={player}
                              renderMatchBadges={renderMatchBadges}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No matches message */}
                    {opportunity.matched_players.length === 0 && (
                      <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-border">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          No players from your roster match this opportunity yet
                        </p>
                      </div>
                    )}

                    {/* Notes */}
                    {opportunity.notes && (
                      <div className="mb-4">
                        <p className="text-sm">
                          <span className="font-medium">Additional Note:</span> {opportunity.notes}
                        </p>
                      </div>
                    )}

                    {/* Posted Date */}
                    <p className="text-xs text-muted-foreground mb-4">
                      Posted {formatDate(opportunity.need_created_at)}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button size="sm" className="">
                        Express Interest
                      </Button>
                      <Button variant="outline" size="sm">
                        View Full Details
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Reviews Modal */}
      <ClubReviewsModal
        isOpen={reviewsModal.isOpen}
        onClose={closeReviewsModal}
        clubId={reviewsModal.clubId}
        clubName={reviewsModal.clubName}
      />
    </div>
    </TooltipProvider>
  )
}
