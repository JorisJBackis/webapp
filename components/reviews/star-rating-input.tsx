"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingInputProps {
  value: number
  onChange: (value: number) => void
  size?: "sm" | "md" | "lg"
  disabled?: boolean
}

export function StarRatingInput({
  value,
  onChange,
  size = "md",
  disabled = false
}: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null)

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  }

  const displayValue = hoverValue !== null ? hoverValue : value

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => !disabled && setHoverValue(star)}
          onMouseLeave={() => setHoverValue(null)}
          className={cn(
            "transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-footylabs-blue rounded",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              "transition-colors",
              star <= displayValue
                ? "fill-yellow-400 text-yellow-400"
                : "fill-transparent text-gray-300 dark:text-gray-600"
            )}
          />
        </button>
      ))}
      <span className="ml-2 text-sm font-medium text-muted-foreground">
        {value > 0 ? `${value}/5` : "Select rating"}
      </span>
    </div>
  )
}
