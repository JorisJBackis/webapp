"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import { toast } from '@/components/ui/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { WishlistFilters } from './wishlist-filter-summary'

// Type for wishlist data
export interface AgentWishlist {
  id: number
  agent_id: string
  name: string
  club_logo_url: string | null
  filters: WishlistFilters
  matching_player_count?: number
  created_at: string
  updated_at: string
}

// Position options
const POSITION_OPTIONS = [
  "Goalkeeper",
  "Centre-Back",
  "Left-Back",
  "Right-Back",
  "Defensive Midfield",
  "Central Midfield",
  "Attacking Midfield",
  "Left Midfield",
  "Right Midfield",
  "Midfield",
  "Left Winger",
  "Right Winger",
  "Centre-Forward",
  "Second Striker"
]

// League tier options
const LEAGUE_TIER_OPTIONS = [1, 2, 3, 4, 5]

// Contract expiring options (in months)
const CONTRACT_EXPIRING_OPTIONS = [
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "12 months" },
  { value: 18, label: "18 months" },
  { value: 24, label: "24 months" }
]

// Zod schema for form validation
const wishlistFormSchema = z.object({
  name: z.string().min(1, "Wishlist name is required.").max(255, "Name too long"),
  club_logo_url: z.string().url("Must be a valid URL").optional().nullable().or(z.literal('')),
  positions: z.array(z.string()).optional(),
  age_min: z.number().int().positive().optional().nullable(),
  age_max: z.number().int().positive().optional().nullable(),
  height_min: z.number().int().positive().optional().nullable(),
  height_max: z.number().int().positive().optional().nullable(),
  foot: z.string().optional().nullable(),
  nationalities: z.array(z.string()).optional(),
  eu_passport: z.boolean().optional().nullable(),
  league_tiers: z.array(z.number()).optional(),
  contract_expiring_months: z.number().int().positive().optional().nullable(),
  market_value_min: z.number().positive().optional().nullable(),
  market_value_max: z.number().positive().optional().nullable(),
}).refine(data => {
  if (data.age_min && data.age_max && data.age_min > data.age_max) {
    return false
  }
  return true
}, { message: "Min age cannot be greater than max age.", path: ["age_min"] })
.refine(data => {
  if (data.height_min && data.height_max && data.height_min > data.height_max) {
    return false
  }
  return true
}, { message: "Min height cannot be greater than max height.", path: ["height_min"] })
.refine(data => {
  if (data.market_value_min && data.market_value_max && data.market_value_min > data.market_value_max) {
    return false
  }
  return true
}, { message: "Min value cannot be greater than max value.", path: ["market_value_min"] })

type WishlistFormValues = z.infer<typeof wishlistFormSchema>

interface WishlistFormModalProps {
  isOpen: boolean
  onClose: () => void
  agentId: string | null
  wishlistToEdit?: AgentWishlist | null
  onWishlistSaved: (wishlist: AgentWishlist) => void
}

