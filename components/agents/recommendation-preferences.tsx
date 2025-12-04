"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Settings2, Sparkles } from 'lucide-react'

interface AlgorithmWeights {
  // Contract & Timing
  sameLeague: number
  contractTimingPerfect: number
  contractTimingGood: number
  imminentFree: number

  // Squad Urgency
  squadTurnoverUrgency: number
  multipleOpenings: number

  // Market Fit
  marketFitPerfect: number

  // Geography
  sameCountry: number
  nordicNeighbor: number

  // Age
  agePrime: number
  ageProspect: number
  ageFitsSquad: number

  // Injury & Reliability (from tm_data)
  injuryReliability: number

  // Playing Time (from tm_data)
  lowPlayingTime: number // Seeking opportunities

  // Form & Performance (from tm_data)
  recentForm: number

  // Versatility (from tm_data)
  versatility: number

  // Discipline (from tm_data)
  disciplinePenalty: number

  // Hard Filters
  requireEuPassport: boolean
  minAvailabilityPct: number
}

const DEFAULT_WEIGHTS: AlgorithmWeights = {
  // Contract & Timing
  sameLeague: 30,
  contractTimingPerfect: 40,
  contractTimingGood: 25,
  imminentFree: 25,

  // Squad Urgency
  squadTurnoverUrgency: 30,
  multipleOpenings: 20,

  // Market Fit
  marketFitPerfect: 30,

  // Geography
  sameCountry: 20,
  nordicNeighbor: 10,

  // Age
  agePrime: 15,
  ageProspect: 10,
  ageFitsSquad: 15,

  // Injury & Reliability
  injuryReliability: 25,

  // Playing Time
  lowPlayingTime: 15,

  // Form & Performance
  recentForm: 15,

  // Versatility
  versatility: 20,

  // Discipline
  disciplinePenalty: 20,

  // Hard Filters
  requireEuPassport: false,
  minAvailabilityPct: 50,
}

