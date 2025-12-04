"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { ClubReviewForm, AgentReviewForm } from "@/components/reviews"
import {
  Building,
  UserCircle,
  Plus,
  CheckCircle,
  Star,
  History,
  AlertCircle
} from "lucide-react"

interface PlayerReviewsClientProps {
  playerProfileId: string // UUID from player_profiles
  currentClub: {
    id: number
    name: string
    logoUrl: string | null
  } | null
  formerClubs: { id: string; name: string }[]
  agentName: string | null
}

interface ExistingReview {
  id: number
  overall_rating: number
  created_at: string
}

export default function PlayerReviewsClient({
  playerProfileId,
  currentClub,
  formerClubs,
  agentName
}: PlayerReviewsClientProps) {
  const [activeTab, setActiveTab] = useState("clubs")
  const [selectedClubId, setSelectedClubId] = useState<string>("")
  const [selectedClubName, setSelectedClubName] = useState<string>("")
  const [showClubForm, setShowClubForm] = useState(false)
  const [showAgentForm, setShowAgentForm] = useState(false)
  const [existingClubReviews, setExistingClubReviews] = useState<Record<number, ExistingReview>>({})
  const [existingAgentReview, setExistingAgentReview] = useState<ExistingReview | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  // Fetch existing reviews
  useEffect(() => {
    async function fetchExistingReviews() {
      setLoading(true)
      try {
        // Fetch club reviews by this player
        const { data: clubReviews } = await supabase
          .from("club_reviews")
          .select("id, club_id, overall_rating, created_at")
          .eq("player_profile_id", playerProfileId)

        if (clubReviews) {
          const reviewMap: Record<number, ExistingReview> = {}
          clubReviews.forEach((review) => {
            reviewMap[review.club_id] = {
              id: review.id,
              overall_rating: review.overall_rating,
              created_at: review.created_at
            }
          })
          setExistingClubReviews(reviewMap)
        }

        // Fetch agent review by this player
        if (agentName) {
          const { data: agentReviews } = await supabase
            .from("agent_reviews")
            .select("id, overall_rating, created_at")
            .eq("player_profile_id", playerProfileId)
            .eq("agent_name", agentName)
            .single()

          if (agentReviews) {
            setExistingAgentReview(agentReviews)
          }
        }
      } catch (error) {
        console.error("Error fetching reviews:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchExistingReviews()
  }, [playerProfileId, agentName])

  const handleClubSelect = (value: string) => {
    const [id, ...nameParts] = value.split("|")
    setSelectedClubId(id)
    setSelectedClubName(nameParts.join("|"))
  }

  const handleClubReviewSuccess = () => {
    setShowClubForm(false)
    // Refresh existing reviews
    const clubId = parseInt(selectedClubId)
    setExistingClubReviews(prev => ({
      ...prev,
      [clubId]: {
        id: Date.now(), // Temporary ID
        overall_rating: 5,
        created_at: new Date().toISOString()
      }
    }))
  }

  const handleAgentReviewSuccess = () => {
    setShowAgentForm(false)
    setExistingAgentReview({
      id: Date.now(),
      overall_rating: 5,
      created_at: new Date().toISOString()
    })
  }

  // All clubs available to review
  const allClubs = [
    ...(currentClub ? [{ id: String(currentClub.id), name: currentClub.name, isCurrent: true }] : []),
    ...formerClubs.map(c => ({ ...c, isCurrent: false }))
  ]

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 max-w-md">
        <TabsTrigger value="clubs" className="flex items-center gap-2">
          <Building className="h-4 w-4" />
          Club Reviews
        </TabsTrigger>
        <TabsTrigger value="agent" className="flex items-center gap-2">
          <UserCircle className="h-4 w-4" />
          Agent Review
        </TabsTrigger>
      </TabsList>

      {/* Club Reviews Tab */}
      <TabsContent value="clubs" className="space-y-6">
        {/* Club Selection */}
        {!showClubForm && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5 text-footylabs-blue" />
                Your Clubs
              </CardTitle>
              <CardDescription>
                Select a club from your career to leave a review
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allClubs.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No club history found in your profile
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {allClubs.map((club) => {
                      const hasReview = existingClubReviews[parseInt(club.id)]
                      return (
                        <div
                          key={club.id}
                          className={`p-4 rounded-lg border transition-all cursor-pointer hover:border-footylabs-blue/50 hover:bg-footylabs-blue/5 ${
                            selectedClubId === club.id
                              ? "border-footylabs-blue bg-footylabs-blue/5"
                              : "border-border"
                          }`}
                          onClick={() => handleClubSelect(`${club.id}|${club.name}`)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{club.name}</span>
                            {club.isCurrent && (
                              <Badge variant="secondary" className="text-xs">
                                Current
                              </Badge>
                            )}
                          </div>
                          {hasReview ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              <span className="text-xs">Reviewed</span>
                              <div className="flex items-center ml-auto">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs ml-1">
                                  {hasReview.overall_rating}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Not reviewed yet
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {selectedClubId && !existingClubReviews[parseInt(selectedClubId)] && (
                    <Button
                      onClick={() => setShowClubForm(true)}
                      className="w-full bg-footylabs-blue hover:bg-footylabs-darkblue"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Write Review for {selectedClubName}
                    </Button>
                  )}

                  {selectedClubId && existingClubReviews[parseInt(selectedClubId)] && (
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p className="text-sm text-green-700 dark:text-green-400">
                        You&apos;ve already reviewed {selectedClubName}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Club Review Form */}
        {showClubForm && selectedClubId && (
          <ClubReviewForm
            clubId={parseInt(selectedClubId)}
            clubName={selectedClubName}
            playerProfileId={playerProfileId}
            onSuccess={handleClubReviewSuccess}
            onCancel={() => setShowClubForm(false)}
          />
        )}
      </TabsContent>

      {/* Agent Review Tab */}
      <TabsContent value="agent" className="space-y-6">
        {agentName ? (
          <>
            {!showAgentForm && !existingAgentReview && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <UserCircle className="h-5 w-5 text-footylabs-blue" />
                    Your Agent
                  </CardTitle>
                  <CardDescription>
                    Share your experience working with your agent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div>
                      <p className="font-medium">{agentName}</p>
                      <p className="text-sm text-muted-foreground">
                        Listed as your current agent
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowAgentForm(true)}
                      className="bg-footylabs-blue hover:bg-footylabs-darkblue"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Write Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {showAgentForm && (
              <AgentReviewForm
                agentName={agentName}
                playerProfileId={playerProfileId}
                onSuccess={handleAgentReviewSuccess}
                onCancel={() => setShowAgentForm(false)}
              />
            )}

            {existingAgentReview && !showAgentForm && (
              <Card className="border-0 shadow-md">
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                    <h3 className="text-xl font-semibold mb-2">
                      Review Submitted
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      You&apos;ve already reviewed {agentName}
                    </p>
                    <div className="flex items-center justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            star <= existingAgentReview.overall_rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Reviewed on{" "}
                      {new Date(existingAgentReview.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <UserCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Agent Listed</h3>
                <p className="text-muted-foreground">
                  You don&apos;t have an agent listed in your profile. If you have
                  an agent, please contact support to update your profile.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  )
}
