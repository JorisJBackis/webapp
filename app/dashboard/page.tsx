import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PerformanceOverview from "@/components/dashboard/performance-overview"
import PlayerStats from "@/components/dashboard/player-stats"
import TeamComparison from "@/components/dashboard/team-comparison"
import Image from "next/image"
import MyListings from "@/components/marketplace/my-listings";
import MyNeeds from "@/components/marketplace/my-needs";
import PlayerDashboard from "@/components/dashboard/player-dashboard";

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get the current user
  
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get the user's profile with club information
  const { data: profile } = await supabase.from("profiles").select("*, clubs(*)").eq("id", user.id).single()

  // If user is a player, check if they need onboarding
  if (profile?.user_type === 'player') {
    // Check if player has completed onboarding
    const { data: playerProfile } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('id', user?.id)
      .single()

    // Check for pending data requests
    const { data: dataRequest } = await supabase
      .from('player_data_requests')
      .select('*')
      .eq('user_id', user?.id)
      .eq('status', 'pending')
      .single()

    // If any required fields are missing, redirect to onboarding
    const needsOnboarding = !playerProfile || 
      !playerProfile.playing_positions?.length ||
      !playerProfile.current_salary_range ||
      !playerProfile.preferred_countries?.length ||
      !playerProfile.languages?.length

    if (needsOnboarding) {
      redirect('/auth/player-onboarding')
    }

    // Get player's wyscout data for stats
    let wyscoutPlayer = null
    if (playerProfile?.wyscout_player_id) {
      // Get the latest player data by wyscout_player_id
      const { data: wyscoutData } = await supabase
        .from('players')
        .select('*')
        .eq('wyscout_player_id', playerProfile.wyscout_player_id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()
      
      wyscoutPlayer = wyscoutData
    }
    
    return (
      <PlayerDashboard
        data={{
          user,
          profile,
          playerProfile,
          playerStats: null,
          wyscoutPlayer,
          dataRequest
        }}
      />
    )
  }

  const clubName = profile?.clubs?.name || "Your Club"
  const clubLogo = profile?.clubs?.logo_url || "/placeholder.svg?height=40&width=40"

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center">
        <div className="mr-3 h-10 w-10 overflow-hidden rounded-full bg-background shadow-sm">
          <Image
            src={clubLogo || "/placeholder.svg"}
            alt={clubName}
            width={40}
            height={40}
            className="h-full w-full object-contain"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">{clubName} Dashboard</h1>
          <p className="text-muted-foreground">View analytics and insights for your football club</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted text-muted-foreground">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Overview
          </TabsTrigger>
          <TabsTrigger value="players" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Players
          </TabsTrigger>
          <TabsTrigger value="comparison" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Team Comparison
          </TabsTrigger>
          <TabsTrigger value="my-activity" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            My Club's Activity
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6">
          <PerformanceOverview clubId={profile?.club_id ?? undefined} />
        </TabsContent>
        <TabsContent value="players" className="space-y-6">
          <PlayerStats clubId={profile?.club_id ?? undefined} />
        </TabsContent>
        <TabsContent value="comparison" className="space-y-6">
          <TeamComparison clubId={profile?.club_id ?? undefined} />
        </TabsContent>
        <TabsContent value="my-activity" className="space-y-6">
          <MyListings />
          <MyNeeds />
        </TabsContent>
      </Tabs>
    </div>
  )
}
