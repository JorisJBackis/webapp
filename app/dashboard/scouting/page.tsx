import { redirect } from "next/navigation"
import { getUserProfile } from "@/lib/get-user-profile"
import ScoutingTabs from "@/components/scouting/scouting-tabs"

export default async function ScoutingPage() {
  const userProfile = await getUserProfile()

  if (!userProfile) {
    redirect("/auth/login")
  }

  if (!userProfile.profile?.club_id) {
    redirect("/auth/select-club")
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#3144C3]">Player Scouting</h1>
        <p className="text-muted-foreground">Discover and track players across leagues.</p>
      </div>

      <ScoutingTabs userClubId={userProfile.profile.club_id} />
    </div>
  )
}
