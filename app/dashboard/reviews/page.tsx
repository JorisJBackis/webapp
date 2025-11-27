import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Building, UserCircle, History } from "lucide-react"
import PlayerReviewsClient from "./player-reviews-client"

interface TransferHistoryItem {
  id: string
  clubFrom: { id: string; name: string }
  clubTo: { id: string; name: string }
  date: string
  season: string
  fee: string
}

interface TmData {
  playerId: string
  profileStats: {
    facts: {
      playerAgent?: string
      currentClub?: string
    }
  }
  transferHistory?: {
    id: string
    transfers: TransferHistoryItem[]
  }
  clubId?: string
  clubName?: string
}

export default async function PlayerReviewsPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile to check user_type
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single()

  // Check if user is a player
  if (profile?.user_type !== "player") {
    return (
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-footylabs-blue">Reviews</h1>
          <p className="text-muted-foreground">Share your experiences with clubs and agents</p>
        </div>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-amber-500" />
              <h2 className="text-xl font-semibold mb-2">Player Account Required</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Only verified players can leave reviews for clubs and agents. If you are a player,
                please contact support to update your account type.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get player profile
  const { data: playerProfile, error: playerProfileError } = await supabase
    .from("player_profiles")
    .select(`
      id,
      full_name,
      agent_name,
      transfermarkt_player_id
    `)
    .eq("id", user.id)
    .single()

  if (playerProfileError) {
    console.error("Error fetching player profile:", playerProfileError)
  }

  // Check if player profile exists
  if (!playerProfile) {
    return (
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-footylabs-blue">Reviews</h1>
          <p className="text-muted-foreground">Share your experiences with clubs and agents</p>
        </div>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-amber-500" />
              <h2 className="text-xl font-semibold mb-2">Player Profile Not Found</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Please complete your player onboarding to access the reviews feature.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fetch transfermarkt data separately if player has a linked transfermarkt_player_id
  let tmPlayerData: {
    id: number
    name: string
    player_agent: string | null
    club_id: number | null
    tm_data: string | null
  } | null = null

  if (playerProfile.transfermarkt_player_id) {
    const { data: tmData } = await supabase
      .from("players_transfermarkt")
      .select(`
        id,
        name,
        player_agent,
        club_id,
        tm_data
      `)
      .eq("id", playerProfile.transfermarkt_player_id)
      .single()

    tmPlayerData = tmData as typeof tmPlayerData
  }

  // Parse tm_data to get transfer history and clubs
  let tmData: TmData | null = null
  let formerClubs: { id: string; name: string }[] = []

  if (tmPlayerData?.tm_data) {
    try {
      const parsed = typeof tmPlayerData.tm_data === "string"
        ? JSON.parse(tmPlayerData.tm_data)
        : tmPlayerData.tm_data
      tmData = parsed

      // Extract unique clubs from transfer history
      if (parsed.transferHistory?.transfers) {
        const clubsMap = new Map<string, string>()
        parsed.transferHistory.transfers.forEach((transfer: TransferHistoryItem) => {
          if (transfer.clubFrom?.id && transfer.clubFrom?.name) {
            clubsMap.set(transfer.clubFrom.id, transfer.clubFrom.name)
          }
          if (transfer.clubTo?.id && transfer.clubTo?.name) {
            clubsMap.set(transfer.clubTo.id, transfer.clubTo.name)
          }
        })
        // Convert to array and exclude current club
        formerClubs = Array.from(clubsMap.entries())
          .map(([id, name]) => ({ id, name }))
          .filter(club => club.id !== String(tmPlayerData.club_id))
      }
    } catch (e) {
      console.error("Error parsing tm_data:", e)
    }
  }

  // Get the agent name from player_profile, tm_data, or player_agent field
  const agentName = playerProfile.agent_name ||
    tmData?.profileStats?.facts?.playerAgent ||
    tmPlayerData?.player_agent

  // Player name from player_profile or transfermarkt
  const playerName = playerProfile.full_name || tmPlayerData?.name || "Player"

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-footylabs-blue">Reviews</h1>
        <p className="text-muted-foreground">Share your experiences with clubs and agents</p>
      </div>

      {/* Player Info Header */}
      <Card className="border-0 shadow-md mb-8">
        <CardHeader className="border-b bg-footylabs-darkblue text-white">
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            {playerName}
          </CardTitle>
          <CardDescription className="text-white/80">
            Your player profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Club</p>
              <div className="flex items-center gap-2">
                {tmPlayerData?.clubs?.logo_url && (
                  <img
                    src={tmPlayerData.clubs.logo_url}
                    alt=""
                    className="h-6 w-6 object-contain"
                  />
                )}
                <span className="font-medium">
                  {tmPlayerData?.clubs?.name || "No club linked"}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Agent/Agency</p>
              <span className="font-medium">{agentName || "No agent listed"}</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Career Clubs</p>
              <Badge variant="secondary" className="bg-footylabs-blue/10 text-footylabs-blue">
                {formerClubs.length + (tmPlayerData?.clubs ? 1 : 0)} clubs
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client component for interactive reviews */}
      <PlayerReviewsClient
        playerProfileId={playerProfile.id}
        currentClub={tmPlayerData?.clubs ? {
          id: tmPlayerData.clubs.id,
          name: tmPlayerData.clubs.name,
          logoUrl: tmPlayerData.clubs.logo_url
        } : null}
        formerClubs={formerClubs}
        agentName={agentName}
      />
    </div>
  )
}
