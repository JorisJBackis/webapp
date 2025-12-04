"use client"

import { useState } from 'react'
import { User } from 'lucide-react'
import { getPlayerImageUrl } from '@/lib/utils'

interface PlayerImageProps {
  pictureUrl: string | null | undefined
  sofascoreId: number | null | undefined
  alt: string
  className?: string
  fallbackClassName?: string
  iconClassName?: string
}

/**
 * Player image component with smart fallback:
 * 1. Tries Transfermarkt real photo
 * 2. Falls back to SofaScore if TM has placeholder
 * 3. Shows User icon if image fails to load (403, etc.)
 */
export default function PlayerImage({
  pictureUrl,
  sofascoreId,
  alt,
  className = "w-20 h-20 rounded-lg object-cover border-2 border-background shadow-md",
  fallbackClassName = "w-20 h-20 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md",
  iconClassName = "h-10 w-10 text-muted-foreground"
}: PlayerImageProps) {
  const [hasError, setHasError] = useState(false)

  const imageUrl = getPlayerImageUrl(pictureUrl, sofascoreId)

  // If no URL or image failed to load, show placeholder
  if (!imageUrl || hasError) {
    return (
      <div className={fallbackClassName}>
        <User className={iconClassName} />
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  )
}
