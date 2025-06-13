// app/dashboard/marketplace/page.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Card components are used within the child components now
// Import the child components
import BrowseListings from "@/components/marketplace/browse-listings";
import MyListings from "@/components/marketplace/my-listings";
import BrowseNeeds from "@/components/marketplace/browse-needs";
import MyNeeds from "@/components/marketplace/my-needs";

export default async function MarketplacePage() {
    // You could fetch userClubId here server-side and pass it down if needed,
    // but for now, let's assume child components fetch it.

    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-footylabs-newblue">Player Marketplace</h1>
                <p className="text-muted-foreground">Browse available players, manage your club's listings, or post/view recruitment needs.</p>
            </div>

            <Tabs defaultValue="browse-players" className="space-y-6">
                {/* Tabs List - Rename "Looking For" to "Club Needs" for clarity */}
                <TabsList className="bg-gray-100 text-black">
                    <TabsTrigger value="browse-players" className="data-[state=active]:bg-[#31348D] data-[state=active]:text-white">
                        Available Players
                    </TabsTrigger>
                    <TabsTrigger value="club-needs" className="data-[state=active]:bg-[#31348D] data-[state=active]:text-white">
                        Club Needs {/* Renamed for clarity */}
                    </TabsTrigger>
                    <TabsTrigger value="my-postings" className="data-[state=active]:bg-[#31348D] data-[state=active]:text-white">
                        My Postings {/* Renamed for combined content */}
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Browse Available Players */}
                <TabsContent value="browse-players">
                    <BrowseListings />
                </TabsContent>

                {/* Tab 2: Browse Club Needs */}
                <TabsContent value="club-needs">
                    <BrowseNeeds />
                </TabsContent>

                {/* Tab 3: My Listings AND My Needs */}
                <TabsContent value="my-postings" className="space-y-6"> {/* Add space-y-6 for spacing */}
                    {/* Section for Managing Player Listings */}
                    <MyListings />

                    {/* Section for Managing Recruitment Needs */}
                    <MyNeeds />
                </TabsContent>


            </Tabs>
        </div>
    );
}
