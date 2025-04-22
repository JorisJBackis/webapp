// app/dashboard/marketplace/page.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
// We'll create these components next
// import BrowseListings from "@/components/marketplace/browse-listings";
// import MyListings from "@/components/marketplace/my-listings";

// This page will implicitly use DashboardLayout, so auth is handled.
export default async function MarketplacePage() {
    // In a real app, you might fetch initial data here if needed server-side,
    // or pass user/club info down to client components.
    // For now, we'll let the client components handle their own data fetching.

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
                    {/* Placeholder for Browse Listings Component */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Available Players</CardTitle>
                            <CardDescription>Players listed for transfer or loan by other clubs.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">[Browse Listings Component Will Go Here]</p>
                            {/* <BrowseListings /> */}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="my-listings">
                    {/* Placeholder for My Listings Component */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Manage Your Listings</CardTitle>
                            <CardDescription>Create, view, and manage players your club has listed.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">[My Listings Component Will Go Here]</p>
                            {/* <MyListings /> */}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}