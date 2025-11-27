"use client"

import { useState, useEffect, useCallback } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Settings2, Info, Sparkles, Loader2, Check, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useDebouncedCallback } from 'use-debounce'

// =====================================================
// Types
// =====================================================

export interface AlgorithmWeights {
  // Contract & Timing
  sameLeague: number
  contractTimingPerfect: number
  contractTimingGood: number
  imminentFree: number

  // Squad Need
  squadTurnoverUrgency: number
  multipleOpenings: number

  // Market
  marketFitPerfect: number

  // Geography
  sameCountry: number

  // Age (Updated tiers - young players = higher bonus)
  ageVeryYoung: number    // 16-19: HIGHEST bonus
  ageYoung: number        // 20-22: Good bonus
  agePrime: number        // 23-28: Lower bonus
  ageFitsSquad: number    // Within +-3 years

  // Performance (tm_data)
  injuryReliability: number
  lowPlayingTime: number
  recentForm: number
  versatility: number
  disciplinePenalty: number

  // Performance (sf_data - SofaScore)
  sofascoreRating: number
  topPercentile: number
  goalContributions: number
  duelDominance: number
  passingQuality: number
}

export interface HardFilters {
  requireEuPassport: boolean
  minAvailabilityPct: number
  minSofascoreRating: number
}

export type PresetName = 'balanced' | 'young_prospects' | 'safe_placements' | 'hot_form' | 'custom'

// =====================================================
// Presets Configuration
// =====================================================

const PRESET_CONFIGS: Record<PresetName, { weights: AlgorithmWeights; hardFilters: HardFilters; label: string; icon: string; description: string }> = {
  balanced: {
    label: 'Balanced',
    icon: '⚖️',
    description: 'Equal weight across all criteria, good starting point',
    weights: {
      sameLeague: 30, contractTimingPerfect: 40, contractTimingGood: 25, imminentFree: 25,
      squadTurnoverUrgency: 30, multipleOpenings: 20, marketFitPerfect: 30, sameCountry: 20,
      ageVeryYoung: 30, ageYoung: 20, agePrime: 10, ageFitsSquad: 15,
      injuryReliability: 25, lowPlayingTime: 15, recentForm: 15, versatility: 20, disciplinePenalty: 20,
      sofascoreRating: 25, topPercentile: 20, goalContributions: 20, duelDominance: 15, passingQuality: 15
    },
    hardFilters: { requireEuPassport: false, minAvailabilityPct: 50, minSofascoreRating: 0 }
  },
  young_prospects: {
    label: 'Young Prospects',
    icon: '🌟',
    description: 'Focus 16-19, maximum resale value for clubs',
    weights: {
      sameLeague: 20, contractTimingPerfect: 40, contractTimingGood: 25, imminentFree: 20,
      squadTurnoverUrgency: 30, multipleOpenings: 20, marketFitPerfect: 30, sameCountry: 20,
      ageVeryYoung: 100, ageYoung: 60, agePrime: 10, ageFitsSquad: 10,
      injuryReliability: 25, lowPlayingTime: 20, recentForm: 15, versatility: 25, disciplinePenalty: 20,
      sofascoreRating: 25, topPercentile: 20, goalContributions: 20, duelDominance: 15, passingQuality: 15
    },
    hardFilters: { requireEuPassport: false, minAvailabilityPct: 50, minSofascoreRating: 0 }
  },
  safe_placements: {
    label: 'Safe Placements',
    icon: '🛡️',
    description: 'EU passport, 75%+ availability, good discipline',
    weights: {
      sameLeague: 30, contractTimingPerfect: 40, contractTimingGood: 25, imminentFree: 25,
      squadTurnoverUrgency: 30, multipleOpenings: 20, marketFitPerfect: 50, sameCountry: 20,
      ageVeryYoung: 30, ageYoung: 30, agePrime: 40, ageFitsSquad: 20,
      injuryReliability: 80, lowPlayingTime: 10, recentForm: 15, versatility: 20, disciplinePenalty: 60,
      sofascoreRating: 25, topPercentile: 20, goalContributions: 20, duelDominance: 15, passingQuality: 15
    },
    hardFilters: { requireEuPassport: true, minAvailabilityPct: 75, minSofascoreRating: 0 }
  },
  hot_form: {
    label: 'Hot Form',
    icon: '🔥',
    description: 'High SofaScore rating, momentum players',
    weights: {
      sameLeague: 30, contractTimingPerfect: 40, contractTimingGood: 25, imminentFree: 25,
      squadTurnoverUrgency: 30, multipleOpenings: 20, marketFitPerfect: 30, sameCountry: 20,
      ageVeryYoung: 30, ageYoung: 30, agePrime: 30, ageFitsSquad: 15,
      injuryReliability: 25, lowPlayingTime: 10, recentForm: 50, versatility: 20, disciplinePenalty: 20,
      sofascoreRating: 80, topPercentile: 40, goalContributions: 60, duelDominance: 30, passingQuality: 25
    },
    hardFilters: { requireEuPassport: false, minAvailabilityPct: 50, minSofascoreRating: 6.5 }
  },
  custom: {
    label: 'Custom',
    icon: '⚙️',
    description: 'Your personalized settings',
    weights: {
      sameLeague: 30, contractTimingPerfect: 40, contractTimingGood: 25, imminentFree: 25,
      squadTurnoverUrgency: 30, multipleOpenings: 20, marketFitPerfect: 30, sameCountry: 20,
      ageVeryYoung: 30, ageYoung: 20, agePrime: 10, ageFitsSquad: 15,
      injuryReliability: 25, lowPlayingTime: 15, recentForm: 15, versatility: 20, disciplinePenalty: 20,
      sofascoreRating: 25, topPercentile: 20, goalContributions: 20, duelDominance: 15, passingQuality: 15
    },
    hardFilters: { requireEuPassport: false, minAvailabilityPct: 50, minSofascoreRating: 0 }
  }
}

