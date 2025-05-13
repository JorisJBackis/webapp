// app/dashboard/marketplace/page.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
// Import the actual components now
import BrowseListings from "@/components/marketplace/browse-listings";
import MyListings from "@/components/marketplace/my-listings";

export default async function MarketplacePage() {
    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-footylabs-newblue">Player Marketplace</h1>
                <p className="text-muted-foreground">Browse player listings or manage your club's available players.</p>
            </div>

            <Tabs defaultValue="browse" className="space-y-6">
                <TabsList className="bg-gray-100 text-black">
                    <TabsTrigger value="browse" className="data-[state=active]:bg-[#31348D] data-[state=active]:text-white">
                        Browse Listings
                    </TabsTrigger>
                    <TabsTrigger value="my-listings" className="data-[state=active]:bg-[#31348D] data-[state=active]:text-white">
                        My Club's Listings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="browse">
                    {/* Use the Browse Listings Component */}
                    <BrowseListings />
                </TabsContent>

                <TabsContent value="my-listings">
                    {/* Use the My Listings Component */}
                    <MyListings />
                </TabsContent>
            </Tabs>
        </div>
    );
}
