"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import LeaguePlayerBrowser from "./league-player-browser"
import MyWatchlist from "./my-watchlist"

interface ScoutingTabsProps {
  userClubId: number
}

export default function ScoutingTabs({ userClubId }: ScoutingTabsProps) {
  return (
    <Tabs defaultValue="browse-players" className="space-y-6">
      <TabsList className="bg-gray-100 text-black">
        <TabsTrigger value="browse-players" className="data-[state=active]:bg-[#31348D] data-[state=active]:text-white">
          Browse Players
        </TabsTrigger>
        <TabsTrigger value="my-watchlist" className="data-[state=active]:bg-[#31348D] data-[state=active]:text-white">
          My Watchlist
        </TabsTrigger>
      </TabsList>

      <TabsContent value="browse-players">
        <LeaguePlayerBrowser initialUserClubId={userClubId} />
      </TabsContent>

      <TabsContent value="my-watchlist">
        <MyWatchlist userClubId={userClubId} />
      </TabsContent>
    </Tabs>
  )
}
