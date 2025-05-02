// components/marketplace/browse-needs.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Filter } from 'lucide-react'; // Removed Search as it's less relevant here
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Keep Card structure
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Import Table
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge"; // Import Badge if needed for display
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // For notes/details

// Use generated type
type RecruitmentNeed = Database['public']['Functions']['get_recruitment_needs']['Returns'][number];

export default function BrowseNeeds() {
    const [needs, setNeeds] = useState<RecruitmentNeed[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userClubId, setUserClubId] = useState<number | null>(null);
    // Filters specific to needs
    const [positionFilter, setPositionFilter] = useState('all');
    const [footFilter, setFootFilter] = useState('all');
    // Add state for other filters like age range, budget later if needed
    const supabase = createClient();

    // Fetch user's club ID
    useEffect(() => {
        const getClubId = async () => {
            const { data: { session } } = await supabase?.auth.getSession() ?? { data: { session: null } };
            if (session?.user && supabase) {
                const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', session.user.id).single();
                if (profile?.club_id) setUserClubId(profile.club_id);
                else { if (!error) setError("Could not determine Club ID."); setLoading(false); }
            } else { if (!session?.user) setError("Not logged in."); setLoading(false); }
        };
        if (supabase) getClubId(); else { setError("Client error"); setLoading(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supabase]);

    // Fetch needs once club ID is available
    const fetchNeeds = useCallback(async () => {
        if (!userClubId || !supabase) { if (!error) setLoading(true); return; }
        setLoading(true); setError(null);
        try {
            // TODO: Add filter parameters to RPC call when backend filtering is added
            const { data, error: rpcError } = await supabase.rpc('get_recruitment_needs', {
                p_requesting_club_id: userClubId
                // Pass p_position_filter: positionFilter === 'all' ? null : positionFilter, etc. later
            });
            if (rpcError) throw rpcError;
            const fetchedNeeds = data as RecruitmentNeed[] | null;
            console.log("Fetched Club Needs:", fetchedNeeds);
            setNeeds(fetchedNeeds || []);
        } catch (err: any) {
            setError("Could not load recruitment needs.");
            console.error("Error fetching needs:", err);
            setNeeds([]);
        } finally { setLoading(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userClubId, supabase /* Add filter state vars here */]);

    useEffect(() => {
        fetchNeeds();
    }, [fetchNeeds]);

    // Basic client-side filtering (adapt for needs columns)
    const filteredNeeds = needs.filter(need => {
        const positionMatch = positionFilter === 'all' || need.position_needed === positionFilter;
        const footMatch = footFilter === 'all' || need.preferred_foot === footFilter;
        // Add more filter conditions here later
        return positionMatch && footMatch;
    });

    // Format budget helper
    const formatBudget = (budget: number | null | undefined) => {
        if (budget == null) return '-';
        return `≤ €${budget.toLocaleString()}`;
    }

    return (
        <Card> {/* Keep the Card structure */}
            <CardHeader>
                <CardTitle>Club Needs</CardTitle>
                <CardDescription>Recruitment needs posted by other clubs.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mb-4 flex flex-wrap gap-2">
                    {/* Filters for Needs */}
                    <Select value={positionFilter} onValueChange={setPositionFilter}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Filter by position needed" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Positions</SelectItem>
                            {/* Populate dynamically or hardcode */}
                            <SelectItem value="Goalkeeper">Goalkeeper</SelectItem>
                            <SelectItem value="Centre Back">Centre Back</SelectItem>
                            <SelectItem value="Full Back">Full Back</SelectItem>
                            <SelectItem value="Defensive Midfielder">Defensive Midfielder</SelectItem>
                            <SelectItem value="Central Midfielder">Central Midfielder</SelectItem>
                            <SelectItem value="Attacking Midfielder">Attacking Midfielder</SelectItem>
                            <SelectItem value="Winger">Winger</SelectItem>
                            <SelectItem value="Centre Forward">Centre Forward</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={footFilter} onValueChange={setFootFilter}>
                        <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Preferred Foot" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Any Foot</SelectItem>
                            <SelectItem value="Left">Left</SelectItem>
                            <SelectItem value="Right">Right</SelectItem>
                            <SelectItem value="Both">Both</SelectItem>
                        </SelectContent>
                    </Select>
                    {/* Add other filters like Age Range, Budget Range later */}
                </div>

                {/* Display Area */}
                {loading && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin"/></div>}
                {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                {!loading && !error && needs.length === 0 && <p className="text-center text-muted-foreground py-10">No active recruitment needs found from other clubs.</p>}
                {!loading && !error && needs.length > 0 && filteredNeeds.length === 0 && <p className="text-center text-muted-foreground py-10">No needs match the current filter.</p>}

                {/* Table Display */}
                {!loading && !error && filteredNeeds.length > 0 && (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Club Looking</TableHead>
                                    <TableHead>Position Needed</TableHead>
                                    <TableHead>Age</TableHead>
                                    <TableHead>Foot</TableHead>
                                    <TableHead>Max Budget (Transfer)</TableHead>
                                    <TableHead>Max Budget (Loan)</TableHead>
                                    <TableHead>Posted On</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredNeeds.map(need => (
                                    <TableRow key={need.need_id}>
                                        <TableCell className="font-medium">{need.posting_club_name || 'Unknown Club'}</TableCell>
                                        <TableCell><Badge variant="secondary">{need.position_needed}</Badge></TableCell>
                                        <TableCell>{need.min_age || need.max_age ? `${need.min_age ?? '?'} - ${need.max_age ?? '?'}` : '-'}</TableCell>
                                        <TableCell>{need.preferred_foot || '-'}</TableCell>
                                        <TableCell>{formatBudget(need.budget_transfer_max)}</TableCell>
                                        <TableCell>{formatBudget(need.budget_loan_fee_max)}</TableCell>
                                        <TableCell>{need.need_created_at ? new Date(need.need_created_at).toLocaleDateString() : 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm">View Details</Button> {/* TODO: Implement action */}
                                            <Button size="sm" variant="default" className="ml-2">Contact</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
                {/* Add Pagination if needed later */}
            </CardContent>
        </Card>
    );
}