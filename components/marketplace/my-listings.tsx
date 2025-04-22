// components/marketplace/browse-listings.tsx
"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Re-added
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button'; // Added Button

// Type for listing data fetched from DB
type BrowsePlayerListing = {
    listing_id: number;
    listing_type: 'loan' | 'transfer';
    asking_price: number | null;
    loan_fee: number | null;
    loan_duration: string | null;
    created_at: string;
    wyscout_player_id: number | string;
    // Joined data (adjust select query as needed)
    player_name: string;
    player_position: string;
    listed_by_club_name: string; // Fetched via join
    listed_by_club_id: number; // Needed for filtering out own club
}

export default function BrowseListings() {
    const [listings, setListings] = useState<BrowsePlayerListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [positionFilter, setPositionFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'loan' | 'transfer'>('all');
    const [userClubId, setUserClubId] = useState<number | null>(null);
    const supabase = createClient();

    // Fetch user's club ID
    useEffect(() => {
        const getClubId = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('club_id')
                    .eq('id', session.user.id)
                    .single();
                if (profile?.club_id) {
                    setUserClubId(profile.club_id);
                } else {
                    if (!error) setError("Could not determine your club ID to filter listings.");
                    console.error("Profile fetch error or no club ID:", profileError);
                    setLoading(false); // Stop loading if we can't get club ID
                }
            } else {
                setError("User not logged in.");
                setLoading(false); // Stop loading if not logged in
            }
        };
        getClubId();
    }, [supabase]);

    // Fetch listings once clubId is known
    useEffect(() => {
        const fetchListings = async () => {
            if (!userClubId) {
                // Only set loading if we don't have an error already
                if (!error) setLoading(true);
                return; // Wait for userClubId
            }

            setLoading(true);
            setError(null);

            try {
                // TODO: Replace simulation with actual query + JOIN
                // Need to join player_listings with players (latest snapshot) and clubs

                console.log("Fetching browse listings, excluding club ID:", userClubId);

                // --- Simulation for MVP ---
                await new Promise(resolve => setTimeout(resolve, 1500));
                // Example data (replace with real fetch)
                const simulatedData: BrowsePlayerListing[] = [
                    { listing_id: 101, listing_type: 'transfer', status: 'active', asking_price: 500000, loan_fee: null, loan_duration: null, created_at: new Date().toISOString(), wyscout_player_id: 12345, player_name: 'Foreign Player A', player_position: 'Centre Forward', listed_by_club_name: 'Other Club FC', listed_by_club_id: 99 },
                    { listing_id: 102, listing_type: 'loan', status: 'active', asking_price: null, loan_fee: 50000, loan_duration: '1 season', created_at: new Date().toISOString(), wyscout_player_id: 67890, player_name: 'Loanable Midfielder', player_position: 'Central Midfielder', listed_by_club_name: 'Rival United', listed_by_club_id: 98 },
                ].filter(l => l.listed_by_club_id !== userClubId); // Ensure own club is filtered
                // --- End Simulation ---

                setListings(simulatedData); // Use simulated data

            } catch (err: any) {
                console.error("Error fetching browse listings:", err);
                setError("Could not load player listings.");
            } finally {
                setLoading(false);
            }
        };

        fetchListings();
    }, [userClubId, supabase]); // Depend on userClubId

    // Apply filters client-side for MVP simplicity
    const filteredListings = listings.filter(listing => {
        const nameMatch = !searchQuery || listing.player_name.toLowerCase().includes(searchQuery.toLowerCase());
        const positionMatch = positionFilter === 'all' || listing.player_position === positionFilter;
        const typeMatch = typeFilter === 'all' || listing.listing_type === typeFilter;
        return nameMatch && positionMatch && typeMatch;
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Available Players</CardTitle>
                <CardDescription>Players listed for transfer or loan by other clubs.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mb-4 flex flex-wrap gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by player name..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={positionFilter} onValueChange={setPositionFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by position" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Positions</SelectItem>
                            {/* Populate dynamically if needed, or hardcode */}
                            <SelectItem value="Goalkeeper">Goalkeeper</SelectItem>
                            <SelectItem value="Centre Back">Centre Back</SelectItem>
                            <SelectItem value="Full Back">Full Back</SelectItem>
                            <SelectItem value="Defensive Midfielder">Defensive Midfielder</SelectItem>
                            <SelectItem value="Central Midfielder">Central Midfielder</SelectItem>
                            <SelectItem value="Attacking Midfielder">Attacking Midfielder</SelectItem>
                            <SelectItem value="Winger">Winger</SelectItem>
                            <SelectItem value="Centre Forward">Centre Forward</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as 'all' | 'loan' | 'transfer')}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                            <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="loan">Loan</SelectItem>
                            <SelectItem value="transfer">Transfer</SelectItem>
                        </SelectContent>
                    </Select>
                    {/* Add more filters (Price Range, Club etc later) */}
                </div>

                {loading && (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-[#31348D]" />
                    </div>
                )}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {!loading && !error && listings.length === 0 && (
                    <p className="text-center text-muted-foreground py-10">No active player listings found from other clubs.</p>
                )}
                {!loading && !error && listings.length > 0 && filteredListings.length === 0 && (
                    <p className="text-center text-muted-foreground py-10">No listings match your current filters.</p>
                )}
                {!loading && !error && filteredListings.length > 0 && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Player</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead>Club</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Price/Fee</TableHead>
                                <TableHead>Listed On</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredListings.map((listing) => (
                                <TableRow key={listing.listing_id}>
                                    <TableCell className="font-medium">{listing.player_name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {listing.player_position}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{listing.listed_by_club_name}</TableCell>
                                    <TableCell>
                                        <Badge variant={listing.listing_type === 'loan' ? 'secondary' : 'default'}>
                                            {listing.listing_type.charAt(0).toUpperCase() + listing.listing_type.slice(1)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {listing.listing_type === 'transfer' ?
                                            (listing.asking_price ? `€${listing.asking_price.toLocaleString()}` : '-') :
                                            (listing.loan_fee ? `€${listing.loan_fee.toLocaleString()}` : '-')
                                        }
                                        {listing.listing_type === 'loan' && listing.loan_duration && ` (${listing.loan_duration})`}
                                    </TableCell>
                                    <TableCell>{new Date(listing.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm">View Details</Button> {/* TODO: Link to player detail view */}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}