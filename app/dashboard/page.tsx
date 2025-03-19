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
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-footylabs-blue">{clubName} Dashboard</h1>
        <p className="text-muted-foreground">View analytics and insights for your football club</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-footylabs-darkblue text-white">
          <TabsTrigger value="overview" className="data-[state=active]:bg-footylabs-blue">
            Overview
          </TabsTrigger>
          <TabsTrigger value="players" className="data-[state=active]:bg-footylabs-blue">
            Players
          </TabsTrigger>
          <TabsTrigger value="comparison" className="data-[state=active]:bg-footylabs-blue">
            Team Comparison
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6">
          <PerformanceOverview clubId={profile?.club_id} />
        </TabsContent>
        <TabsContent value="players" className="space-y-6">
          <PlayerStats clubId={profile?.club_id} />
        </TabsContent>
        <TabsContent value="comparison" className="space-y-6">
          <TeamComparison clubId={profile?.club_id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

