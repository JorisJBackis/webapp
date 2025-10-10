import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BrowseListings from "@/components/marketplace/browse-listings";
import BrowseNeeds from "@/components/marketplace/browse-needs";
import AgencyRBProspectsTab from "@/components/marketplace/agency-rb-prospects-tab"; // <<< IMPORT
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

export default async function MarketplacePage() {
    const supabase = createClient();

    // Check user type
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', user.id)
            .single();

        // If player, show access denied message
        if (profile?.user_type === 'player') {
            return (
                <div className="container mx-auto py-8">
                    <Card className="max-w-2xl mx-auto">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 h-12 w-12 text-gray-400">
                                <Lock className="h-full w-full" />
                            </div>
                            <CardTitle className="text-2xl">Marketplace is for Clubs Only</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-gray-600 mb-4">
                                The marketplace feature is exclusively available for club accounts to browse players,
                                post recruitment needs, and manage transfers.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                As a player, you can use the Dashboard and Insights features to track your performance
                                and view analytics.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            );
        }
    }

    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-primary">Player Marketplace</h1>
                <p className="text-muted-foreground">Discover talent: Browse club listings, our curated prospects, or define your recruitment needs.</p>
            </div>

            <Tabs defaultValue="agency-rb-prospects" className="space-y-6">
                <TabsList className="bg-muted text-muted-foreground">
                    <TabsTrigger value="agency-rb-prospects" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                       Recommended Players
                    </TabsTrigger>
                    <TabsTrigger value="browse-players" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        On Transfer List
                    </TabsTrigger>
                    <TabsTrigger value="club-needs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        Club Requests
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
            </Tabs>
        </div>
    );
}