export default function RecommendationPreferences() {
  const [weights, setWeights] = useState<AlgorithmWeights>(DEFAULT_WEIGHTS)
  const [hasChanges, setHasChanges] = useState(false)

  const handleWeightChange = (key: keyof AlgorithmWeights, value: number | boolean) => {
    setWeights(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleApply = () => {
    console.log('[Algorithm Weights] Applying custom weights:', weights)
    // TODO: Call Supabase RPC with custom weights
    setHasChanges(false)

    // Animate recommendation cards
    const cards = document.querySelectorAll('[data-recommendation-card]')
    cards.forEach(card => {
      card.classList.add('animate-pulse')
      setTimeout(() => card.classList.remove('animate-pulse'), 600)
    })
  }

  const handleReset = () => {
    setWeights(DEFAULT_WEIGHTS)
    setHasChanges(false)
  }

  const totalScore = Object.entries(weights)
    .filter(([key]) => !['requireEuPassport', 'minAvailabilityPct'].includes(key))
    .reduce((sum, [_, value]) => sum + (typeof value === 'number' ? value : 0), 0)

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Algorithm Builder</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Customize each factor's weight to build your killer algorithm
        </CardDescription>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Total Score: {totalScore} points
          </Badge>
          {hasChanges && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              <Sparkles className="h-3 w-3 mr-1" />
              Unsaved
            </Badge>
          )}
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 px-6">
        <div className="space-y-6 pb-6">
          {/* CONTRACT & TIMING */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1">
              ⏰ Contract & Timing
            </h3>

            <SliderControl
              label="Same League"
              value={weights.sameLeague}
              onChange={(v) => handleWeightChange('sameLeague', v)}
              description="60% of transfers are within same league"
            />

            <SliderControl
              label="Perfect Contract Timing"
              value={weights.contractTimingPerfect}
              onChange={(v) => handleWeightChange('contractTimingPerfect', v)}
              description="Player expires within ±1 month of club's opening"
            />

            <SliderControl
              label="Good Contract Timing"
              value={weights.contractTimingGood}
              onChange={(v) => handleWeightChange('contractTimingGood', v)}
              description="Player expires within ±2 months of club's opening"
            />

            <SliderControl
              label="Imminent Free Agent"
              value={weights.imminentFree}
              onChange={(v) => handleWeightChange('imminentFree', v)}
              description="Contract expires ≤3 months"
            />
          </div>

          <Separator />

          {/* SQUAD URGENCY */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1">
              🔥 Squad Urgency
            </h3>

            <SliderControl
              label="Squad Turnover %"
              value={weights.squadTurnoverUrgency}
              onChange={(v) => handleWeightChange('squadTurnoverUrgency', v)}
              description="More players leaving = higher urgency"
            />

            <SliderControl
              label="Multiple Openings"
              value={weights.multipleOpenings}
              onChange={(v) => handleWeightChange('multipleOpenings', v)}
              description="Absolute number of players leaving position"
            />
          </div>

          <Separator />

          {/* MARKET FIT */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1">
              💰 Market Value
            </h3>

            <SliderControl
              label="Perfect Market Fit"
              value={weights.marketFitPerfect}
              onChange={(v) => handleWeightChange('marketFitPerfect', v)}
              description="Player value 0.5x-1.5x club average"
            />
          </div>

          <Separator />

          {/* GEOGRAPHY */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1">
              🌍 Geography
            </h3>

            <SliderControl
              label="Same Country"
              value={weights.sameCountry}
              onChange={(v) => handleWeightChange('sameCountry', v)}
              description="Player nationality matches club country"
            />

            <SliderControl
              label="Nordic Neighbor"
              value={weights.nordicNeighbor}
              onChange={(v) => handleWeightChange('nordicNeighbor', v)}
              description="Neighboring Nordic country (FIN/SWE/NOR/DEN)"
            />
          </div>

          <Separator />

          {/* AGE */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1">
              👤 Age Profile
            </h3>

            <SliderControl
              label="Prime Age (23-28)"
              value={weights.agePrime}
              onChange={(v) => handleWeightChange('agePrime', v)}
              description="Peak performance years"
            />

            <SliderControl
              label="Young Prospect (19-22)"
              value={weights.ageProspect}
              onChange={(v) => handleWeightChange('ageProspect', v)}
              description="Development potential"
            />

            <SliderControl
              label="Fits Squad Age Profile"
              value={weights.ageFitsSquad}
              onChange={(v) => handleWeightChange('ageFitsSquad', v)}
              description="Within ±4 years of position average"
            />
          </div>

          <Separator />

          {/* INJURY & RELIABILITY (from tm_data) */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1">
              🏥 Injury & Reliability
              <Badge variant="secondary" className="text-[10px] ml-1">tm_data</Badge>
            </h3>

            <SliderControl
              label="Availability %"
              value={weights.injuryReliability}
              onChange={(v) => handleWeightChange('injuryReliability', v)}
              description="≥75% availability over last 2 seasons"
            />
          </div>

          <Separator />

          {/* PLAYING TIME (from tm_data) */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1">
              ⏱️ Playing Time
              <Badge variant="secondary" className="text-[10px] ml-1">tm_data</Badge>
            </h3>

            <SliderControl
              label="Low Playing Time"
              value={weights.lowPlayingTime}
              onChange={(v) => handleWeightChange('lowPlayingTime', v)}
              description="<30% playing time = seeking opportunities"
            />
          </div>

          <Separator />

          {/* FORM & PERFORMANCE (from tm_data) */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1">
              🎯 Form & Performance
              <Badge variant="secondary" className="text-[10px] ml-1">tm_data</Badge>
            </h3>

            <SliderControl
              label="Recent Form"
              value={weights.recentForm}
              onChange={(v) => handleWeightChange('recentForm', v)}
              description="Recent goal contributions (last 10 matches)"
            />
          </div>

          <Separator />

          {/* VERSATILITY (from tm_data) */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1">
              🔄 Versatility
              <Badge variant="secondary" className="text-[10px] ml-1">tm_data</Badge>
            </h3>

            <SliderControl
              label="Multi-Position Ability"
              value={weights.versatility}
              onChange={(v) => handleWeightChange('versatility', v)}
              description="Played 3+ positions in last 2 seasons"
            />
          </div>

          <Separator />

          {/* DISCIPLINE (from tm_data) */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1">
              ⚠️ Discipline
              <Badge variant="secondary" className="text-[10px] ml-1">tm_data</Badge>
            </h3>

            <SliderControl
              label="Discipline Penalty"
              value={weights.disciplinePenalty}
              onChange={(v) => handleWeightChange('disciplinePenalty', v)}
              description="Penalize players with 2+ red cards"
            />
          </div>

          <Separator />

          {/* HARD FILTERS */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1">
              🚫 Hard Filters
            </h3>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="space-y-0.5">
                <label className="text-xs font-medium">🇪🇺 Require EU Passport</label>
                <p className="text-[10px] text-muted-foreground">
                  Lower employment costs for clubs
                </p>
              </div>
              <Switch
                checked={weights.requireEuPassport}
                onCheckedChange={(v) => handleWeightChange('requireEuPassport', v)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Min Availability %</label>
                <span className="text-xs text-muted-foreground font-mono">
                  {weights.minAvailabilityPct}%
                </span>
              </div>
              <Slider
                value={[weights.minAvailabilityPct]}
                onValueChange={(v) => handleWeightChange('minAvailabilityPct', v[0])}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-[10px] text-muted-foreground">
                Exclude injury-prone players below this threshold
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>

      <CardContent className="pt-4 pb-6 space-y-2 border-t">
        <Button
          onClick={handleApply}
          disabled={!hasChanges}
          className="w-full"
          size="sm"
        >
          {hasChanges ? '💾 Apply Custom Algorithm' : '✓ Algorithm Active'}
        </Button>
        <Button
          onClick={handleReset}
          variant="outline"
          disabled={!hasChanges}
          className="w-full"
          size="sm"
        >
          🔄 Reset to Defaults
        </Button>
        <p className="text-[10px] text-center text-muted-foreground pt-2">
          <strong>Demo:</strong> UI only, backend integration coming soon
        </p>
      </CardContent>
    </Card>
  )
}

// Helper Component
function SliderControl({
  label,
  value,
  onChange,
  description,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  description: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium">{label}</label>
        <span className="text-xs text-muted-foreground font-mono">{value}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        max={100}
        step={5}
        className="w-full"
      />
      <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
    </div>
  )
}
