"use client"

import { Badge } from '@/components/ui/badge'

export type PresetName = 'balanced' | 'young_prospects' | 'safe_placements' | 'hot_form'

interface PresetConfig {
  name: PresetName
  label: string
  icon: string
  description: string
  highlight: string
}

const PRESETS: PresetConfig[] = [
  {
    name: 'balanced',
    label: 'Balanced',
    icon: '⚖️',
    description: 'Equal weight across all criteria',
    highlight: 'Default'
  },
  {
    name: 'young_prospects',
    label: 'Young Prospects',
    icon: '🌟',
    description: 'Focus 16-19 for resale value',
    highlight: '16-19 max'
  },
  {
    name: 'safe_placements',
    label: 'Safe Placements',
    icon: '🛡️',
    description: 'EU passport, 75%+ availability',
    highlight: 'Low risk'
  },
  {
    name: 'hot_form',
    label: 'Hot Form',
    icon: '🔥',
    description: 'High SofaScore, momentum players',
    highlight: 'Performance'
  }
]

interface PresetCardsProps {
  selectedPreset: PresetName
  onPresetSelect: (preset: PresetName) => void
  isRecalculating?: boolean
}

export default function PresetCards({
  selectedPreset,
  onPresetSelect,
  isRecalculating
}: PresetCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {PRESETS.map((preset) => {
        const isSelected = selectedPreset === preset.name
        return (
          <button
            key={preset.name}
            onClick={() => onPresetSelect(preset.name)}
            disabled={isRecalculating}
            className={`relative p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
              isSelected
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border hover:border-primary/40 bg-card'
            } ${isRecalculating ? 'opacity-50 cursor-wait' : ''}`}
          >
            {isSelected && (
              <div className="absolute top-2 right-2">
                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                  Active
                </Badge>
              </div>
            )}
            <div className="text-2xl mb-2">{preset.icon}</div>
            <div className="font-semibold text-sm mb-1">{preset.label}</div>
            <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {preset.description}
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {preset.highlight}
            </Badge>
          </button>
        )
      })}
    </div>
  )
}
