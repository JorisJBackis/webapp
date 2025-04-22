// components/marketplace/my-listings.tsx
"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, AlertCircle, Trash2, Pencil } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { toast } from '@/components/ui/use-toast';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label"; // Import Label
import { Input } from "@/components/ui/input"; // Import Input
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// --- Type Definitions ---

type FunctionReturns = Database['public']['Functions']
type LatestPlayerFromRPC = FunctionReturns['get_latest_players_for_club']['Returns'][number];

// Type for players selectable in the form
type ClubPlayer = {
    id: number; // The players table ID (latest row) - assuming this is from players table, not listings
    name: string;
    wyscout_player_id: number | string; // The crucial identifier
    position: string;
}

// Type matching the RETURNS TABLE of the get_my_player_listings function
// Ensure this matches the output columns of your SQL function EXACTLY
type MyPlayerListing = {
    listing_id: number;
    listed_by_club_id: number;
    wyscout_player_id_out: number | string; // Use the name from SQL function return
    listing_type: 'loan' | 'transfer';
    status: string;
    asking_price: number | null;
    loan_fee: number | null;
    loan_duration: string | null;
    listing_created_at: string;
    player_name: string | null; // Can be null if join fails
    player_position: string | null; // Can be null if join fails
};

// Zod Schema for Form Validation
const listingFormSchema = z.object({
    wyscout_player_id: z.union([z.string().min(1, "Player selection is required"), z.number()]),
    listing_type: z.enum(['loan', 'transfer'], { required_error: "Listing type is required" }),
    asking_price: z.coerce.number().positive("Price must be positive").optional().nullable(),
    loan_fee: z.coerce.number().positive("Fee must be positive").optional().nullable(),
    loan_duration: z.string().optional().nullable(),
    listing_notes: z.string().max(500, "Notes too long").optional().nullable(),
}).refine(data => {
    // Require asking_price if type is 'transfer'
    if (data.listing_type === 'transfer' && (data.asking_price === undefined || data.asking_price === null || data.asking_price <= 0)) {
        return false;
    }
    return true;
}, {
    message: "Asking price is required for transfer listings.",
    path: ["asking_price"],
}).refine(data => {
    // Require loan_fee OR loan_duration if type is 'loan'
    if (data.listing_type === 'loan' && (data.loan_fee === undefined || data.loan_fee === null || data.loan_fee <= 0) && (!data.loan_duration || data.loan_duration.trim() === '' )) {
        return false;
    }
    return true;
}, {
    message: "Loan fee or duration is required for loan listings.",
    path: ["loan_fee"], // Point error to one field
});

type ListingFormValues = z.infer<typeof listingFormSchema>;


