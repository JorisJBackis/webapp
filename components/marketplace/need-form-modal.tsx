// components/marketplace/need-form-modal.tsx
"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, X } from 'lucide-react'; // Added X
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { toast } from '@/components/ui/use-toast';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"; // Added FormDescription
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// --- Type Definition for data expected from parent ---
// This should match the type returned by get_my_recruitment_needs function
type MyRecruitmentNeed = Database['public']['Functions']['get_my_recruitment_needs']['Returns'][number];

// --- Zod Schema for Form Validation ---
const needFormSchema = z.object({
    position_needed: z.string().min(1, "Position is required."),
    min_age: z.number().int().positive().optional().nullable(), // to number, ensure integer
    max_age: z.number().int().positive().optional().nullable(),
    min_height: z.number().int().positive().optional().nullable(),
    max_height: z.number().int().positive().optional().nullable(),
    preferred_foot: z.string().optional().nullable(), // Keep as string for Select
    budget_transfer_max: z.number().positive().optional().nullable(),
    budget_loan_fee_max: z.number().positive().optional().nullable(),
    salary_range: z.string().max(50, "Salary range text too long.").optional().nullable(),
    notes: z.string().max(1000, "Notes cannot exceed 1000 characters.").optional().nullable(),
    status: z.enum(['active', 'closed'], {error: "Status is required"}), // Added Status
}).refine(data => {
    // Optional: Add validation if min > max
    if (data.min_age && data.max_age && data.min_age > data.max_age) {
        return false;
    }
    return true;
}, { message: "Min age cannot be greater than Max age.", path: ["min_age"] })
    .refine(data => {
        if (data.min_height && data.max_height && data.min_height > data.max_height) {
            return false;
        }
        return true;
    }, { message: "Min height cannot be greater than Max height.", path: ["min_height"] });

type NeedFormValues = z.infer<typeof needFormSchema>;


