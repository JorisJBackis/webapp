import { createClient } from "@/lib/supabase/server"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PerformanceOverview from "@/components/dashboard/performance-overview"
import PlayerStats from "@/components/dashboard/player-stats"
import TeamComparison from "@/components/dashboard/team-comparison"

export default async function DashboardPage() {
  const supabase = createClient()

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get the user's profile with club information
  const { data: profile } = await supabase.from("profiles").select("*, clubs(*)").eq("id", user?.id).single()

  const clubName = profile?.clubs?.name || "Your Club"

  return (
    <div className="container py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{clubName} Dashboard</h1>
        <p className="text-muted-foreground">View analytics and insights for your football club</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="comparison">Team Comparison</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <PerformanceOverview clubId={profile?.club_id} />
        </TabsContent>
        <TabsContent value="players" className="space-y-4">
          <PlayerStats clubId={profile?.club_id} />
        </TabsContent>
        <TabsContent value="comparison" className="space-y-4">
          <TeamComparison clubId={profile?.club_id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

