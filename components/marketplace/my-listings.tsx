// components/marketplace/my-listings.tsx
"use client";

import { useState, useEffect, useCallback } from 'react'; // Added useCallback
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// --- Type Definitions ---

// Define types based on generated database.types.ts for clarity and safety
type FunctionReturns = Database['public']['Functions'];
// Type for the data returned by get_latest_players_for_club RPC call
type LatestPlayerDB = FunctionReturns['get_latest_players_for_club']['Returns'][number];
// Type for the data returned by get_my_player_listings RPC call
type MyPlayerListing = FunctionReturns['get_my_player_listings']['Returns'][number];


// Simplified type for the player dropdown in the form
type ClubPlayer = {
    id: number; // This 'id' is the PK of the *players* table row, not the listing_id
    name: string;
    wyscout_player_id: number | string; // The unique Wyscout identifier
    position: string;
}

// Zod Schema for Form Validation
const listingFormSchema = z.object({
    // Use string for wyscout_player_id because form Select returns string value
    wyscout_player_id: z.string().min(1, "Player selection is required"),
    listing_type: z.enum(['loan', 'transfer'], { error: "Listing type is required" }),
    asking_price: z.number().positive("Price must be positive").optional().nullable(),
    loan_fee: z.number().positive("Fee must be positive").optional().nullable(),
    loan_duration: z.string().optional().nullable(),
    listing_notes: z.string().max(500, "Notes too long").optional().nullable(),
}).refine(data => {
    if (data.listing_type === 'transfer' && (data.asking_price == null || data.asking_price <= 0)) {
        return false;
    }
    return true;
}, { message: "Asking price is required for transfer listings.", path: ["asking_price"]
}).refine(data => {
    if (data.listing_type === 'loan' && (data.loan_fee == null || data.loan_fee <= 0) && (!data.loan_duration || data.loan_duration.trim() === '' )) {
        return false;
    }
    return true;
}, { message: "Loan fee or duration is required for loan listings.", path: ["loan_fee"]
});

type ListingFormValues = z.infer<typeof listingFormSchema>;


