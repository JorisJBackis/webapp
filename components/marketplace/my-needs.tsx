// components/marketplace/my-needs.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, AlertCircle, Trash2, Pencil } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Use Card for structure
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"; // For potential future delete confirm
import { toast } from '@/components/ui/use-toast';
// Import the NeedFormModal (we'll create it next)
import NeedFormModal from './need-form-modal';

// Use generated type
type MyRecruitmentNeed = Database['public']['Functions']['get_my_recruitment_needs']['Returns'][number];

export default function MyNeeds() {
    const [myNeeds, setMyNeeds] = useState<MyRecruitmentNeed[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showNeedModal, setShowNeedModal] = useState(false); // State for the new modal
    const [needToEdit, setNeedToEdit] = useState<MyRecruitmentNeed | null>(null); // For future edit
    // Add delete state later if needed
    const [userClubId, setUserClubId] = useState<number | null>(null);
    const supabase = createClient();

    // Fetch user's club ID (same logic as MyListings)
    useEffect(() => {
        const getClubId = async () => {
            const { data: { session } } = await supabase?.auth.getSession() ?? { data: { session: null } };
            if (session?.user && supabase) {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles').select('club_id').eq('id', session.user.id).single();
                if (profile?.club_id) { setUserClubId(profile.club_id); }
                else { if (!error) setError("Could not determine Club ID."); setLoading(false); console.error(profileError);}
            } else { if (!session?.user) setError("Not logged in."); setLoading(false); }
        };
        if(supabase) getClubId(); else { setError("Client error"); setLoading(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supabase]); // Run once

    // Fetch own needs once club ID available
    const fetchMyNeeds = useCallback(async () => {
        if (!userClubId || !supabase) { if (!error) setLoading(true); return; }
        setLoading(true); setError(null);
        try {
            const { data, error: rpcError } = await supabase.rpc('get_my_recruitment_needs', {
                p_requesting_club_id: userClubId
            });
            if (rpcError) throw rpcError;
            const fetchedNeeds = data as MyRecruitmentNeed[] | null;
            setMyNeeds(fetchedNeeds || []);
        } catch (err: any) {
            setError("Could not load your recruitment needs.");
            console.error("Error fetching my needs:", err);
            setMyNeeds([]); // Clear on error
        } finally { setLoading(false); }
    }, [userClubId, supabase]);

    useEffect(() => {
        if (userClubId) { // Fetch only when clubId is available
            fetchMyNeeds();
        }
    }, [userClubId, fetchMyNeeds]); // Depend on fetchMyNeeds callback

    const handleOpenCreateModal = () => {
        setNeedToEdit(null); // Ensure create mode
        setShowNeedModal(true);
    };

    // --- Placeholder Handlers for Edit/Delete ---
    const handleOpenEditModal = (need: MyRecruitmentNeed) => {
        setNeedToEdit(need);
        setShowNeedModal(true);
        toast({ title: "Info", description: "Edit functionality not yet implemented."});
    };
    const handleDeleteClick = (need: MyRecruitmentNeed) => {
        toast({ title: "Info", description: "Delete functionality not yet implemented."});
        // Implement delete confirmation dialog later
        // setNeedToDelete(need);
        // setShowDeleteConfirm(true);
    };
    // -----------------------------------------

    return (
        <Card> {/* Wrap content in a Card */}
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Manage Your Recruitment Needs</CardTitle>
                    <CardDescription>Create and manage recruitment needs for your club.</CardDescription>
                </div>
                <Button onClick={handleOpenCreateModal} disabled={!userClubId || loading}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Post New Need
                </Button>
            </CardHeader>
            <CardContent>
                {loading && <div className="flex justify-center items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
                {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                {!loading && !error && myNeeds.length === 0 && <p className="text-center text-muted-foreground py-10">You haven't posted any recruitment needs yet.</p>}
                {!loading && !error && myNeeds.length > 0 && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Position Needed</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Age Range</TableHead>
                                <TableHead>Posted On</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {myNeeds.map((need) => (
                                <TableRow key={need.need_id}>
                                    <TableCell className="font-medium">{need.position_needed}</TableCell>
                                    <TableCell>
                                        <Badge variant={need.status === 'active' ? 'outline-solid' : 'secondary'} className={need.status === 'active' ? 'border-success text-green-600' : ''}>
                                            {need.status ? need.status.charAt(0).toUpperCase() + need.status.slice(1) : 'N/A'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{need.min_age || need.max_age ? `${need.min_age || '?'} - ${need.max_age || '?'}` : '-'}</TableCell>
                                    <TableCell>{need.need_created_at ? new Date(need.need_created_at).toLocaleDateString() : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 mr-1" onClick={() => handleOpenEditModal(need)}>
                                            <Pencil className="h-4 w-4"/><span className="sr-only">Edit</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => handleDeleteClick(need)}>
                                            <Trash2 className="h-4 w-4"/><span className="sr-only">Delete</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                {/* The Modal for Creating/Editing Needs */}
                <NeedFormModal
                    isOpen={showNeedModal}
                    onClose={() => setShowNeedModal(false)}
                    needToEdit={needToEdit} // Pass data for editing later
                    userClubId={userClubId}
                    onNeedPosted={fetchMyNeeds} // Pass the refresh function
                />
            </CardContent>
        </Card>
    );
}
