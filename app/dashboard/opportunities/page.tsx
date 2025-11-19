import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import OpportunitiesBrowser from "@/components/dashboard/opportunities-browser"

export default async function OpportunitiesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get the user's profile
  const { data: profile } = await supabase.from("profiles").select("*, clubs(*)").eq("id", user.id).single()

  // If user is not a player, redirect
  if (profile?.user_type !== 'player') {
    redirect('/dashboard')
  }

  // Get player profile
  const { data: playerProfile } = await supabase
    .from('player_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          Opportunities
        </h1>
        <p className="text-muted-foreground">
          Browse club recruitment needs that match your profile
        </p>
      </div>

      <OpportunitiesBrowser
        playerProfile={playerProfile}
        userClubId={profile?.club_id}
      />
    </div>
  )
}
