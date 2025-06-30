import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BrowseListings from "@/components/marketplace/browse-listings";
import MyListings from "@/components/marketplace/my-listings";
import BrowseNeeds from "@/components/marketplace/browse-needs";
import MyNeeds from "@/components/marketplace/my-needs";
import AgencyRBProspectsTab from "@/components/marketplace/agency-rb-prospects-tab"; // <<< IMPORT

export default async function MarketplacePage() {
    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-footylabs-newblue">Player Marketplace</h1>
                <p className="text-muted-foreground">Discover talent: Browse club listings, our curated prospects, or define your recruitment needs.</p>
            </div>

            <Tabs defaultValue="agency-rb-prospects" className="space-y-6">
                <TabsList className="bg-gray-100 text-black">
                    <TabsTrigger value="agency-rb-prospects" className="data-[state=active]:bg-[#31348D] data-[state=active]:text-white">
                       Available Players
                    </TabsTrigger>
                    <TabsTrigger value="browse-players" className="data-[state=active]:bg-[#31348D] data-[state=active]:text-white">
                        Club Listings
                    </TabsTrigger>
                    <TabsTrigger value="club-needs" className="data-[state=active]:bg-[#31348D] data-[state=active]:text-white">
                        Club Needs
                    </TabsTrigger>
                    <TabsTrigger value="my-postings" className="data-[state=active]:bg-[#31348D] data-[state=active]:text-white">
                        My Club's Activity
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="agency-rb-prospects">
                    <AgencyRBProspectsTab /> {/* <<< ADD CONTENT */}
                </TabsContent>

                <TabsContent value="browse-players">
                    <BrowseListings />
                </TabsContent>

                <TabsContent value="club-needs">
                    <BrowseNeeds />
                </TabsContent>

                <TabsContent value="my-postings" className="space-y-6">
                    <MyListings />
                    <MyNeeds />
                </TabsContent>
            </Tabs>
        </div>
    );
}
