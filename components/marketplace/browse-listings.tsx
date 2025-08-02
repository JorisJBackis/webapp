// components/marketplace/browse-listings.tsx
"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types'; // Assuming types are generated
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';

// Type matching the RETURNS TABLE of the get_player_listings function
type BrowsePlayerListing = Database['public']['Functions']['get_player_listings']['Returns'][number];

export default function BrowseListings() {
    const [listings, setListings] = useState<BrowsePlayerListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [positionFilter, setPositionFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'loan' | 'transfer'>('all');
    const [userClubId, setUserClubId] = useState<number | null>(null);
    const supabase = createClient();

    // Fetch user's club ID (same as before)
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
                    setLoading(false);
                }
            } else {
                setError("User not logged in.");
                setLoading(false);
            }
        };
        getClubId();
    }, [supabase]);

    // Fetch listings using the RPC function
    useEffect(() => {
        const fetchListings = async () => {
            if (!userClubId) {
                if (!error) setLoading(true);
                return;
            }

            setLoading(true);
            setError(null);
            setListings([]); // Clear previous results

            try {
                console.log("Fetching browse listings via RPC, excluding club ID:", userClubId);

                // Call the database function
                const { data, error: rpcError } = await supabase
                    .rpc('get_player_listings', {
                        requesting_club_id: userClubId,
                        listing_status: 'active' // Fetch only active listings
                    });
                // Ensure type safety if needed after RPC call
                const fetchedListings = data as BrowsePlayerListing[] | null;


                if (rpcError) throw rpcError;

                console.log("Fetched listings data:", fetchedListings);
                setListings(fetchedListings || []); // Set state with fetched data or empty array

            } catch (err: any) {
                console.error("Error fetching browse listings via RPC:", err);
                setError("Could not load player listings.");
            } finally {
                setLoading(false);
            }
        };

        fetchListings();
    }, [userClubId, supabase]); // Re-run when userClubId is available

    // Client-side filter logic remains the same for MVP
    const filteredListings = listings.filter(listing => {
        const nameMatch = !searchQuery || (listing.player_name && listing.player_name.toLowerCase().includes(searchQuery.toLowerCase()));
        const positionMatch = positionFilter === 'all' || listing.player_position === positionFilter;
        const typeMatch = typeFilter === 'all' || listing.listing_type === typeFilter;
        return nameMatch && positionMatch && typeMatch;
    });

    // --- JSX REMAINS LARGELY THE SAME ---
    // Just ensure it uses the fields returned by the function (e.g., player_name, player_position)
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
                        <Input placeholder="Search by player name..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <Select value={positionFilter} onValueChange={setPositionFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by position" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Positions</SelectItem>
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
                        <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Filter by type" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="loan">Loan</SelectItem>
                            <SelectItem value="transfer">Transfer</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {loading && <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-[#31348D]" /></div>}
                {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                {!loading && !error && listings.length === 0 && <p className="text-center text-muted-foreground py-10">No active player listings found from other clubs.</p>}
                {!loading && !error && listings.length > 0 && filteredListings.length === 0 && <p className="text-center text-muted-foreground py-10">No listings match your current filters.</p>}

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
                                    <TableCell className="font-medium">{listing.player_name || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{listing.player_position || 'N/A'}</Badge>
                                    </TableCell>
                                    <TableCell>{listing.listed_by_club_name || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant={listing.listing_type === 'loan' ? 'secondary' : 'default'}>
                                            {listing.listing_type ? listing.listing_type.charAt(0).toUpperCase() + listing.listing_type.slice(1) : 'N/A'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {listing.listing_type === 'transfer' ?
                                            (listing.asking_price ? `€${listing.asking_price.toLocaleString()}` : '-') :
                                            (listing.loan_fee ? `€${listing.loan_fee.toLocaleString()}` : '-')
                                        }
                                        {listing.listing_type === 'loan' && listing.loan_duration && ` (${listing.loan_duration})`}
                                    </TableCell>
                                    <TableCell>{listing.listing_created_at ? new Date(listing.listing_created_at).toLocaleDateString() : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm">View Details</Button> {/* TODO: Implement action */}
                                        <Button size="sm" variant="default" className="ml-2">Contact</Button>
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
