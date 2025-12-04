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
import { WishlistClub } from './wishlist-club-card'

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

// Zod schema for club form validation (aligned with DB: varchar(255), jsonb filters)
const clubFormSchema = z.object({
  name: z.string()
    .min(1, "Club name is required.")
    .max(255, "Name must be under 255 characters."),
  club_logo_url: z.string()
    .url("Must be a valid URL")
    .or(z.literal(''))
    .optional()
    .nullable(),
  // Base filters - ranges based on actual player data
  age_min: z.number()
    .int("Age must be a whole number.")
    .min(14, "Min age must be at least 14.")
    .max(50, "Min age cannot exceed 50.")
    .optional()
    .nullable(),
  age_max: z.number()
    .int("Age must be a whole number.")
    .min(14, "Max age must be at least 14.")
    .max(50, "Max age cannot exceed 50.")
    .optional()
    .nullable(),
  height_min: z.number()
    .int("Height must be a whole number.")
    .min(140, "Min height must be at least 140 cm.")
    .max(220, "Min height cannot exceed 220 cm.")
    .optional()
    .nullable(),
  height_max: z.number()
    .int("Height must be a whole number.")
    .min(140, "Max height must be at least 140 cm.")
    .max(220, "Max height cannot exceed 220 cm.")
    .optional()
    .nullable(),
  foot: z.string().optional().nullable(),
  eu_passport: z.boolean().optional().nullable(),
  league_tiers: z.array(z.number().int().min(1).max(5)).optional(),
  contract_expiring_months: z.number().int().min(1).max(60).optional().nullable(),
  market_value_min: z.number()
    .int("Value must be a whole number.")
    .min(0, "Value cannot be negative.")
    .max(500000000, "Value cannot exceed 500M.")
    .optional()
    .nullable(),
  market_value_max: z.number()
    .int("Value must be a whole number.")
    .min(0, "Value cannot be negative.")
    .max(500000000, "Value cannot exceed 500M.")
    .optional()
    .nullable(),
}).refine(data => {
  if (data.age_min != null && data.age_max != null && data.age_min > data.age_max) {
    return false
  }
  return true
}, { message: "Min age cannot be greater than max age.", path: ["age_max"] })
.refine(data => {
  if (data.height_min != null && data.height_max != null && data.height_min > data.height_max) {
    return false
  }
  return true
}, { message: "Min height cannot be greater than max height.", path: ["height_max"] })
.refine(data => {
  if (data.market_value_min != null && data.market_value_max != null && data.market_value_min > data.market_value_max) {
    return false
  }
  return true
}, { message: "Min value cannot be greater than max value.", path: ["market_value_max"] })

type ClubFormValues = z.infer<typeof clubFormSchema>

interface WishlistClubFormModalProps {
  isOpen: boolean
  onClose: () => void
  agentId: string | null
  clubToEdit?: WishlistClub | null
  onClubSaved: (club: WishlistClub) => void
}

