// app/dashboard/scouting/page.tsx
import { createClient } from "@/lib/supabase/server"; // Use server client for initial check
import LeaguePlayerBrowser from "@/components/scouting/league-player-browser"; // We'll create this next

export default async function ScoutingPage() {
    const supabase = createClient();

    // Fetch user's club ID server-side to pass down initially
    // This avoids the client having to fetch it separately just for filtering
    const { data: { user } } = await supabase.auth.getUser();
    let userClubId: number | null = null;
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('club_id')
            .eq('id', user.id)
            .single();
        userClubId = profile?.club_id ?? null;
    }

    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-footylabs-newblue">Player Scouting</h1>
                <p className="text-muted-foreground">Browse and filter players across the league (excluding your own club).</p>
            </div>
            {/* Pass the user's club ID down to the client component */}
            <LeaguePlayerBrowser initialUserClubId={userClubId} />
        </div>
    );
}