// --- ListingFormModal Component ---
// Defined outside MyListings to avoid re-declaration on renders
function ListingFormModal({
                              isOpen,
                              onClose,
                              listingToEdit,
                              clubPlayers,
                              userClubId,
                              onListingCreated
                          }: {
    isOpen: boolean;
    onClose: () => void;
    listingToEdit?: MyPlayerListing | null; // Use MyPlayerListing type
    clubPlayers: ClubPlayer[];
    userClubId: number | null;
    onListingCreated: () => void;
}) {
    console.log("ListingFormModal received clubPlayers:", clubPlayers); // <-- LOG 4
    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = createClient();

    const form = useForm<ListingFormValues>({
        resolver: zodResolver(listingFormSchema),
        // Set default values based on whether editing or creating
        defaultValues: {
            wyscout_player_id: listingToEdit?.wyscout_player_id_out?.toString() ?? "",
            listing_type: listingToEdit?.listing_type ?? undefined,
            asking_price: listingToEdit?.asking_price ?? null,
            loan_fee: listingToEdit?.loan_fee ?? null,
            loan_duration: listingToEdit?.loan_duration ?? null,
            listing_notes: null // Assume notes aren't pre-filled from listing (add if needed)
        },
    });

    useEffect(() => {
        // Reset form when opening or switching between edit/create
        if (isOpen) {
            form.reset({
                wyscout_player_id: listingToEdit?.wyscout_player_id_out?.toString() ?? "",
                listing_type: listingToEdit?.listing_type ?? undefined,
                asking_price: listingToEdit?.asking_price ?? null,
                loan_fee: listingToEdit?.loan_fee ?? null,
                loan_duration: listingToEdit?.loan_duration ?? null,
                listing_notes: null // Reset notes (add listingToEdit.listing_notes if needed)
            });
        }
    }, [isOpen, listingToEdit, form]);


    const listingType = form.watch("listing_type");

    const onSubmit = async (values: ListingFormValues) => {
        if (!userClubId) {
            toast({ title: "Error", description: "Cannot create listing: Club ID missing.", variant: "destructive"});
            return;
        }
        setIsSubmitting(true);

        try {
            const dataToSubmit = {
                listed_by_club_id: userClubId,
                // Use 'wyscout_player_id' as the column name in your DB table
                wyscout_player_id: Number(values.wyscout_player_id),
                listing_type: values.listing_type,
                asking_price: values.listing_type === 'transfer' ? values.asking_price : null,
                loan_fee: values.listing_type === 'loan' ? values.loan_fee : null,
                loan_duration: values.listing_type === 'loan' ? values.loan_duration : null,
                listing_notes: values.listing_notes,
                status: 'active' as const // Explicitly set status
            };

            console.log("Submitting listing:", dataToSubmit);

            let error: any;
            if (listingToEdit) {
                // --- EDIT LOGIC ---
                console.log("Updating listing ID:", listingToEdit.listing_id);
                const { error: updateError } = await supabase
                    .from('player_listings')
                    .update({ // Only update fields that can change
                        listing_type: dataToSubmit.listing_type,
                        status: dataToSubmit.status, // Allow updating status? Add to form if needed
                        asking_price: dataToSubmit.asking_price,
                        loan_fee: dataToSubmit.loan_fee,
                        loan_duration: dataToSubmit.loan_duration,
                        listing_notes: dataToSubmit.listing_notes,
                        updated_at: new Date().toISOString() // Update timestamp
                    })
                    .eq('listing_id', listingToEdit.listing_id);
                error = updateError;
            } else {
                // --- CREATE LOGIC ---
                console.log("Inserting new listing");
                const { error: insertError } = await supabase
                    .from('player_listings')
                    .insert(dataToSubmit);
                error = insertError;
            }


            if (error) throw error;

            toast({ title: "Success", description: `Player listing ${listingToEdit ? 'updated' : 'created'} successfully.` });
            onListingCreated(); // Trigger list refresh
            onClose(); // Close modal

        } catch (err: any) {
            console.error(`Error ${listingToEdit ? 'updating' : 'creating'} listing:`, err);
            toast({ title: "Error", description: `Failed to ${listingToEdit ? 'update' : 'create'} listing: ${err.message}`, variant: "destructive"});
        } finally {
            setIsSubmitting(false);
        }
    };


    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>{listingToEdit ? 'Edit Listing' : 'Create New Player Listing'}</DialogTitle>
                    <DialogDescription>
                        {listingToEdit ? `Update details for ${listingToEdit.player_name}` : 'Select a player from your club and provide listing details.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        {/* Player Selection - Disabled when editing */}
                        <FormField
                            control={form.control}
                            name="wyscout_player_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Player*</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        // Use toString() for defaultValue comparison if field.value can be number
                                        defaultValue={field.value?.toString()}
                                        // Disable player selection when editing an existing listing
                                        disabled={!!listingToEdit}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a player to list" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {/* Add this check */}
                                            {(!clubPlayers || clubPlayers.length === 0) && <SelectItem value="-" disabled>No players available or loading...</SelectItem>}
                                            {/* Make sure clubPlayers actually exists before mapping */}
                                            {clubPlayers && clubPlayers.map(p => (
                                                <SelectItem key={p.wyscout_player_id.toString()} value={p.wyscout_player_id.toString()}>
                                                    {p.name} ({p.position})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Listing Type */}
                        <FormField
                            control={form.control}
                            name="listing_type"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Listing Type*</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value} // Use defaultValue here too
                                            className="flex space-x-4"
                                        >
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="transfer" /></FormControl>
                                                <FormLabel className="font-normal">Transfer</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="loan" /></FormControl>
                                                <FormLabel className="font-normal">Loan</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Conditional Fields */}
                        {listingType === 'transfer' && (
                            <FormField control={form.control} name="asking_price" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Asking Price (€)*</FormLabel>
                                    {/* Use value={field.value ?? ''} to handle null/undefined */}
                                    <FormControl><Input type="number" placeholder="e.g., 500000" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        )}
                        {listingType === 'loan' && (
                            <>
                                <FormField control={form.control} name="loan_fee" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Loan Fee (€)</FormLabel>
                                        <FormControl><Input type="number" placeholder="e.g., 50000" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="loan_duration" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Loan Duration</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select loan duration" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="6 months">6 Months</SelectItem>
                                                <SelectItem value="1 season">1 Season</SelectItem>
                                                <SelectItem value="Other">Other (Specify in notes)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </>
                        )}

                        {/* Notes */}
                        <FormField control={form.control} name="listing_notes" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Notes (Optional)</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Add any additional details..." {...field} value={field.value ?? ''}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />


                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {listingToEdit ? 'Save Changes' : 'Create Listing'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}


// --- MyListings Component Definition ---
export default function MyListings() {
    const [myListings, setMyListings] = useState<MyPlayerListing[]>([]);
    const [clubPlayers, setClubPlayers] = useState<ClubPlayer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [listingToEdit, setListingToEdit] = useState<MyPlayerListing | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [listingToDelete, setListingToDelete] = useState<MyPlayerListing | null>(null);
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
                    // Keep previous error check, ensure loading stops if no club ID found after check
                    if (!error) setError("Could not determine your club ID to fetch listings.");
                    console.error("Profile fetch error or no club ID:", profileError);
                    setLoading(false);
                }
            } else {
                setError("User not logged in.");
                setLoading(false);
            }
        };
        getClubId();
    }, [supabase]); // Removed 'error' dependency to avoid loops if error is set


    // Fetch listings AND players once clubId is known
    const fetchListingsAndPlayers = async () => {
        if (!userClubId) {
            // Only set loading if we don't have an error already AND not already loading
            if (!error && !loading) setLoading(true);
            return;
        }

        setLoading(true);
        setError(null);
        // Don't reset listings/players here, let refresh handle it if needed

        try {
            console.log(`Fetching my listings AND players via RPC for club ID: ${userClubId}`);

            const [listingsResponse, playersResponse] = await Promise.all([
                supabase.rpc('get_my_player_listings', { requesting_club_id: userClubId }),
                supabase.rpc('get_latest_players_for_club', { p_club_id: userClubId })
            ]);

            if (listingsResponse.error) throw listingsResponse.error;
            const fetchedListings = listingsResponse.data as MyPlayerListing[] | null;
            setMyListings(fetchedListings || []);

            if (playersResponse.error) {
                console.error("PLAYER FETCH FAILED:", playersResponse.error); // Log player-specific error
                throw playersResponse.error;
            }
            const fetchedPlayersData: LatestPlayerFromRPC[] | null = playersResponse.data;

            console.log("Fetched club players RAW data:", fetchedPlayersData); // <-- LOG 1

            const selectablePlayers: ClubPlayer[] = (fetchedPlayersData || [])
                .filter(p => p.wyscout_player_id_out != null) // Filter out players without wyscout ID
                .map(p => ({
                    id: p.id,
                    name: p.name ?? 'Unknown Player',
                    wyscout_player_id: p.wyscout_player_id_out!, // Use non-null assertion after filter
                    position: p.position ?? 'Unknown Position'
                }));

            console.log("Processed selectablePlayers:", selectablePlayers); // <-- LOG 2
            setClubPlayers(selectablePlayers);

        } catch (err: any) {
            console.error("Error fetching data for MyListings:", err);
            setError("Could not load data for your club.");
            setMyListings([]); // Clear data on error
            setClubPlayers([]);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch and refresh function
    useEffect(() => {
        fetchListingsAndPlayers();
    }, [userClubId, supabase]); // Run when clubId is available

    const refreshListings = () => {
        fetchListingsAndPlayers(); // Call the combined fetch function
    }

    // --- Handlers ---
    const handleOpenCreateModal = () => { setListingToEdit(null); setShowCreateModal(true); }
    const handleOpenEditModal = (listing: MyPlayerListing) => { setListingToEdit(listing); setShowCreateModal(true); }
    const handleDeleteClick = (listing: MyPlayerListing) => { setListingToDelete(listing); setShowDeleteConfirm(true); }

    const confirmDelete = async () => {
        if (!listingToDelete) return;
        // Consider adding a specific loading state for delete operation
        // setLoading(true);
        const { error: deleteError } = await supabase.from('player_listings').delete().eq('listing_id', listingToDelete.listing_id);
        if (deleteError) {
            console.error("Error deleting listing:", deleteError);
            toast({ title: "Error", description: "Could not delete listing.", variant: "destructive" });
        } else {
            // Optimistic UI update or call refreshListings
            setMyListings(prev => prev.filter(l => l.listing_id !== listingToDelete.listing_id));
            // refreshListings(); // Alternatively, refetch all
            toast({ title: "Success", description: "Listing deleted." });
        }
        // setLoading(false);
        setShowDeleteConfirm(false);
        setListingToDelete(null);
    };

    console.log("Rendering modal with clubPlayers:", clubPlayers); // <-- LOG 3

    // --- Render Logic ---
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div> <CardTitle>Manage Your Listings</CardTitle> <CardDescription>Create, view, and manage players your club has listed.</CardDescription> </div>
                <Button onClick={handleOpenCreateModal} disabled={!userClubId}> {/* Disable if no club ID */}
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Listing
                </Button>
            </CardHeader>
            <CardContent>
                {loading && <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-[#31348D]" /></div>}
                {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                {!loading && !error && myListings.length === 0 && <p className="text-center text-muted-foreground py-10">You haven't listed any players yet.</p>}
                {!loading && !error && myListings.length > 0 && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Player</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Price/Fee</TableHead>
                                <TableHead>Listed On</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {myListings.map((listing) => (
                                <TableRow key={listing.listing_id}>
                                    <TableCell className="font-medium">{listing.player_name || 'N/A'}</TableCell>
                                    <TableCell><Badge variant="outline">{listing.player_position || 'N/A'}</Badge></TableCell>
                                    <TableCell><Badge variant={listing.listing_type === 'loan' ? 'secondary' : 'default'}>{listing.listing_type ? listing.listing_type.charAt(0).toUpperCase() + listing.listing_type.slice(1) : 'N/A'}</Badge></TableCell>
                                    <TableCell><Badge variant={listing.status === 'active' ? 'outline' : 'destructive'} className={listing.status === 'active' ? 'border-green-500 text-green-600' : ''}>{listing.status ? listing.status.charAt(0).toUpperCase() + listing.status.slice(1) : 'N/A'}</Badge></TableCell>
                                    <TableCell> {listing.listing_type === 'transfer' ? (listing.asking_price ? `€${listing.asking_price.toLocaleString()}` : '-') : (listing.loan_fee ? `€${listing.loan_fee.toLocaleString()}` : '-')} {listing.listing_type === 'loan' && listing.loan_duration && ` (${listing.loan_duration})`}</TableCell>
                                    <TableCell>{listing.listing_created_at ? new Date(listing.listing_created_at).toLocaleDateString() : 'N/A'}</TableCell>
                                    <TableCell className="text-right"> <Button variant="ghost" size="icon" className="h-8 w-8 mr-1" onClick={(e) => {e.stopPropagation(); handleOpenEditModal(listing)}}><Pencil className="h-4 w-4"/><span className="sr-only">Edit</span></Button> <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={(e) => {e.stopPropagation(); handleDeleteClick(listing)}}><Trash2 className="h-4 w-4"/><span className="sr-only">Delete</span></Button> </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                <ListingFormModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    listingToEdit={listingToEdit}
                    clubPlayers={clubPlayers}
                    userClubId={userClubId}
                    onListingCreated={refreshListings}
                />

                <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <DialogContent>
                        <DialogHeader> <DialogTitle>Confirm Deletion</DialogTitle> <DialogDescription> Are you sure you want to delete the listing for {listingToDelete?.player_name}? This action cannot be undone. </DialogDescription> </DialogHeader>
                        <DialogFooter> <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button> <Button variant="destructive" onClick={confirmDelete} disabled={loading}> {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete Listing </Button> </DialogFooter>
                    </DialogContent>
                </Dialog>

            </CardContent>
        </Card>
    );
}