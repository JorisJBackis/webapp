"use client"

import { useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Settings2, Info, Sparkles } from 'lucide-react'

interface AlgorithmWeights {
  // CRITICAL - Hard Filters (Most Important)
  requireEuPassport: boolean
  minAvailabilityPct: number
  minMinutesPer90: number

  // HIGH PRIORITY
  contractTimingPerfect: number
  injuryReliability: number
  squadTurnoverUrgency: number
  marketFitPerfect: number

  // MEDIUM PRIORITY
  sameLeague: number
  contractTimingGood: number
  lowPlayingTime: number
  agePrime: number
  ageProspect: number

  // LOWER PRIORITY
  multipleOpenings: number
  sameCountry: number
  nordicNeighbor: number
  ageFitsSquad: number
  recentForm: number
  versatility: number
  disciplinePenalty: number
  imminentFree: number
}

const DEFAULT_WEIGHTS: AlgorithmWeights = {
  // Hard Filters
  requireEuPassport: false,
  minAvailabilityPct: 50,
  minMinutesPer90: 0,

  // High Priority
  contractTimingPerfect: 40,
  injuryReliability: 25,
  squadTurnoverUrgency: 30,
  marketFitPerfect: 30,

  // Medium Priority
  sameLeague: 30,
  contractTimingGood: 25,
  lowPlayingTime: 15,
  agePrime: 15,
  ageProspect: 10,

  // Lower Priority
  multipleOpenings: 20,
  sameCountry: 20,
  nordicNeighbor: 10,
  ageFitsSquad: 15,
  recentForm: 15,
  versatility: 20,
  disciplinePenalty: 20,
  imminentFree: 25,
}

interface MetricConfig {
  key: keyof AlgorithmWeights
  label: string
  description: string
  detailedInfo: string
  type: 'slider' | 'switch'
  badge?: string
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
        detailedInfo: 'THE KILLER FEATURE. Club has player leaving in same position at same time. Example: Your player expires June 2025, club\'s CB expires May 2025. Perfect replacement timing. Gets +40 points.',
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
        detailedInfo: 'Based on last 2 seasons: (games available - times injured) / total games. Karol requires 75%+. Below 50% is very risky. Clubs reject injury-prone players.',
        type: 'slider',
        badge: 'tm_data',
      },
      {
        key: 'minMinutesPer90',
        label: 'Min Minutes Per Match',
        description: 'Average minutes played per match',
        detailedInfo: 'Filter out players who barely play. 0 = no filter. 45 = must average at least half a match. 70 = mostly starters. 80+ = almost always full 90 minutes. Based on actual minutes played per appearance in last 2 seasons.',
        type: 'slider',
        badge: 'tm_data',
      },
    ],
  },
  {
    title: 'High Priority Factors',
    priority: 'HIGH',
    metrics: [
      {
        key: 'injuryReliability',
        label: 'Injury Reliability',
        description: 'Reward 75%+ availability',
        detailedInfo: 'Players with ≥75% availability over last 2 seasons get boosted. Karol\'s #1 priority. Clubs ALWAYS ask about injury history. Low availability = deal killer.',
        type: 'slider',
        badge: 'tm_data',
      },
      {
        key: 'squadTurnoverUrgency',
        label: 'Squad Turnover Urgency',
        description: 'High % of position leaving',
        detailedInfo: 'When 50%+ of players in a position are leaving, club is desperate. Example: 3 out of 4 CBs leaving = 75% turnover = high urgency. Easier to sell your player.',
        type: 'slider',
      },
      {
        key: 'marketFitPerfect',
        label: 'Market Value Fit',
        description: 'Player value 0.5x-1.5x club average',
        detailedInfo: 'Your €100k player fits clubs with €67k-€200k average squad value. Outside this range = unrealistic. Clubs won\'t pay 3x their average, won\'t trust players 5x cheaper.',
        type: 'slider',
      },
    ],
  },
  {
    title: 'Medium Priority Factors',
    priority: 'MEDIUM',
    metrics: [
      {
        key: 'sameLeague',
        label: 'Same League',
        description: 'Same league transfers',
        detailedInfo: 'Players moving within same league adapt faster. Clubs trust known quantity. Cross-league moves are riskier. Oliver emphasizes league quality comparison accuracy.',
        type: 'slider',
      },
      {
        key: 'contractTimingGood',
        label: 'Good Contract Timing',
        description: 'Player expires ±2 months',
        detailedInfo: 'Not perfect but still aligned. Your player June 2025, club\'s opening April 2025. Close enough for planning. Gets +25 points (less than perfect +40).',
        type: 'slider',
      },
      {
        key: 'lowPlayingTime',
        label: 'Low Playing Time',
        description: '<30% minutes = seeking opportunities',
        detailedInfo: 'Player sitting on bench at current club (<30% playing time) is motivated to move. Karol targets these. Easier to convince than regular starters.',
        type: 'slider',
        badge: 'tm_data',
      },
      {
        key: 'agePrime',
        label: 'Prime Age (23-28)',
        description: 'Peak performance years',
        detailedInfo: 'Most reliable age bracket. Past development phase, not yet declining. Clubs pay premium for prime-age players with proven track record.',
        type: 'slider',
      },
      {
        key: 'ageProspect',
        label: 'Young Prospect (19-22)',
        description: 'Development potential',
        detailedInfo: 'Aleksi/Jerome focus. High upside, lower salary demands. Clubs invest for future. Less proven, more risky, but potential for huge value growth.',
        type: 'slider',
      },
    ],
  },
  {
    title: 'Fine-Tuning Factors',
    priority: 'LOWER',
    metrics: [
      {
        key: 'multipleOpenings',
        label: 'Multiple Openings',
        description: 'Absolute # of players leaving',
        detailedInfo: '5+ players leaving position = massive opportunity (25 pts). 3-4 leaving = good opportunity. Complements turnover % metric.',
        type: 'slider',
      },
      {
        key: 'sameCountry',
        label: 'Same Country',
        description: 'Nationality matches club',
        detailedInfo: 'Finnish player → Finnish club = easier cultural fit, no language barrier. Helpful but not critical (Nordic agents work cross-border).',
        type: 'slider',
      },
      {
        key: 'ageFitsSquad',
        label: 'Fits Squad Age Profile',
        description: 'Within ±4 years of position avg',
        detailedInfo: 'Club\'s CBs average 27 years old, your player is 25 = good fit. Helps with squad chemistry and dressing room dynamics.',
        type: 'slider',
      },
      {
        key: 'recentForm',
        label: 'Recent Form',
        description: 'Goals/assists in last 10 games',
        detailedInfo: 'Recent goal contributions make player easier to pitch. Jerome emphasizes this for highlight videos. Good form = confidence + marketing.',
        type: 'slider',
        badge: 'tm_data',
      },
      {
        key: 'versatility',
        label: 'Versatility',
        description: 'Played 3+ positions',
        detailedInfo: 'Aleksi values multi-position players. More opportunities, tactical flexibility. Can fill multiple roles = more clubs interested.',
        type: 'slider',
        badge: 'tm_data',
      },
      {
        key: 'disciplinePenalty',
        label: 'Discipline Penalty',
        description: 'Penalize 2+ red cards',
        detailedInfo: 'Oliver: clubs reject discipline issues. 2+ red cards in 2 seasons = red flag. Reduces match score significantly. Character concerns.',
        type: 'slider',
        badge: 'tm_data',
      },
      {
        key: 'imminentFree',
        label: 'Imminent Free Agent',
        description: 'Contract expires ≤3 months',
        detailedInfo: 'Player available immediately or very soon. Zero transfer fee. Quick win for clubs on tight budgets. Urgency drives faster deals.',
        type: 'slider',
      },
    ],
  },
]