// --- NeedFormModal Component ---
export default function NeedFormModal({
                                          isOpen,
                                          onClose,
                                          needToEdit, // Expecting data matching MyRecruitmentNeed
                                          userClubId,
                                          onNeedPosted // Callback to refresh parent list
                                      }: {
    isOpen: boolean;
    onClose: () => void;
    needToEdit?: MyRecruitmentNeed | null;
    userClubId: number | null;
    onNeedPosted: () => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = createClient();

    const form = useForm<NeedFormValues>({
        resolver: zodResolver(needFormSchema),
        defaultValues: {}, // Set by useEffect
    });

    // Effect to reset form when modal opens or data changes
    useEffect(() => {
        if (isOpen) {
            console.log("Resetting Need Form. Editing:", needToEdit);
            form.reset({
                position_needed: needToEdit?.position_needed ?? "",
                min_age: needToEdit?.min_age ?? null,
                max_age: needToEdit?.max_age ?? null,
                min_height: needToEdit?.min_height ?? null,
                max_height: needToEdit?.max_height ?? null,
                preferred_foot: needToEdit?.preferred_foot ?? null, // Default to null if not editing
                budget_transfer_max: needToEdit?.budget_transfer_max ?? null,
                budget_loan_fee_max: needToEdit?.budget_loan_fee_max ?? null,
                salary_range: needToEdit?.salary_range ?? null,
                notes: needToEdit?.notes ?? null,
                status: needToEdit?.status as ('active' | 'closed') ?? 'active', // Default new needs to active
            });
        }
    }, [isOpen, needToEdit, form]);


    const onSubmit = async (values: NeedFormValues) => {
        if (!userClubId || !supabase) {
            toast({ title: "Error", description: "Cannot save need: Missing user or connection info.", variant: "destructive"});
            return;
        }
        setIsSubmitting(true);

        try {
            // Data for DB (matches recruitment_needs table columns)
            const dataForDB = {
                created_by_club_id: userClubId, // Set on create only
                position_needed: values.position_needed,
                min_age: values.min_age,
                max_age: values.max_age,
                min_height: values.min_height,
                max_height: values.max_height,
                preferred_foot: values.preferred_foot === 'all' ? null : values.preferred_foot, // Store null if 'all'
                budget_transfer_max: values.budget_transfer_max,
                budget_loan_fee_max: values.budget_loan_fee_max,
                salary_range: values.salary_range,
                notes: values.notes,
                status: values.status, // Status from form
                updated_at: new Date().toISOString()
            };

            let response;
            if (needToEdit) {
                // --- EDIT LOGIC ---
                console.log("Updating need ID:", needToEdit.need_id, "with data:", dataForDB);
                // Remove fields not updated or handled by DB default on create
                const { created_by_club_id, ...updateData } = dataForDB;
                response = await supabase
                    .from('recruitment_needs')
                    .update(updateData)
                    .eq('need_id', needToEdit.need_id);
            } else {
                // --- CREATE LOGIC ---
                console.log("Inserting new need:", dataForDB);
                // Let DB handle created_at default, remove updated_at for insert
                const { updated_at, ...insertData } = dataForDB;
                response = await supabase
                    .from('recruitment_needs')
                    .insert(insertData);
            }

            if (response.error) throw response.error;

            toast({ title: "Success", description: `Recruitment need ${needToEdit ? 'updated' : 'posted'} successfully.` });
            onNeedPosted(); // Refresh list in parent component
            onClose(); // Close the modal

        } catch (err: any) {
            console.error(`Error ${needToEdit ? 'updating' : 'posting'} need:`, err);
            toast({ title: "Error", description: `Failed to ${needToEdit ? 'update' : 'post'} need: ${err.message}`, variant: "destructive"});
        } finally {
            setIsSubmitting(false);
        }
    };


    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]"> {/* Slightly wider modal */}
                <DialogHeader>
                    <DialogTitle>{needToEdit ? 'Edit Recruitment Need' : 'Post New Recruitment Need'}</DialogTitle>
                    <DialogDescription>
                        Specify the details of the player profile you are looking for.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">

                        {/* Column 1 */}
                        <div className="space-y-4">
                            <FormField control={form.control} name="position_needed" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Position Needed*</FormLabel>
                                    <FormControl><Input placeholder="e.g., Left Winger, Striker" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <div className="flex gap-4">
                                <FormField control={form.control} name="min_age" render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>Min Age</FormLabel>
                                        <FormControl><Input type="number" placeholder="e.g., 18" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="max_age" render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>Max Age</FormLabel>
                                        <FormControl><Input type="number" placeholder="e.g., 23" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <div className="flex gap-4">
                                <FormField control={form.control} name="min_height" render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>Min Height (cm)</FormLabel>
                                        <FormControl><Input type="number" placeholder="e.g., 175" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="max_height" render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>Max Height (cm)</FormLabel>
                                        <FormControl><Input type="number" placeholder="e.g., 190" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <FormField control={form.control} name="preferred_foot" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Preferred Foot</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value ?? "all"}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="all">Any</SelectItem>
                                            <SelectItem value="Left">Left</SelectItem>
                                            <SelectItem value="Right">Right</SelectItem>
                                            <SelectItem value="Both">Both</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-4">
                            <FormField control={form.control} name="budget_transfer_max" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Max Transfer Budget (€)</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g., 100000" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} /></FormControl>
                                    <FormDescription className="text-xs">Max amount willing to pay for transfer.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="budget_loan_fee_max" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Max Loan Fee (€)</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g., 75000" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} /></FormControl>
                                    <FormDescription className="text-xs">Max fee willing to pay for a loan.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="salary_range" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Salary Range (Optional)</FormLabel>
                                    <FormControl><Input placeholder="e.g., €2k-3k / month" {...field} value={field.value ?? ''}/></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="notes" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl><Textarea placeholder="Specific requirements, tactical fit, etc." className="min-h-[100px]" {...field} value={field.value ?? ''} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            {/* Status (Only relevant for Edit, maybe hide on Create?) */}
                            {needToEdit && (
                                <FormField control={form.control} name="status" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value ?? "active"}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="closed">Closed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            )}
                        </div>

                        {/* Footer - Spanning both columns */}
                        <DialogFooter className="md:col-span-2">
                            <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {needToEdit ? 'Update Need' : 'Post Need'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
