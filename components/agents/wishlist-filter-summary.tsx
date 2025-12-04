"use client"

import { Badge } from "@/components/ui/badge"

// Types for wishlist filters
export interface WishlistFilters {
  positions?: string[]
  age_min?: number | null
  age_max?: number | null
  height_min?: number | null
  height_max?: number | null
  foot?: string | null
  nationalities?: string[]
  eu_passport?: boolean | null
  league_tiers?: number[]
  contract_expiring_months?: number | null
  market_value_min?: number | null
  market_value_max?: number | null
}

interface WishlistFilterSummaryProps {
  filters: WishlistFilters
  compact?: boolean // For table display (fewer badges)
}

// Format market value for display (e.g., 100000 -> "100K", 1500000 -> "1.5M")
function formatMarketValue(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`
  }
  return value.toString()
}

export default function WishlistFilterSummary({ filters, compact = false }: WishlistFilterSummaryProps) {
  const badges: { label: string; variant?: "default" | "secondary" | "outline" }[] = []

  // Position filter
  if (filters.positions && filters.positions.length > 0) {
    if (compact && filters.positions.length > 2) {
      badges.push({ label: `${filters.positions.length} positions`, variant: "secondary" })
    } else {
      filters.positions.forEach(pos => {
        badges.push({ label: pos, variant: "default" })
      })
    }
  }

  // Age range
  if (filters.age_min != null || filters.age_max != null) {
    if (filters.age_min != null && filters.age_max != null) {
      badges.push({ label: `${filters.age_min}-${filters.age_max} years`, variant: "secondary" })
    } else if (filters.age_min != null) {
      badges.push({ label: `${filters.age_min}+ years`, variant: "secondary" })
    } else if (filters.age_max != null) {
      badges.push({ label: `≤${filters.age_max} years`, variant: "secondary" })
    }
  }

  // Height range
  if (filters.height_min != null || filters.height_max != null) {
    if (filters.height_min != null && filters.height_max != null) {
      badges.push({ label: `${filters.height_min}-${filters.height_max} cm`, variant: "secondary" })
    } else if (filters.height_min != null) {
      badges.push({ label: `${filters.height_min}+ cm`, variant: "secondary" })
    } else if (filters.height_max != null) {
      badges.push({ label: `≤${filters.height_max} cm`, variant: "secondary" })
    }
  }

  // Foot preference
  if (filters.foot && filters.foot !== '') {
    badges.push({ label: `${filters.foot} foot`, variant: "outline" })
  }

  // Nationality filter
  if (filters.nationalities && filters.nationalities.length > 0) {
    if (compact && filters.nationalities.length > 2) {
      badges.push({ label: `${filters.nationalities.length} nationalities`, variant: "secondary" })
    } else {
      filters.nationalities.slice(0, compact ? 2 : 3).forEach(nat => {
        badges.push({ label: nat, variant: "outline" })
      })
      if (filters.nationalities.length > (compact ? 2 : 3)) {
        badges.push({ label: `+${filters.nationalities.length - (compact ? 2 : 3)} more`, variant: "outline" })
      }
    }
  }

  // EU passport
  if (filters.eu_passport != null) {
    badges.push({ label: filters.eu_passport ? "EU" : "Non-EU", variant: "outline" })
  }

  // League tiers
  if (filters.league_tiers && filters.league_tiers.length > 0) {
    const tierStr = filters.league_tiers.sort((a, b) => a - b).join(", ")
    badges.push({ label: `Tier ${tierStr}`, variant: "secondary" })
  }

  // Contract expiring
  if (filters.contract_expiring_months != null) {
    badges.push({ label: `Expiring ${filters.contract_expiring_months}mo`, variant: "outline" })
  }

  // Market value range
  if (filters.market_value_min != null || filters.market_value_max != null) {
    if (filters.market_value_min != null && filters.market_value_max != null) {
      badges.push({
        label: `€${formatMarketValue(filters.market_value_min)}-${formatMarketValue(filters.market_value_max)}`,
        variant: "secondary"
      })
    } else if (filters.market_value_min != null) {
      badges.push({ label: `€${formatMarketValue(filters.market_value_min)}+`, variant: "secondary" })
    } else if (filters.market_value_max != null) {
      badges.push({ label: `≤€${formatMarketValue(filters.market_value_max)}`, variant: "secondary" })
    }
  }

  // If no filters, show a message
  if (badges.length === 0) {
    return <span className="text-muted-foreground text-sm">No filters</span>
  }

  // In compact mode, limit total badges
  const displayBadges = compact ? badges.slice(0, 4) : badges
  const hiddenCount = compact ? badges.length - 4 : 0

  return (
    <div className="flex flex-wrap gap-1">
      {displayBadges.map((badge, index) => (
        <Badge key={index} variant={badge.variant || "default"} className="text-xs">
          {badge.label}
        </Badge>
      ))}
      {hiddenCount > 0 && (
        <Badge variant="outline" className="text-xs">
          +{hiddenCount} more
        </Badge>
      )}
    </div>
  )
}
