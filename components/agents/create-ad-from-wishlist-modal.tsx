"use client"

import { useState, useEffect } from 'react'
// import { createClient } from '@/lib/supabase/client' // TEMPORARILY DISABLED FOR UI PREVIEW
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { toast } from '@/components/ui/use-toast'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

type WatchlistPlayer = {
  watchlist_id: number
  club_id: number
  club_name: string
  player_id: number
  player_name: string
  player_position: string
  wyscout_player_id: number
  player_club_id: number | null
  player_club_name: string | null
  added_to_watchlist_at: string
  is_in_roster: boolean
}

interface CreateAdModalProps {
  isOpen: boolean
  onClose: () => void
  player: WatchlistPlayer
  agentId: string
  onAdCreated: () => void
}

// Zod Schema for Form Validation
const listingFormSchema = z.object({
  listing_type: z.enum(['loan', 'transfer'], { errorMap: () => ({ message: "Listing type is required" }) }),
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

export default function CreateAdModal({ isOpen, onClose, player, agentId, onAdCreated }: CreateAdModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  // TEMPORARILY DISABLED FOR UI PREVIEW
  // const supabase = createClient()

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      listing_type: undefined,
      asking_price: null,
      loan_fee: null,
      loan_duration: null,
      listing_notes: null
    }
  })

  const listingType = form.watch("listing_type")

  const onSubmit = async (values: ListingFormValues) => {
    // TEMPORARY: Mock submission for UI preview
    if (!agentId) {
      toast({ 
        title: "Error", 
        description: "Cannot save listing: Missing user info.", 
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // TEMPORARY: Just show success message without saving to DB
    console.log("MOCK: Creating new listing:", {
      listed_by_agent_id: agentId,
      listed_by_club_id: null,
      wyscout_player_id: player.wyscout_player_id,
      listing_type: values.listing_type,
      asking_price: values.listing_type === 'transfer' ? values.asking_price : null,
      loan_fee: values.listing_type === 'loan' ? values.loan_fee : null,
      loan_duration: values.listing_type === 'loan' ? values.loan_duration : null,
      listing_notes: values.listing_notes,
      status: 'active',
    })

    toast({ 
      title: "Success (Mock)", 
      description: `Ad created successfully for ${player.player_name}. (This is a UI preview - no data was saved)` 
    })
    
    onAdCreated()
    setIsSubmitting(false)

    // TEMPORARILY DISABLED - REAL VERSION:
    // try {
    //   // Data for DB (matches player_listings table columns)
    //   const dataForDB = {
    //     listed_by_agent_id: agentId,
    //     listed_by_club_id: null, // Agents don't have a club
    //     wyscout_player_id: player.wyscout_player_id,
    //     listing_type: values.listing_type,
    //     asking_price: values.listing_type === 'transfer' ? values.asking_price : null,
    //     loan_fee: values.listing_type === 'loan' ? values.loan_fee : null,
    //     loan_duration: values.listing_type === 'loan' ? values.loan_duration : null,
    //     listing_notes: values.listing_notes,
    //     status: 'active' as const,
    //     updated_at: new Date().toISOString()
    //   }

    //   console.log("Creating new listing:", dataForDB)

    //   const { error } = await supabase
    //     .from('player_listings')
    //     .insert(dataForDB)

    //   if (error) throw error

    //   toast({ 
    //     title: "Success", 
    //     description: `Ad created successfully for ${player.player_name}.` 
    //   })
      
    //   onAdCreated()
    // } catch (err: any) {
    //   console.error('Error creating listing:', err)
    //   toast({ 
    //     title: "Error", 
    //     description: `Failed to create ad: ${err.message}`, 
    //     variant: "destructive"
    //   })
    // } finally {
    //   setIsSubmitting(false)
    // }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create Ad for {player.player_name}</DialogTitle>
          <DialogDescription>
            Create a listing for this player. This player is in {player.club_name}'s watchlist.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                      value={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="transfer" />
                        </FormControl>
                        <FormLabel className="font-normal">Transfer</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="loan" />
                        </FormControl>
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
              <FormField 
                control={form.control} 
                name="asking_price" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asking Price (€)*</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g., 10000" 
                        {...field} 
                        value={field.value ?? ''} 
                        onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />
            )}
            
            {listingType === 'loan' && (
              <>
                <FormField 
                  control={form.control} 
                  name="loan_fee" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan Fee (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g., 50000" 
                          {...field} 
                          value={field.value ?? ''} 
                          onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                <FormField 
                  control={form.control} 
                  name="loan_duration" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan Duration</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value ?? undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select loan duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="6 months">6 Months</SelectItem>
                          <SelectItem value="1 season">1 Season</SelectItem>
                          <SelectItem value="Other">Other (Specify in notes)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
              </>
            )}

            {/* Notes */}
            <FormField 
              control={form.control} 
              name="listing_notes" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any additional details..." 
                      {...field} 
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} 
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Ad
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

