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
import { WishlistClub, WishlistPosition } from './wishlist-club-card'

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

// Zod schema for position form validation (aligned with DB: varchar(255), jsonb filters)
const positionFormSchema = z.object({
  name: z.string()
    .min(1, "Position name is required.")
    .max(255, "Name must be under 255 characters."),
  positions: z.array(z.string()).min(1, "Select at least one position."),
  // Filters - ranges based on actual player data
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
  nationalities: z.array(z.string()).optional(),
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

type PositionFormValues = z.infer<typeof positionFormSchema>

interface WishlistPositionFormModalProps {
  isOpen: boolean
  onClose: () => void
  agentId: string | null
  club: WishlistClub | null
  positionToEdit?: WishlistPosition | null
  onPositionSaved: (position: WishlistPosition) => void
}

export default function WishlistPositionFormModal({
  isOpen,
  onClose,
  agentId,
  club,
  positionToEdit,
  onPositionSaved
}: WishlistPositionFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const form = useForm<PositionFormValues>({
    resolver: zodResolver(positionFormSchema),
    defaultValues: {}
  })

  // Reset form when modal opens or edit data changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: positionToEdit?.name ?? "",
        positions: positionToEdit?.filters?.positions ?? [],
        age_min: positionToEdit?.filters?.age_min ?? null,
        age_max: positionToEdit?.filters?.age_max ?? null,
        height_min: positionToEdit?.filters?.height_min ?? null,
        height_max: positionToEdit?.filters?.height_max ?? null,
        foot: positionToEdit?.filters?.foot ?? null,
        nationalities: positionToEdit?.filters?.nationalities ?? [],
        eu_passport: positionToEdit?.filters?.eu_passport ?? null,
        league_tiers: positionToEdit?.filters?.league_tiers ?? [],
        contract_expiring_months: positionToEdit?.filters?.contract_expiring_months ?? null,
        market_value_min: positionToEdit?.filters?.market_value_min ?? null,
        market_value_max: positionToEdit?.filters?.market_value_max ?? null,
      })
    }
  }, [isOpen, positionToEdit, form])

  const onSubmit = async (values: PositionFormValues) => {
    if (!agentId || !supabase || !club) {
      toast({ title: "Error", description: "Cannot save: Missing info.", variant: "destructive" })
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
        club_id: club.id,
        name: values.name,
        filters: filters,
        updated_at: new Date().toISOString()
      }

      let savedPosition: WishlistPosition

      if (positionToEdit) {
        // Update existing position
        const { agent_id, club_id, ...updateData } = dataForDB
        const { data, error } = await supabase
          .from('agent_wishlists')
          .update(updateData)
          .eq('id', positionToEdit.id)
          .select()
          .single()

        if (error) throw error
        savedPosition = data as WishlistPosition
      } else {
        // Create new position
        const { data, error } = await supabase
          .from('agent_wishlists')
          .insert(dataForDB)
          .select()
          .single()

        if (error) throw error
        savedPosition = data as WishlistPosition
      }

      toast({
        title: "Success",
        description: `Position "${values.name}" ${positionToEdit ? 'updated' : 'created'} successfully.`
      })

      onPositionSaved(savedPosition)
      onClose()

    } catch (err: any) {
      console.error(`Error ${positionToEdit ? 'updating' : 'creating'} position:`, err)
      toast({
        title: "Error",
        description: `Failed to ${positionToEdit ? 'update' : 'create'} position: ${err.message}`,
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
          <DialogTitle>
            {positionToEdit ? 'Edit Position' : 'Add Position'} - {club?.name}
          </DialogTitle>
          <DialogDescription>
            Specify position-specific filters. These will override the club's base filters.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            {/* Position Name */}
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Position Name*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Starting Goalkeeper, Backup CB" {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  A descriptive name for this position requirement
                </FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            {/* Position Selection */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Position*</h3>
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
              <h3 className="text-sm font-medium text-muted-foreground">Physical Attributes (Override)</h3>
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
              <h3 className="text-sm font-medium text-muted-foreground">League & Contract (Override)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="league_tiers" render={({ field }) => (
                  <FormItem>
                    <FormLabel>League Tiers</FormLabel>
                    <div className="flex flex-wrap gap-3">
                      {LEAGUE_TIER_OPTIONS.map((tier) => (
                        <div key={tier} className="flex items-center space-x-2">
                          <Checkbox
                            id={`pos-tier-${tier}`}
                            checked={(field.value || []).includes(tier)}
                            onCheckedChange={() => {
                              field.onChange(toggleLeagueTier(tier, field.value || []))
                            }}
                          />
                          <Label htmlFor={`pos-tier-${tier}`} className="text-sm cursor-pointer">
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
              <h3 className="text-sm font-medium text-muted-foreground">Market Value (Override)</h3>
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
                {positionToEdit ? 'Update Position' : 'Add Position'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