export default function WishlistClubFormModal({
  isOpen,
  onClose,
  agentId,
  clubToEdit,
  onClubSaved
}: WishlistClubFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const form = useForm<ClubFormValues>({
    resolver: zodResolver(clubFormSchema),
    defaultValues: {}
  })

  // Reset form when modal opens or edit data changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: clubToEdit?.name ?? "",
        club_logo_url: clubToEdit?.club_logo_url ?? "",
        age_min: clubToEdit?.base_filters?.age_min ?? null,
        age_max: clubToEdit?.base_filters?.age_max ?? null,
        height_min: clubToEdit?.base_filters?.height_min ?? null,
        height_max: clubToEdit?.base_filters?.height_max ?? null,
        foot: clubToEdit?.base_filters?.foot ?? null,
        eu_passport: clubToEdit?.base_filters?.eu_passport ?? null,
        league_tiers: clubToEdit?.base_filters?.league_tiers ?? [],
        contract_expiring_months: clubToEdit?.base_filters?.contract_expiring_months ?? null,
        market_value_min: clubToEdit?.base_filters?.market_value_min ?? null,
        market_value_max: clubToEdit?.base_filters?.market_value_max ?? null,
      })
    }
  }, [isOpen, clubToEdit, form])

  const onSubmit = async (values: ClubFormValues) => {
    if (!agentId || !supabase) {
      toast({ title: "Error", description: "Cannot save: Missing agent info.", variant: "destructive" })
      return
    }
    setIsSubmitting(true)

    try {
      // Build base_filters object (only include non-empty values)
      const base_filters: WishlistFilters = {}

      if (values.age_min != null) base_filters.age_min = values.age_min
      if (values.age_max != null) base_filters.age_max = values.age_max
      if (values.height_min != null) base_filters.height_min = values.height_min
      if (values.height_max != null) base_filters.height_max = values.height_max
      if (values.foot && values.foot !== '') base_filters.foot = values.foot
      if (values.eu_passport != null) base_filters.eu_passport = values.eu_passport
      if (values.league_tiers && values.league_tiers.length > 0) base_filters.league_tiers = values.league_tiers
      if (values.contract_expiring_months != null) base_filters.contract_expiring_months = values.contract_expiring_months
      if (values.market_value_min != null) base_filters.market_value_min = values.market_value_min
      if (values.market_value_max != null) base_filters.market_value_max = values.market_value_max

      const dataForDB = {
        agent_id: agentId,
        name: values.name,
        club_logo_url: values.club_logo_url || null,
        base_filters: base_filters,
        updated_at: new Date().toISOString()
      }

      let savedClub: WishlistClub

      if (clubToEdit) {
        // Update existing club
        const { agent_id, ...updateData } = dataForDB
        const { data, error } = await supabase
          .from('agent_wishlist_clubs')
          .update(updateData)
          .eq('id', clubToEdit.id)
          .select()
          .single()

        if (error) throw error
        savedClub = { ...data, positions: clubToEdit.positions } as WishlistClub
      } else {
        // Create new club
        const { data, error } = await supabase
          .from('agent_wishlist_clubs')
          .insert(dataForDB)
          .select()
          .single()

        if (error) throw error
        savedClub = { ...data, positions: [] } as WishlistClub
      }

      toast({
        title: "Success",
        description: `Club "${values.name}" ${clubToEdit ? 'updated' : 'created'} successfully.`
      })

      onClubSaved(savedClub)
      onClose()

    } catch (err: any) {
      console.error(`Error ${clubToEdit ? 'updating' : 'creating'} club:`, err)
      toast({
        title: "Error",
        description: `Failed to ${clubToEdit ? 'update' : 'create'} club: ${err.message}`,
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{clubToEdit ? 'Edit Club' : 'Add New Club'}</DialogTitle>
          <DialogDescription>
            Create a club request with optional base filters that apply to all positions.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Club Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Club Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Manchester United" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="club_logo_url" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Club Logo URL</FormLabel>
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

            {/* Base Filters Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Base Filters (Optional)</h3>
              <FormDescription className="text-xs">
                These filters apply to all positions under this club. Position-specific filters will override these.
              </FormDescription>

              {/* Physical Attributes */}
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

              {/* League & Contract */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="league_tiers" render={({ field }) => (
                  <FormItem>
                    <FormLabel>League Tiers</FormLabel>
                    <div className="flex flex-wrap gap-3">
                      {LEAGUE_TIER_OPTIONS.map((tier) => (
                        <div key={tier} className="flex items-center space-x-2">
                          <Checkbox
                            id={`club-tier-${tier}`}
                            checked={(field.value || []).includes(tier)}
                            onCheckedChange={() => {
                              field.onChange(toggleLeagueTier(tier, field.value || []))
                            }}
                          />
                          <Label htmlFor={`club-tier-${tier}`} className="text-sm cursor-pointer">
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

              {/* Market Value */}
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
                {clubToEdit ? 'Update Club' : 'Create Club'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