// --- ListingFormModal Component ---
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
    listingToEdit?: MyPlayerListing | null;
    clubPlayers: ClubPlayer[];
    userClubId: number | null;
    onListingCreated: () => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = createClient();

    const form = useForm<ListingFormValues>({
        resolver: zodResolver(listingFormSchema),
        // Default values will be set/reset by the useEffect below
        defaultValues: {},
    });

    // Effect to reset form when modal opens or listingToEdit changes
    useEffect(() => {
        if (isOpen) {
            const defaultType = listingToEdit?.listing_type;
            // Ensure the default type is one of the valid enum values or undefined
            const validDefaultType = (defaultType === 'loan' || defaultType === 'transfer') ? defaultType : undefined;

            console.log("Resetting form. Editing:", listingToEdit, "Setting type to:", validDefaultType);
            form.reset({
                wyscout_player_id: listingToEdit?.wyscout_player_id_out?.toString() ?? "",
                listing_type: validDefaultType, // <-- Use validated default
                asking_price: listingToEdit?.asking_price ?? null,
                loan_fee: listingToEdit?.loan_fee ?? null,
                loan_duration: listingToEdit?.loan_duration ?? null,
                listing_notes: null // Add listingToEdit?.listing_notes if needed
            });
        }
    }, [isOpen, listingToEdit, form]);


    const listingType = form.watch("listing_type");

    const onSubmit = async (values: ListingFormValues) => {
        if (!userClubId || !supabase) {
            toast({ title: "Error", description: "Cannot save listing: Missing user or connection info.", variant: "destructive"});
            return;
        }
        setIsSubmitting(true);

        try {
            // Use wyscout_player_id from the form values, convert back to number
            const selectedWyscoutId = Number(values.wyscout_player_id);
            if (isNaN(selectedWyscoutId)) {
                throw new Error("Invalid Player ID selected.");
            }

            // Data for DB (matches player_listings table columns)
            const dataForDB = {
                listed_by_club_id: userClubId,
                wyscout_player_id: selectedWyscoutId, // Column name in DB table
                listing_type: values.listing_type,
                asking_price: values.listing_type === 'transfer' ? values.asking_price : null,
                loan_fee: values.listing_type === 'loan' ? values.loan_fee : null,
                loan_duration: values.listing_type === 'loan' ? values.loan_duration : null,
                listing_notes: values.listing_notes,
                status: 'active' as const, // Assuming 'active' is part of your listing_status_enum
                updated_at: new Date().toISOString()
            };

            let response;
            if (listingToEdit) {
                // --- EDIT LOGIC ---
                console.log("Updating listing ID:", listingToEdit.listing_id, "with data:", dataForDB);
                // Don't update wyscout_player_id or listed_by_club_id when editing
                const { updated_at, listed_by_club_id, wyscout_player_id, ...updateData } = dataForDB;
                response = await supabase
                    .from('player_listings')
                    .update(updateData) // Pass only updatable fields
                    .eq('listing_id', listingToEdit.listing_id);
            } else {
                // --- CREATE LOGIC ---
                console.log("Inserting new listing:", dataForDB);
                // Let DB handle created_at default, remove updated_at for insert
                const { updated_at, ...insertData } = dataForDB;
                response = await supabase
                    .from('player_listings')
                    .insert(insertData);
            }

            if (response.error) throw response.error;

            toast({ title: "Success", description: `Player listing ${listingToEdit ? 'updated' : 'created'} successfully.` });
            onListingCreated();
            onClose();

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
                    <DialogTitle>{listingToEdit ? `Edit Listing: ${listingToEdit.player_name || 'Player'}` : 'Create New Player Listing'}</DialogTitle>
                    <DialogDescription>
                        {listingToEdit ? `Update details for ${listingToEdit.player_name}` : 'Select a player from your club and provide listing details.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        {/* Player Selection */}
                        <FormField
                            control={form.control}
                            name="wyscout_player_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Player*</FormLabel>
                                    <Select
                                        // Ensure field.value is treated as string for comparison/key
                                        onValueChange={field.onChange}
                                        value={field.value?.toString()}
                                        defaultValue={field.value?.toString()}
                                        disabled={!!listingToEdit} // Disable when editing
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a player to list" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {(!clubPlayers || clubPlayers.length === 0) && <SelectItem value="-" disabled>No players loaded...</SelectItem>}
                                            {/* Ensure key and value are strings */}
                                            {clubPlayers.map(p => (
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
                                            value={field.value} // Controlled component uses value
                                            className="flex space-x-4"
                                        >
                                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="transfer" /></FormControl><FormLabel className="font-normal">Transfer</FormLabel></FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="loan" /></FormControl><FormLabel className="font-normal">Loan</FormLabel></FormItem>
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
                                    {/* Handle null correctly */}
                                <FormControl><Input type="number" placeholder="e.g., 10000" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} /></FormControl>                                    <FormMessage />
                                </FormItem>
                            )} />
                        )}
                        {listingType === 'loan' && (
                            <>
                                <FormField control={form.control} name="loan_fee" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Loan Fee (€)</FormLabel>
                                        <FormControl><Input type="number" placeholder="e.g., 50000" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="loan_duration" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Loan Duration</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value ?? undefined}>
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
                                <FormControl><Textarea placeholder="Add any additional details..." {...field} value={field.value ?? ''}/></FormControl>
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
            const { data: { session } } = await supabase?.auth.getSession() ?? { data: { session: null } };
            if (session?.user && supabase) {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('club_id')
                    .eq('id', session.user.id)
                    .single();
                if (profile?.club_id) {
                    setUserClubId(profile.club_id);
                } else {
                    // Only set error if not already loading or errored differently
                    if (!loading && !error) setError("Could not determine your club ID.");
                    console.error("Profile fetch error or no club ID:", profileError);
                    if(loading) setLoading(false); // Ensure loading stops if this fails
                }
            } else if (!session?.user) {
                setError("User not logged in.");
                if(loading) setLoading(false);
            }
        };
        if (supabase) {
            getClubId();
        } else {
            console.error("Supabase client not initialized");
            setError("Initialization error");
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supabase]); // Run only once on mount essentially, unless supabase client changes


    // Use useCallback for the fetch function to stabilize dependencies
    const fetchListingsAndPlayers = useCallback(async () => {
        if (!userClubId || !supabase) {
            console.log("Skipping fetch: No userClubId or supabase client", { userClubId, supabase });
            // Ensure loading is false if we can't fetch
            if(loading) setLoading(false);
            return;
        }

        console.log(`Fetching listings/players for club ID: ${userClubId}`);
        setLoading(true);
        setError(null); // Reset error before fetching

        try {
            const [listingsResponse, playersResponse] = await Promise.all([
                supabase.rpc('get_my_player_listings', { requesting_club_id: userClubId }),
                supabase.rpc('get_latest_players_for_club', { p_club_id: userClubId })
            ]);

            // Process Listings
            if (listingsResponse.error) throw listingsResponse.error;
            const fetchedListings = listingsResponse.data as MyPlayerListing[] | null;
            console.log("Fetched my listings data:", fetchedListings);
            setMyListings(fetchedListings || []);

            // Process Players
            if (playersResponse.error) throw playersResponse.error;
            const fetchedPlayersData = playersResponse.data as LatestPlayerDB[] | null;
            console.log("Fetched club players RAW data:", fetchedPlayersData);

            if (Array.isArray(fetchedPlayersData)) {
                const selectablePlayers: ClubPlayer[] = fetchedPlayersData
                    .filter(p => p.wyscout_player_id != null) // Ensure correct property name
                    .map(p => ({
                        id: p.id,
                        name: p.name ?? 'Unknown Player',
                        wyscout_player_id: p.wyscout_player_id!, // Use correct property name
                        position: p.player_pos ?? 'Unknown Position' // Use correct property name from SQL alias
                    }));
                console.log("Processed selectablePlayers:", selectablePlayers);
                setClubPlayers(selectablePlayers);
            } else {
                console.warn("Fetched players data is not an array or null:", fetchedPlayersData);
                setClubPlayers([]);
            }

        } catch (err: any) {
            console.error("Error fetching data for MyListings:", err);
            setError("Could not load data for your club.");
            setMyListings([]);
            setClubPlayers([]);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userClubId, supabase]); // Dependencies for the fetch function itself


    // Effect to trigger fetch when clubId changes
    useEffect(() => {
        fetchListingsAndPlayers();
    }, [fetchListingsAndPlayers]); // Run fetchListingsAndPlayers when it (or its deps) change

    const refreshListings = () => {
        fetchListingsAndPlayers(); // Call the stable fetch function
    }

    // --- Handlers ---
    const handleOpenCreateModal = () => { setListingToEdit(null); setShowCreateModal(true); }
    const handleOpenEditModal = (listing: MyPlayerListing) => { setListingToEdit(listing); setShowCreateModal(true); }
    const handleDeleteClick = (listing: MyPlayerListing) => { setListingToDelete(listing); setShowDeleteConfirm(true); }

    const confirmDelete = async () => {
        if (!listingToDelete || !supabase) return;
        // Maybe add a different loading state for delete actions?
        // setLoading(true);
        const { error: deleteError } = await supabase.from('player_listings').delete().eq('listing_id', listingToDelete.listing_id);
        if (deleteError) {
            console.error("Error deleting listing:", deleteError);
            toast({ title: "Error", description: "Could not delete listing.", variant: "destructive" });
        } else {
            setMyListings(prev => prev.filter(l => l.listing_id !== listingToDelete.listing_id));
            toast({ title: "Success", description: "Listing deleted." });
        }
        // setLoading(false);
        setShowDeleteConfirm(false);
        setListingToDelete(null);
    };

    // --- Render Logic ---
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div> <CardTitle>Manage Your Listings</CardTitle> <CardDescription>Create, view, and manage players your club has listed.</CardDescription> </div>
                <Button onClick={handleOpenCreateModal} disabled={!userClubId || loading}>
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
                                    <TableCell><Badge variant="outline">{listing.player_pos || 'N/A'}</Badge></TableCell>
                                    <TableCell><Badge variant={listing.listing_type === 'loan' ? 'secondary' : 'default'}>{listing.listing_type ? listing.listing_type.charAt(0).toUpperCase() + listing.listing_type.slice(1) : 'N/A'}</Badge></TableCell>
                                    <TableCell><Badge variant={listing.status === 'active' ? 'outline-solid' : 'destructive'} className={listing.status === 'active' ? 'border-green-500 text-green-600' : ''}>{listing.status ? listing.status.charAt(0).toUpperCase() + listing.status.slice(1) : 'N/A'}</Badge></TableCell>
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