export default function WishlistFormModal({
  isOpen,
  onClose,
  agentId,
  wishlistToEdit,
  onWishlistSaved
}: WishlistFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const form = useForm<WishlistFormValues>({
    resolver: zodResolver(wishlistFormSchema),
    defaultValues: {}
  })

  // Reset form when modal opens or edit data changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: wishlistToEdit?.name ?? "",
        club_logo_url: wishlistToEdit?.club_logo_url ?? "",
        positions: wishlistToEdit?.filters?.positions ?? [],
        age_min: wishlistToEdit?.filters?.age_min ?? null,
        age_max: wishlistToEdit?.filters?.age_max ?? null,
        height_min: wishlistToEdit?.filters?.height_min ?? null,
        height_max: wishlistToEdit?.filters?.height_max ?? null,
        foot: wishlistToEdit?.filters?.foot ?? null,
        nationalities: wishlistToEdit?.filters?.nationalities ?? [],
        eu_passport: wishlistToEdit?.filters?.eu_passport ?? null,
        league_tiers: wishlistToEdit?.filters?.league_tiers ?? [],
        contract_expiring_months: wishlistToEdit?.filters?.contract_expiring_months ?? null,
        market_value_min: wishlistToEdit?.filters?.market_value_min ?? null,
        market_value_max: wishlistToEdit?.filters?.market_value_max ?? null,
      })
    }
  }, [isOpen, wishlistToEdit, form])

  const onSubmit = async (values: WishlistFormValues) => {
    if (!agentId || !supabase) {
      toast({ title: "Error", description: "Cannot save: Missing agent info.", variant: "destructive" })
      return
    }
    setIsSubmitting(true)

    try {
      // Build filters object (only include non-empty values)
      const filters: WishlistFilters = {}

      if (values.positions && values.positions.length > 0) filters.positions = values.positions
      if (values.age_min != null) filters.age_min = values.age_min
      if (values.age_max != null) filters.age_max = values.age_max
      if (values.height_min != null) filters.height_min = values.height_min
      if (values.height_max != null) filters.height_max = values.height_max
      if (values.foot && values.foot !== '') filters.foot = values.foot
      if (values.nationalities && values.nationalities.length > 0) filters.nationalities = values.nationalities
      if (values.eu_passport != null) filters.eu_passport = values.eu_passport
      if (values.league_tiers && values.league_tiers.length > 0) filters.league_tiers = values.league_tiers
      if (values.contract_expiring_months != null) filters.contract_expiring_months = values.contract_expiring_months
      if (values.market_value_min != null) filters.market_value_min = values.market_value_min
      if (values.market_value_max != null) filters.market_value_max = values.market_value_max

      const dataForDB = {
        agent_id: agentId,
        name: values.name,
        club_logo_url: values.club_logo_url || null,
        filters: filters,
        updated_at: new Date().toISOString()
      }

      let response
      let savedWishlist: AgentWishlist

      if (wishlistToEdit) {
        // Update existing wishlist
        const { agent_id, ...updateData } = dataForDB
        response = await supabase
          .from('agent_wishlists')
          .update(updateData)
          .eq('id', wishlistToEdit.id)
          .select()
          .single()

        if (response.error) throw response.error
        savedWishlist = response.data as AgentWishlist
      } else {
        // Create new wishlist
        response = await supabase
          .from('agent_wishlists')
          .insert(dataForDB)
          .select()
          .single()

        if (response.error) throw response.error
        savedWishlist = response.data as AgentWishlist
      }

      toast({
        title: "Success",
        description: `Wishlist "${values.name}" ${wishlistToEdit ? 'updated' : 'created'} successfully.`
      })

      onWishlistSaved(savedWishlist)
      onClose()

    } catch (err: any) {
      console.error(`Error ${wishlistToEdit ? 'updating' : 'creating'} wishlist:`, err)
      toast({
        title: "Error",
        description: `Failed to ${wishlistToEdit ? 'update' : 'create'} wishlist: ${err.message}`,
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle position checkbox toggle
  const togglePosition = (position: string, currentPositions: string[] = []) => {
    if (currentPositions.includes(position)) {
      return currentPositions.filter(p => p !== position)
    }
    return [...currentPositions, position]
  }

  // Handle league tier checkbox toggle
  const toggleLeagueTier = (tier: number, currentTiers: number[] = []) => {
    if (currentTiers.includes(tier)) {
      return currentTiers.filter(t => t !== tier)
    }
    return [...currentTiers, tier]
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{wishlistToEdit ? 'Edit Wishlist' : 'Create New Wishlist'}</DialogTitle>
          <DialogDescription>
            Specify the criteria for players you're looking for. Matching players from your roster will be shown.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Basic Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wishlist Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Manchester United - CB" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">Usually the club name and position</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="club_logo_url" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Club Logo URL (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://..."
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Position Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Position</h3>
              <FormField control={form.control} name="positions" render={({ field }) => (
                <FormItem>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {POSITION_OPTIONS.map((position) => (
                      <div key={position} className="flex items-center space-x-2">
                        <Checkbox
                          id={`pos-${position}`}
                          checked={(field.value || []).includes(position)}
                          onCheckedChange={() => {
                            field.onChange(togglePosition(position, field.value || []))
                          }}
                        />
                        <Label htmlFor={`pos-${position}`} className="text-sm cursor-pointer">
                          {position}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Physical Attributes Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Physical Attributes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex gap-4">
                  <FormField control={form.control} name="age_min" render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Min Age</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 18"
                          {...field}
                          value={field.value ?? ''}
                          onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="age_max" render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Max Age</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 28"
                          {...field}
                          value={field.value ?? ''}
                          onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="flex gap-4">
                  <FormField control={form.control} name="height_min" render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Min Height (cm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 175"
                          {...field}
                          value={field.value ?? ''}
                          onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="height_max" render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Max Height (cm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 195"
                          {...field}
                          value={field.value ?? ''}
                          onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="foot" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Foot</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === "any" ? null : val)}
                      value={field.value ?? "any"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="eu_passport" render={({ field }) => (
                  <FormItem>
                    <FormLabel>EU Passport</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        if (val === "any") field.onChange(null)
                        else if (val === "true") field.onChange(true)
                        else if (val === "false") field.onChange(false)
                      }}
                      value={field.value === null ? "any" : field.value ? "true" : "false"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="true">EU Only</SelectItem>
                        <SelectItem value="false">Non-EU Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* League & Contract Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">League & Contract</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="league_tiers" render={({ field }) => (
                  <FormItem>
                    <FormLabel>League Tiers</FormLabel>
                    <div className="flex flex-wrap gap-3">
                      {LEAGUE_TIER_OPTIONS.map((tier) => (
                        <div key={tier} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tier-${tier}`}
                            checked={(field.value || []).includes(tier)}
                            onCheckedChange={() => {
                              field.onChange(toggleLeagueTier(tier, field.value || []))
                            }}
                          />
                          <Label htmlFor={`tier-${tier}`} className="text-sm cursor-pointer">
                            Tier {tier}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="contract_expiring_months" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Expiring Within</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === "any" ? null : Number(val))}
                      value={field.value?.toString() ?? "any"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        {CONTRACT_EXPIRING_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value.toString()}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Market Value Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Market Value</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="market_value_min" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Market Value (EUR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 100000"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="market_value_max" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Market Value (EUR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 5000000"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Footer */}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {wishlistToEdit ? 'Update Wishlist' : 'Create Wishlist'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
