import { redirect } from "next/navigation"
import { getUserProfile } from "@/lib/get-user-profile"
import ScoutingTabs from "@/components/scouting/scouting-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock } from "lucide-react"

export default async function ScoutingPage() {
  const userProfile = await getUserProfile()

  if (!userProfile) {
    redirect("/auth/login")
  }

  // Check if user is a player
  if (userProfile.profile?.user_type === 'player') {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 text-gray-400">
              <Lock className="h-full w-full" />
            </div>
            <CardTitle className="text-2xl">Scouting is for Clubs Only</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              The scouting feature is exclusively available for club accounts to discover
              and analyze players across different leagues.
            </p>
            <p className="text-sm text-gray-500">
              As a player, you can use the Dashboard and Insights features to track your performance
              and view analytics.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!userProfile.profile?.club_id) {
    redirect("/auth/select-club")
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-footylabs-newblue">Player Scouting</h1>
        <p className="text-muted-foreground">Discover and track players across leagues.</p>
      </div>

      <ScoutingTabs userClubId={userProfile.profile.club_id} />
    </div>
  )
}