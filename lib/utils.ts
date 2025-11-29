import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the best available player image URL with fallback logic:
 * 1. If agent has custom override picture, use it (highest priority)
 * 2. If Transfermarkt has a real photo (not default), use it
 * 3. If Transfermarkt has default placeholder and player has sofascore_id, use SofaScore
 * 4. Otherwise return null (show User icon instead of ugly TM placeholder)
 */
export function getPlayerImageUrl(
  pictureUrl: string | null | undefined,
  sofascoreId: number | null | undefined,
  pictureUrlOverride?: string | null
): string | null {
  // Agent custom picture has highest priority
  if (pictureUrlOverride) {
    return pictureUrlOverride
  }

  if (!pictureUrl) return null

  // Check if Transfermarkt URL is a default placeholder
  const isDefaultPlaceholder = pictureUrl.includes('/default.jpg')

  // If it's a real photo, use it
  if (!isDefaultPlaceholder) {
    return pictureUrl
  }

  // If placeholder and we have sofascore_id, try SofaScore image
  if (sofascoreId) {
    return `https://img.sofascore.com/api/v1/player/${sofascoreId}/image`
  }

  // Return null to show User icon instead of TM placeholder
  return null
}

/**
 * Check if a Transfermarkt picture URL is a default placeholder
 */
export function isDefaultPlayerImage(pictureUrl: string | null | undefined): boolean {
  if (!pictureUrl) return true
  return pictureUrl.includes('/default.jpg')
}
