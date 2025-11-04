"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  User,
  ExternalLink,
  Euro,
  Calendar,
  Ruler,
  AlertCircle
} from 'lucide-react'
import { getCountryFlag, isEUCountry } from '@/lib/utils/country-flags'

export interface PlayerCardData {
  player_id?: number
  player_name: string
  player_transfermarkt_url?: string | null
  picture_url?: string | null
  position?: string | null
  age?: number | null
  nationality?: string | null
  club_name?: string | null
  club_logo_url?: string | null
  club_transfermarkt_url?: string | null
  club_avg_market_value?: number | null
  league_name?: string | null
  league_tier?: number | null
  league_country?: string | null
  league_transfermarkt_url?: string | null
  height?: number | null
  foot?: string | null
  market_value?: number | null
  contract_expires?: string | null
  is_eu_passport?: boolean | null
}

interface PlayerComparisonCardProps {
  player: PlayerCardData
  variant?: 'expiring' | 'your-player'
  contractInfo?: string
}

export default function PlayerComparisonCard({ player, variant = 'your-player', contractInfo }: PlayerComparisonCardProps) {
  const formatMarketValue = (value: number | null) => {
    if (!value) return 'N/A'
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`
    return `€${value}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatFoot = (foot: string | null) => {
    if (!foot) return 'N/A'
    const footLower = foot.toLowerCase()
    if (footLower === 'right') return 'Right Foot'
    if (footLower === 'left') return 'Left Foot'
    if (footLower === 'both') return 'Both Feet'
    return foot.charAt(0).toUpperCase() + foot.slice(1) + ' Foot'
  }

  const isContractExpiringSoon = (contractExpires: string | null): boolean => {
    if (!contractExpires) return false
    const expiryDate = new Date(contractExpires)
    const sixMonthsFromNow = new Date()
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
    return expiryDate <= sixMonthsFromNow && expiryDate >= new Date()
  }

  const isExpiring = variant === 'expiring'
  const borderClass = isExpiring ? 'border-red-200 dark:border-red-800' : 'border-green-200 dark:border-green-800'
  const gradientClass = isExpiring
    ? 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10'
    : 'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10'
  const badgeClass = isExpiring ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
  const badgeText = isExpiring ? 'EXPIRING PLAYER' : 'YOUR PLAYER'

  return (
    <Card className={`overflow-hidden ${borderClass} h-full flex flex-col`}>
      <CardContent className="p-0 flex flex-col flex-1">
        {/* Header with player photo */}
        <div className={`relative ${gradientClass} p-4 border-b ${isExpiring ? 'border-red-200 dark:border-red-800' : 'border-green-200 dark:border-green-800'}`}>
          <div className="flex items-center justify-between mb-3">
            <Badge className={badgeClass}>
              {badgeText}
            </Badge>
            {contractInfo && (
              <span className={`text-xs font-medium ${isExpiring ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {contractInfo}
              </span>
            )}
          </div>

          <div className="flex items-start gap-3">
            {/* Player Photo - Clickable */}
            <div className="flex-shrink-0">
              {player.player_transfermarkt_url ? (
                <a
                  href={player.player_transfermarkt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:opacity-80 transition-opacity"
                >
                  {player.picture_url ? (
                    <img
                      src={player.picture_url}
                      alt={player.player_name}
                      className="w-20 h-20 rounded-lg object-cover border-2 border-background shadow-md cursor-pointer"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md cursor-pointer">
                      <User className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                </a>
              ) : (
                <>
                  {player.picture_url ? (
                    <img
                      src={player.picture_url}
                      alt={player.player_name}
                      className="w-20 h-20 rounded-lg object-cover border-2 border-background shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-md">
                      <User className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Player Info */}
            <div className="flex-1 min-w-0">
              {/* Player Name - Clickable */}
              {player.player_transfermarkt_url ? (
                <a
                  href={player.player_transfermarkt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  <h3 className="font-bold text-base mb-2 truncate">{player.player_name}</h3>
                </a>
              ) : (
                <h3 className="font-bold text-base mb-2 truncate">{player.player_name}</h3>
              )}

              {/* Position & Age */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge className="bg-primary text-primary-foreground text-xs">
                  {player.position || 'Unknown'}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {player.age} years
                </Badge>
              </div>

              {/* Nationality */}
              {player.nationality && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{getCountryFlag(player.nationality)}</span>
                  <span className="truncate">{player.nationality}</span>
                  {isEUCountry(player.nationality) && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                      🇪🇺 EU
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Transfermarkt Link */}
            {player.player_transfermarkt_url && (
              <a
                href={player.player_transfermarkt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0"
              >
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-3 flex flex-col flex-1 bg-background">
          {/* Current Club */}
          {player.club_name && (
            <div className="flex items-center gap-2 pb-3 mb-3 border-b">
              {/* Club Logo - Clickable */}
              {player.club_logo_url && (
                <>
                  {player.club_transfermarkt_url ? (
                    <a
                      href={player.club_transfermarkt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={player.club_logo_url}
                        alt={player.club_name}
                        className="w-7 h-7 object-contain cursor-pointer"
                      />
                    </a>
                  ) : (
                    <img
                      src={player.club_logo_url}
                      alt={player.club_name}
                      className="w-7 h-7 object-contain"
                    />
                  )}
                </>
              )}
              <div className="flex-1 min-w-0">
                {/* Club Name - Clickable */}
                {player.club_transfermarkt_url ? (
                  <a
                    href={player.club_transfermarkt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    <p className="font-semibold text-sm truncate">{player.club_name}</p>
                  </a>
                ) : (
                  <p className="font-semibold text-sm truncate">{player.club_name}</p>
                )}
                {/* League Name - Clickable */}
                {player.league_name && (
                  <>
                    {player.league_transfermarkt_url ? (
                      <a
                        href={player.league_transfermarkt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <span>{getCountryFlag(player.league_country)}</span>
                          <span>{player.league_name}</span>
                        </p>
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <span>{getCountryFlag(player.league_country)}</span>
                        <span>{player.league_name}</span>
                      </p>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {player.league_tier && (
                  <Badge variant="secondary" className="text-xs">
                    Tier {player.league_tier}
                  </Badge>
                )}
                {player.club_avg_market_value && (
                  <Badge variant="outline" className="text-xs">
                    {formatMarketValue(player.club_avg_market_value)}/p
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Player Stats Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="flex items-center gap-1 text-muted-foreground" title="Height">
              <Ruler className="h-3 w-3" />
              <span>{player.height ? `${player.height} cm` : 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground" title="Preferred Foot">
              <span className="text-xs">⚽</span>
              <span>{formatFoot(player.foot)}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground" title="Market Value">
              <Euro className="h-3 w-3" />
              <span>{formatMarketValue(player.market_value)}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground" title="Contract Expires">
              {isContractExpiringSoon(player.contract_expires) ? (
                <Badge variant="destructive" className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(player.contract_expires)}</span>
                </Badge>
              ) : (
                <>
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(player.contract_expires)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
