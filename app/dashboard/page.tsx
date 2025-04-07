import { createClient } from "@/lib/supabase/server"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PerformanceOverview from "@/components/dashboard/performance-overview"
import PlayerStats from "@/components/dashboard/player-stats"
import TeamComparison from "@/components/dashboard/team-comparison"
import Image from "next/image"

export default async function DashboardPage() {
  const supabase = createClient()

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get the user's profile with club information
  const { data: profile } = await supabase.from("profiles").select("*, clubs(*)").eq("id", user?.id).single()

  const clubName = profile?.clubs?.name || "Your Club"
  const clubLogo = profile?.clubs?.logo_url || "/placeholder.svg?height=40&width=40"

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center">
        <div className="mr-3 h-10 w-10 overflow-hidden rounded-full bg-white shadow">
          <Image
            src={clubLogo || "/placeholder.svg"}
            alt={clubName}
            width={40}
            height={40}
            className="h-full w-full object-contain"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-footylabs-newblue">{clubName} Dashboard</h1>
          <p className="text-muted-foreground">View analytics and insights for your football club</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-gray-100 text-black">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#31348D] data-[state=active]:text-white">
            Overview
          </TabsTrigger>
          <TabsTrigger value="players" className="data-[state=active]:bg-[#31348D] data-[state=active]:text-white">
            Players
          </TabsTrigger>
          <TabsTrigger value="comparison" className="data-[state=active]:bg-[#31348D] data-[state=active]:text-white">
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