// =====================================================
// Default values
// =====================================================

const DEFAULT_WEIGHTS: AlgorithmWeights = PRESET_CONFIGS.balanced.weights
const DEFAULT_HARD_FILTERS: HardFilters = PRESET_CONFIGS.balanced.hardFilters

// =====================================================
// Metric Configuration
// =====================================================

interface MetricConfig {
  key: keyof AlgorithmWeights | keyof HardFilters
  label: string
  description: string
  detailedInfo: string
  type: 'slider' | 'switch' | 'rating'
  badge?: 'tm_data' | 'sf_data'
  max?: number
  step?: number
}

const METRIC_GROUPS: { title: string; priority: string; metrics: MetricConfig[] }[] = [
  {
    title: 'Hard Filters',
    priority: 'CRITICAL',
    metrics: [
      {
        key: 'contractTimingPerfect',
        label: 'Perfect Contract Timing',
        description: 'Player expires ±1 month of club opening',
        detailedInfo: 'THE KILLER FEATURE. Club has player leaving in same position at same time. Example: Your player expires June 2025, club\'s CB expires May 2025. Perfect replacement timing.',
        type: 'slider',
      },
      {
        key: 'requireEuPassport',
        label: 'Require EU Passport',
        description: 'Only show EU players',
        detailedInfo: 'Lower employment costs for clubs. Essential for Poland/Germany agents who need work permit-free players. Excludes all non-EU players completely.',
        type: 'switch',
      },
      {
        key: 'minAvailabilityPct',
        label: 'Min Availability %',
        description: 'Exclude injury-prone players',
        detailedInfo: 'Based on games played vs possible. 75%+ is reliable. Below 50% is very risky. Clubs reject injury-prone players.',
        type: 'slider',
        badge: 'tm_data',
      },
      {
        key: 'minSofascoreRating',
        label: 'Min SofaScore Rating',
        description: 'Minimum performance rating (0-10)',
        detailedInfo: 'SofaScore rating threshold. 6.5+ is decent, 7.0+ is good, 7.5+ is excellent. Set to 0 to disable.',
        type: 'rating',
        badge: 'sf_data',
        max: 10,
        step: 0.5,
      },
    ],
  },
  {
    title: 'Age Tiers (Young = Higher Value)',
    priority: 'HIGH',
    metrics: [
      {
        key: 'ageVeryYoung',
        label: 'Very Young (16-19)',
        description: 'Maximum resale potential for clubs',
        detailedInfo: 'HIGHEST bonus. Clubs love young talents for resale value. A 17-year-old can be sold for 10x in 3 years. Maximum development upside.',
        type: 'slider',
      },
      {
        key: 'ageYoung',
        label: 'Young (20-22)',
        description: 'Good development upside',
        detailedInfo: 'Still young with upside. Past youth phase but not yet proven. Good balance of potential and emerging reliability.',
        type: 'slider',
      },
      {
        key: 'agePrime',
        label: 'Prime (23-28)',
        description: 'Proven but less resale upside',
        detailedInfo: 'Peak performance years. Lower bonus because clubs know they can\'t resell for profit. But most reliable for immediate impact.',
        type: 'slider',
      },
      {
        key: 'ageFitsSquad',
        label: 'Fits Squad Age',
        description: 'Within ±3 years of position avg',
        detailedInfo: 'Club\'s CBs average 27, your player is 25 = good fit. Helps with squad chemistry.',
        type: 'slider',
      },
    ],
  },
  {
    title: 'SofaScore Performance',
    priority: 'HIGH',
    metrics: [
      {
        key: 'sofascoreRating',
        label: 'High Rating (≥7.0)',
        description: 'Standout performers',
        detailedInfo: 'Players with SofaScore rating ≥7.0 are above average. Key metric for identifying quality players.',
        type: 'slider',
        badge: 'sf_data',
      },
      {
        key: 'topPercentile',
        label: 'Top Performer (≥7.5)',
        description: 'Elite rating threshold',
        detailedInfo: 'Players with ≥7.5 rating are in the top tier. Very selective, fewer matches but higher quality.',
        type: 'slider',
        badge: 'sf_data',
      },
      {
        key: 'goalContributions',
        label: 'Goal Contributions',
        description: 'Goals + assists efficiency',
        detailedInfo: '(Goals + Assists) / 90 minutes. Shows offensive productivity. Great for forwards and attacking mids.',
        type: 'slider',
        badge: 'sf_data',
      },
      {
        key: 'duelDominance',
        label: 'Duel Dominance',
        description: '≥55% duels won',
        detailedInfo: 'Physical competitiveness. Important for defenders and midfielders. Shows player wins their battles.',
        type: 'slider',
        badge: 'sf_data',
      },
      {
        key: 'passingQuality',
        label: 'Passing Quality',
        description: '≥80% pass accuracy',
        detailedInfo: 'Technical quality indicator. Important for build-up players and playmakers.',
        type: 'slider',
        badge: 'sf_data',
      },
    ],
  },
  {
    title: 'Transfermarkt Data',
    priority: 'MEDIUM',
    metrics: [
      {
        key: 'injuryReliability',
        label: 'Injury Reliability',
        description: 'Reward 75%+ availability',
        detailedInfo: 'Players with ≥75% availability get boosted. Clubs ALWAYS ask about injury history. Low availability = deal killer.',
        type: 'slider',
        badge: 'tm_data',
      },
      {
        key: 'lowPlayingTime',
        label: 'Low Playing Time',
        description: '<30% minutes = seeking move',
        detailedInfo: 'Players sitting on bench are motivated to move. Easier to convince than regular starters.',
        type: 'slider',
        badge: 'tm_data',
      },
      {
        key: 'recentForm',
        label: 'Recent Form',
        description: 'Goals/assists recently',
        detailedInfo: 'Recent goal contributions make player easier to pitch. Good form = confidence + marketing.',
        type: 'slider',
        badge: 'tm_data',
      },
      {
        key: 'versatility',
        label: 'Versatility',
        description: 'Played 3+ positions',
        detailedInfo: 'Multi-position players have more opportunities. Tactical flexibility = more clubs interested.',
        type: 'slider',
        badge: 'tm_data',
      },
      {
        key: 'disciplinePenalty',
        label: 'Discipline Penalty',
        description: 'Penalize 2+ red cards',
        detailedInfo: 'Clubs reject discipline issues. 2+ red cards = red flag. This is a PENALTY (reduces score).',
        type: 'slider',
        badge: 'tm_data',
      },
    ],
  },
  {
    title: 'Squad & Market',
    priority: 'MEDIUM',
    metrics: [
      {
        key: 'squadTurnoverUrgency',
        label: 'Squad Turnover Urgency',
        description: 'High % of position leaving',
        detailedInfo: 'When 50%+ of players in a position are leaving, club is desperate. Easier to sell your player.',
        type: 'slider',
      },
      {
        key: 'multipleOpenings',
        label: 'Multiple Openings',
        description: 'Absolute # of players leaving',
        detailedInfo: '5+ players leaving position = massive opportunity. Complements turnover % metric.',
        type: 'slider',
      },
      {
        key: 'marketFitPerfect',
        label: 'Market Value Fit',
        description: 'Player value 0.5x-1.5x club avg',
        detailedInfo: 'Your €100k player fits clubs with €67k-€200k average. Outside this range = unrealistic.',
        type: 'slider',
      },
      {
        key: 'contractTimingGood',
        label: 'Good Contract Timing',
        description: 'Player expires ±2 months',
        detailedInfo: 'Not perfect but still aligned. Your player June 2025, club\'s opening April 2025.',
        type: 'slider',
      },
      {
        key: 'imminentFree',
        label: 'Imminent Free Agent',
        description: 'Contract expires ≤3 months',
        detailedInfo: 'Player available immediately. Zero transfer fee. Quick win for clubs on tight budgets.',
        type: 'slider',
      },
    ],
  },
  {
    title: 'Geography',
    priority: 'LOWER',
    metrics: [
      {
        key: 'sameLeague',
        label: 'Same League',
        description: 'Same league transfers',
        detailedInfo: 'Players moving within same league adapt faster. Clubs trust known quantity.',
        type: 'slider',
      },
      {
        key: 'sameCountry',
        label: 'Same Country',
        description: 'Nationality matches club',
        detailedInfo: 'Finnish player → Finnish club = easier cultural fit, no language barrier.',
        type: 'slider',
      },
    ],
  },
]