export default function AlgorithmSettingsModal() {
  const [open, setOpen] = useState(false)
  const [weights, setWeights] = useState<AlgorithmWeights>(DEFAULT_WEIGHTS)
  const [hasChanges, setHasChanges] = useState(false)

  const handleWeightChange = (key: keyof AlgorithmWeights, value: number | boolean) => {
    setWeights(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleApply = () => {
    console.log('[Algorithm Settings] Applying custom weights:', weights)
    // TODO: Call Supabase RPC with custom weights
    setHasChanges(false)
    setOpen(false)

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
    .filter(([key]) => !['requireEuPassport', 'minAvailabilityPct', 'minMinutesPer90'].includes(key))
    .reduce((sum, [_, value]) => sum + (typeof value === 'number' ? value : 0), 0)

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
                Fine-tune how we rank player-club matches. Ordered by importance.
              </SheetDescription>
            </div>
            <div className="flex flex-col gap-2">
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
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
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
                    {group.metrics.map((metric) => (
                      <div key={metric.key}>
                        {metric.type === 'slider' ? (
                          <SliderControl
                            label={metric.label}
                            value={weights[metric.key] as number}
                            onChange={(v) => handleWeightChange(metric.key, v)}
                            description={metric.description}
                            detailedInfo={metric.detailedInfo}
                            badge={metric.badge}
                          />
                        ) : (
                          <SwitchControl
                            label={metric.label}
                            checked={weights[metric.key] as boolean}
                            onChange={(v) => handleWeightChange(metric.key, v)}
                            description={metric.description}
                            detailedInfo={metric.detailedInfo}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {groupIndex < METRIC_GROUPS.length - 1 && <Separator className="my-6" />}
                </div>
              ))}
            </div>
          </TooltipProvider>
        </div>

        <div className="px-6 py-4 border-t space-y-2 shrink-0">
          <div className="flex gap-2">
            <Button onClick={handleApply} disabled={!hasChanges} className="flex-1" size="sm">
              {hasChanges ? 'Apply Changes' : 'Up to Date'}
            </Button>
            <Button onClick={handleReset} variant="outline" disabled={!hasChanges} size="sm">
              Reset
            </Button>
          </div>
          <p className="text-[10px] text-center text-muted-foreground">
            <strong>Demo:</strong> UI functional, backend integration coming soon
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Helper Components
function SliderControl({
  label,
  value,
  onChange,
  description,
  detailedInfo,
  badge,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  description: string
  detailedInfo: string
  badge?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">{label}</label>
          {badge && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0">
              {badge}
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
        <span className="text-sm text-muted-foreground font-mono tabular-nums">{value}</span>
      </div>
      <Slider value={[value]} onValueChange={(v) => onChange(v[0])} max={100} step={5} className="w-full" />
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