// =====================================================
// Main Component
// =====================================================

interface AlgorithmSettingsModalProps {
  agentId?: string
  onWeightsChange?: (weights: AlgorithmWeights) => void
  onApplySuccess?: () => void
}

export default function AlgorithmSettingsModal({
  agentId: propAgentId,
  onWeightsChange,
  onApplySuccess
}: AlgorithmSettingsModalProps) {
  const [open, setOpen] = useState(false)
  const [weights, setWeights] = useState<AlgorithmWeights>(DEFAULT_WEIGHTS)
  const [hardFilters, setHardFilters] = useState<HardFilters>(DEFAULT_HARD_FILTERS)
  const [selectedPreset, setSelectedPreset] = useState<PresetName>('balanced')
  const [hasChanges, setHasChanges] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [agentId, setAgentId] = useState<string | null>(propAgentId || null)

  const supabase = createClient()

  // Fetch agent ID if not provided
  useEffect(() => {
    if (propAgentId) {
      setAgentId(propAgentId)
      return
    }

    const getAgentId = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setAgentId(user.id)
      }
    }
    getAgentId()
  }, [propAgentId, supabase])

  // Load saved preferences when modal opens
  useEffect(() => {
    if (!open || !agentId) return

    const loadPreferences = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('agent_algorithm_weights')
          .select('*')
          .eq('agent_id', agentId)
          .single()

        if (data && !error) {
          console.log('[Algorithm] Loaded saved preferences:', data.preset_name)
          setWeights(data.weights as AlgorithmWeights)
          setHardFilters(data.hard_filters as HardFilters)
          setSelectedPreset(data.preset_name as PresetName)
        } else {
          console.log('[Algorithm] No saved preferences, using defaults')
        }
      } catch (err) {
        console.error('[Algorithm] Error loading preferences:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadPreferences()
  }, [open, agentId, supabase])

  // Debounced live preview callback
  const debouncedWeightsChange = useDebouncedCallback(
    (newWeights: AlgorithmWeights) => {
      onWeightsChange?.(newWeights)
    },
    300
  )

  const handleWeightChange = useCallback((key: keyof AlgorithmWeights, value: number) => {
    setWeights(prev => {
      const newWeights = { ...prev, [key]: value }
      setSelectedPreset('custom')
      setHasChanges(true)
      debouncedWeightsChange(newWeights)
      return newWeights
    })
  }, [debouncedWeightsChange])

  const handleHardFilterChange = useCallback((key: keyof HardFilters, value: boolean | number) => {
    setHardFilters(prev => {
      const newFilters = { ...prev, [key]: value }
      setSelectedPreset('custom')
      setHasChanges(true)
      return newFilters
    })
  }, [])

  const handlePresetSelect = useCallback((preset: PresetName) => {
    const config = PRESET_CONFIGS[preset]
    setWeights(config.weights)
    setHardFilters(config.hardFilters)
    setSelectedPreset(preset)
    setHasChanges(true)
    debouncedWeightsChange(config.weights)
  }, [debouncedWeightsChange])

  const handleApply = async () => {
    if (!agentId) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('agent_algorithm_weights')
        .upsert({
          agent_id: agentId,
          preset_name: selectedPreset,
          weights: weights,
          hard_filters: hardFilters,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      console.log('[Algorithm] Saved preferences successfully')
      setHasChanges(false)
      onApplySuccess?.()
      setOpen(false)
    } catch (err) {
      console.error('[Algorithm] Error saving preferences:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    handlePresetSelect('balanced')
  }

  const totalScore = Object.values(weights).reduce((sum, value) => sum + value, 0)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Algorithm Settings
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[500px] sm:w-[600px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl">Customize Match Algorithm</SheetTitle>
              <SheetDescription className="mt-1">
                Fine-tune how we rank player-club matches
              </SheetDescription>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge variant="outline" className="text-xs">
                Total: {totalScore} pts
              </Badge>
              {hasChanges && (
                <Badge variant="secondary" className="text-xs animate-pulse">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Unsaved
                </Badge>
              )}
            </div>
          </div>

          {/* Preset Cards */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {(['balanced', 'young_prospects', 'safe_placements', 'hot_form'] as PresetName[]).map((preset) => {
              const config = PRESET_CONFIGS[preset]
              const isSelected = selectedPreset === preset
              return (
                <button
                  key={preset}
                  onClick={() => handlePresetSelect(preset)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="text-lg mb-1">{config.icon}</div>
                  <div className="text-xs font-medium truncate">{config.label}</div>
                </button>
              )
            })}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <TooltipProvider>
              <div className="space-y-8">
                {METRIC_GROUPS.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-sm font-semibold">{group.title}</h3>
                      <Badge
                        variant={
                          group.priority === 'CRITICAL'
                            ? 'destructive'
                            : group.priority === 'HIGH'
                            ? 'default'
                            : group.priority === 'MEDIUM'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-[10px]"
                      >
                        {group.priority}
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      {group.metrics.map((metric) => {
                        const isHardFilter = ['requireEuPassport', 'minAvailabilityPct', 'minSofascoreRating'].includes(metric.key)

                        if (metric.type === 'switch') {
                          return (
                            <SwitchControl
                              key={metric.key}
                              label={metric.label}
                              checked={hardFilters[metric.key as keyof HardFilters] as boolean}
                              onChange={(v) => handleHardFilterChange(metric.key as keyof HardFilters, v)}
                              description={metric.description}
                              detailedInfo={metric.detailedInfo}
                            />
                          )
                        }

                        if (metric.type === 'rating') {
                          return (
                            <SliderControl
                              key={metric.key}
                              label={metric.label}
                              value={hardFilters[metric.key as keyof HardFilters] as number}
                              onChange={(v) => handleHardFilterChange(metric.key as keyof HardFilters, v)}
                              description={metric.description}
                              detailedInfo={metric.detailedInfo}
                              badge={metric.badge}
                              max={metric.max || 10}
                              step={metric.step || 0.5}
                              formatValue={(v) => v.toFixed(1)}
                            />
                          )
                        }

                        return (
                          <SliderControl
                            key={metric.key}
                            label={metric.label}
                            value={isHardFilter
                              ? (hardFilters[metric.key as keyof HardFilters] as number)
                              : (weights[metric.key as keyof AlgorithmWeights] as number)
                            }
                            onChange={(v) => isHardFilter
                              ? handleHardFilterChange(metric.key as keyof HardFilters, v)
                              : handleWeightChange(metric.key as keyof AlgorithmWeights, v)
                            }
                            description={metric.description}
                            detailedInfo={metric.detailedInfo}
                            badge={metric.badge}
                            max={metric.max || 100}
                            step={metric.step || 5}
                          />
                        )
                      })}
                    </div>

                    {groupIndex < METRIC_GROUPS.length - 1 && <Separator className="my-6" />}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          )}
        </div>

        <div className="px-6 py-4 border-t space-y-2 shrink-0">
          <div className="flex gap-2">
            <Button
              onClick={handleApply}
              disabled={!hasChanges || isSaving}
              className="flex-1"
              size="sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : hasChanges ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Apply & Save
                </>
              ) : (
                'Up to Date'
              )}
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-center text-muted-foreground">
            Preset: <strong>{PRESET_CONFIGS[selectedPreset].label}</strong> — {PRESET_CONFIGS[selectedPreset].description}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// =====================================================
// Helper Components
// =====================================================

function SliderControl({
  label,
  value,
  onChange,
  description,
  detailedInfo,
  badge,
  max = 100,
  step = 5,
  formatValue,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  description: string
  detailedInfo: string
  badge?: 'tm_data' | 'sf_data'
  max?: number
  step?: number
  formatValue?: (v: number) => string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">{label}</label>
          {badge && (
            <Badge
              variant="secondary"
              className={`text-[9px] px-1 py-0 ${badge === 'sf_data' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}
            >
              {badge === 'sf_data' ? 'SofaScore' : 'TM'}
            </Badge>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs" side="left">
              <p className="text-xs leading-relaxed">{detailedInfo}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <span className="text-sm text-muted-foreground font-mono tabular-nums">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        max={max}
        step={step}
        className="w-full"
      />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function SwitchControl({
  label,
  checked,
  onChange,
  description,
  detailedInfo,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  description: string
  detailedInfo: string
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">{label}</label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs" side="left">
              <p className="text-xs leading-relaxed">{detailedInfo}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
