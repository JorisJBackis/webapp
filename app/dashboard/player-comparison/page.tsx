'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrophyIcon, TrendingUpIcon, TrendingDownIcon, TargetIcon } from 'lucide-react';
import Image from 'next/image';

interface PlayerStats {
  footyLabsScore: number;
  goals: number;
  assists: number;
  appearances: number;
  minutesPlayed: number;
  matchesStarted: number;
  accuratePassesPercentage: number;
  totalDuelsWonPercentage: number;
  successfulDribblesPercentage: number;
  aerialDuelsWonPercentage: number;
  ballRecovery: number;
  keyPasses: number;
  shotsOnTarget: number;
  totalShots: number;
  goalConversionPercentage: number;
  clearances: number;
  totalCross: number;
  accurateCrossesPercentage: number;
  yellowCards: number;
  redCards: number;
  fouls: number;
  wasFouled: number;
}

interface Player {
  id: number;
  name: string;
  age: number;
  picture_url: string | null;
  position: string;
  club: string;
  club_logo: string | null;
  transfermarkt_url: string | null;
  club_transfermarkt_url: string | null;
  market_value_eur: number | null;
  stats: PlayerStats;
  percentiles: { [key: string]: number };
  ranks: { [key: string]: number };
  totalPlayers: number;
}

interface StatConfig {
  key: keyof PlayerStats;
  label: string;
  format: (value: number) => string;
  higherIsBetter: boolean;
}

const statConfigs: StatConfig[] = [
  { key: 'rating', label: 'FootyLabs Score', format: (v) => v?.toFixed(2) ?? '0', higherIsBetter: true },
  { key: 'goals', label: 'Goals', format: (v) => v?.toString() ?? '0', higherIsBetter: true },
  { key: 'assists', label: 'Assists', format: (v) => v?.toString() ?? '0', higherIsBetter: true },
  { key: 'accuratePassesPercentage', label: 'Pass Accuracy', format: (v) => `${v?.toFixed(1) ?? '0'}%`, higherIsBetter: true },
  { key: 'totalDuelsWonPercentage', label: 'Duels Won', format: (v) => `${v?.toFixed(1) ?? '0'}%`, higherIsBetter: true },
  { key: 'successfulDribblesPercentage', label: 'Dribbles Success', format: (v) => `${v?.toFixed(1) ?? '0'}%`, higherIsBetter: true },
  { key: 'aerialDuelsWonPercentage', label: 'Aerial Duels', format: (v) => `${v?.toFixed(1) ?? '0'}%`, higherIsBetter: true },
  { key: 'ballRecovery', label: 'Ball Recoveries', format: (v) => v?.toString() ?? '0', higherIsBetter: true },
  { key: 'keyPasses', label: 'Key Passes', format: (v) => v?.toString() ?? '0', higherIsBetter: true },
  { key: 'shotsOnTarget', label: 'Shots on Target', format: (v) => v?.toString() ?? '0', higherIsBetter: true },
  { key: 'clearances', label: 'Clearances', format: (v) => v?.toString() ?? '0', higherIsBetter: true },
  { key: 'accurateCrossesPercentage', label: 'Crossing Accuracy', format: (v) => `${v?.toFixed(1) ?? '0'}%`, higherIsBetter: true },
  { key: 'minutesPlayed', label: 'Minutes Played', format: (v) => v?.toString() ?? '0', higherIsBetter: true },
  { key: 'appearances', label: 'Appearances', format: (v) => v?.toString() ?? '0', higherIsBetter: true },
];

// Map position codes to full names
const positionNames: { [key: string]: string } = {
  'G': 'Goalkeeper',
  'D': 'Defender',
  'M': 'Midfielder',
  'F': 'Forward'
};

function getPercentileColor(percentile: number): string {
  if (percentile >= 80) return 'text-green-500';
  if (percentile >= 60) return 'text-blue-500';
  if (percentile >= 40) return 'text-yellow-500';
  if (percentile >= 20) return 'text-orange-500';
  return 'text-red-500';
}

function getPercentileBgColor(percentile: number): string {
  if (percentile >= 80) return 'bg-green-500';
  if (percentile >= 60) return 'bg-blue-500';
  if (percentile >= 40) return 'bg-yellow-500';
  if (percentile >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}

function StatBar({ label, value, percentile, rank, totalPlayers, format }: {
  label: string;
  value: number;
  percentile: number;
  rank: number;
  totalPlayers: number;
  format: (v: number) => string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className={getPercentileColor(percentile)}>
            {format(value)}
          </span>
          <Badge variant="outline" className={`${getPercentileColor(percentile)} text-xs`}>
            #{rank}/{totalPlayers}
          </Badge>
        </div>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getPercentileBgColor(percentile)} transition-all duration-500`}
          style={{ width: `${percentile}%` }}
        />
      </div>
    </div>
  );
}

function PlayerCard({ player, isCurrentPlayer, selectedStat }: {
  player: Player;
  isCurrentPlayer?: boolean;
  selectedStat: keyof PlayerStats;
}) {
  // Find top 3 and bottom 3 stats by percentile
  const rankedStats = statConfigs.map(config => ({
    ...config,
    percentile: player.percentiles[config.key],
    value: player.stats[config.key],
    rank: player.ranks[config.key]
  })).sort((a, b) => b.percentile - a.percentile);

  const topStrengths = rankedStats.slice(0, 3);
  const bottomWeaknesses = rankedStats.slice(-3).reverse();

  // Get the selected stat config
  const selectedStatConfig = statConfigs.find(s => s.key === selectedStat);

  return (
    <Card className={`transition-all duration-300 hover:shadow-lg ${isCurrentPlayer ? 'ring-2 ring-primary shadow-xl' : ''}`}>
      <CardHeader>
        {isCurrentPlayer && (
          <Badge className="mb-2 w-fit bg-primary">
            <TargetIcon className="w-3 h-3 mr-1" />
            This is You!
          </Badge>
        )}

        <div className="flex items-start gap-4">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
            {player.picture_url ? (
              <Image
                src={player.picture_url}
                alt={player.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold">
                {player.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {player.transfermarkt_url ? (
              <a
                href={player.transfermarkt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                <CardTitle className="text-lg truncate">{player.name}</CardTitle>
              </a>
            ) : (
              <CardTitle className="text-lg truncate">{player.name}</CardTitle>
            )}
            <CardDescription className="flex items-center gap-2 mt-1">
              {player.club_logo && (
                <Image src={player.club_logo} alt={player.club} width={16} height={16} />
              )}
              {player.club_transfermarkt_url ? (
                <a
                  href={player.club_transfermarkt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate hover:underline"
                >
                  {player.club}
                </a>
              ) : (
                <span className="truncate">{player.club}</span>
              )}
            </CardDescription>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">{positionNames[player.position] || player.position}</Badge>
              <Badge variant="outline">{player.age} yrs</Badge>
              {player.market_value_eur !== null && player.market_value_eur > 0 && (
                <Badge variant="outline" className="text-green-600">
                  €{(player.market_value_eur / 1000).toFixed(0)}k
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Selected Stat - Hero Display */}
        {selectedStatConfig && (
          <div className="mt-4 p-4 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{selectedStatConfig.label}</p>
                <p className="text-3xl font-bold text-primary">
                  {selectedStatConfig.format(player.stats[selectedStat])}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Rank</p>
                <p className={`text-xl font-bold ${getPercentileColor(player.percentiles[selectedStat])}`}>
                  #{player.ranks[selectedStat]} / {player.totalPlayers}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {player.percentiles[selectedStat]}th percentile
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="text-center p-2 bg-secondary/50 rounded">
            <p className="text-xl font-bold">{player.stats.goals}</p>
            <p className="text-xs text-muted-foreground">Goals</p>
            <p className="text-xs text-primary">#{player.ranks.goals}</p>
          </div>
          <div className="text-center p-2 bg-secondary/50 rounded">
            <p className="text-xl font-bold">{player.stats.assists}</p>
            <p className="text-xs text-muted-foreground">Assists</p>
            <p className="text-xs text-primary">#{player.ranks.assists}</p>
          </div>
          <div className="text-center p-2 bg-secondary/50 rounded">
            <p className="text-xl font-bold">{player.stats.appearances}</p>
            <p className="text-xs text-muted-foreground">Matches</p>
            <p className="text-xs text-primary">#{player.ranks.appearances}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Top 3 Strengths */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUpIcon className="w-4 h-4 text-green-500" />
            <span className="text-sm font-semibold text-green-500">Top 3 Strengths</span>
          </div>
          <div className="space-y-2">
            {topStrengths.map(stat => (
              <StatBar
                key={stat.key}
                label={stat.label}
                value={stat.value}
                percentile={stat.percentile}
                rank={stat.rank}
                totalPlayers={player.totalPlayers}
                format={stat.format}
              />
            ))}
          </div>
        </div>

        <Separator />

        {/* Bottom 3 Weaknesses */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDownIcon className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold text-orange-500">Areas to Improve</span>
          </div>
          <div className="space-y-2">
            {bottomWeaknesses.map(stat => (
              <StatBar
                key={stat.key}
                label={stat.label}
                value={stat.value}
                percentile={stat.percentile}
                rank={stat.rank}
                totalPlayers={player.totalPlayers}
                format={stat.format}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PlayerComparisonPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<number | null>(null);
  const [tournamentName, setTournamentName] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStat, setSelectedStat] = useState<keyof PlayerStats>('rating');
  const currentPlayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get the user's saved tournament/season selection from the dashboard
        // First we need to get the player ID to find their selection
        const dashboardCache = sessionStorage.getItem('player_dashboard_cache_v4');
        let savedTournamentId = '';
        let savedSeasonId = '';
        let playerPosition = '';

        if (dashboardCache) {
          try {
            const dashboardData = JSON.parse(dashboardCache);
            savedTournamentId = dashboardData.selectedTournamentId || '';
            savedSeasonId = dashboardData.selectedSeasonId || '';
            playerPosition = dashboardData.playerData?.position || '';

            // Also check localStorage for the specific player's selection
            if (dashboardData.playerData?.id) {
              const selectionKey = `player_stats_selection_${dashboardData.playerData.id}`;
              const savedSelection = localStorage.getItem(selectionKey);
              if (savedSelection) {
                const parsed = JSON.parse(savedSelection);
                savedTournamentId = parsed.tournamentId || savedTournamentId;
                savedSeasonId = parsed.seasonId || savedSeasonId;
              }
            }
          } catch (e) {
            console.warn('[PlayerComparison] Failed to parse dashboard cache');
          }
        }

        // Build cache key that includes the selection
        const CACHE_KEY = `player_comparison_cache_v3_${savedTournamentId}_${savedSeasonId}`;

        // Check session cache first (but only if selection matches)
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const data = JSON.parse(cached);
          console.log('[PlayerComparison] Using cached data for', savedTournamentId, savedSeasonId);
          setPlayers(data.players || []);
          setCurrentPlayerId(data.currentPlayerId);
          setTournamentName(data.tournamentName || '');
          setPosition(data.position);
          setLoading(false);

          if (data.currentPlayerId) {
            setTimeout(() => {
              currentPlayerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
          }
          return;
        }

        // Build API URL with tournament/season params if available
        let apiUrl = '/api/player-stats/percentiles';
        const params = new URLSearchParams();
        if (savedTournamentId) params.set('tournamentId', savedTournamentId);
        if (savedSeasonId) params.set('seasonId', savedSeasonId);
        if (playerPosition) params.set('position', playerPosition);

        if (params.toString()) {
          apiUrl += '?' + params.toString();
        }

        console.log('[PlayerComparison] Fetching from:', apiUrl);
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch players');
        }

        console.log('[PlayerComparison] Fetched data:', {
          tournamentId: data.tournamentId,
          seasonId: data.seasonId,
          position: data.position,
          totalPlayers: data.totalPlayers
        });

        // Get tournament name from the response or dashboard cache
        let fetchedTournamentName = '';
        if (dashboardCache) {
          try {
            const dashboardData = JSON.parse(dashboardCache);
            const tournaments = dashboardData.availableTournaments || [];
            const tournament = tournaments.find((t: any) => t.id === data.tournamentId);
            fetchedTournamentName = tournament?.name || '';
          } catch (e) {}
        }

        // Cache the data with the selection-specific key
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          ...data,
          tournamentName: fetchedTournamentName
        }));

        setPlayers(data.players || []);
        setCurrentPlayerId(data.currentPlayerId);
        setTournamentName(fetchedTournamentName);
        setPosition(data.position);

        // Scroll to current player card after a short delay
        if (data.currentPlayerId) {
          setTimeout(() => {
            currentPlayerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 500);
        }
      } catch (err) {
        console.error('[PlayerComparison] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  // Auto-scroll to current player when stat selection changes
  useEffect(() => {
    if (currentPlayerId && players.length > 0) {
      setTimeout(() => {
        currentPlayerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [selectedStat, currentPlayerId, players.length]);

  // Sort players by selected stat
  const sortedPlayers = [...players].sort((a, b) => {
    const aValue = a.stats[selectedStat];
    const bValue = b.stats[selectedStat];
    const config = statConfigs.find(s => s.key === selectedStat);

    // Sort by the stat value (higher is better for most stats)
    if (config?.higherIsBetter) {
      return bValue - aValue;
    } else {
      return aValue - bValue;
    }
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          Player Benchmark Hub
        </h1>
        <p className="text-muted-foreground">
          Compare your performance against players in your league and position
        </p>
      </div>

      {/* Filters */}
      {!loading && !error && players.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ranking Options</CardTitle>
            <CardDescription>
              {players.length} {positionNames[position] || position}s{tournamentName ? ` in ${tournamentName}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Rank By Stat</label>
                <Select value={selectedStat} onValueChange={(v) => setSelectedStat(v as keyof PlayerStats)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[300px] overflow-y-auto">
                    {statConfigs.map(stat => (
                      <SelectItem key={stat.key} value={stat.key}>
                        {stat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading your performance data...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-500">
          <CardContent className="p-6">
            <p className="text-red-500">Error: {error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Make sure you have completed your player onboarding and your data has been processed.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Player Grid */}
      {!loading && !error && players.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPlayers.map((player) => (
            <div
              key={player.id}
              ref={player.id === currentPlayerId ? currentPlayerRef : null}
            >
              <PlayerCard
                player={player}
                isCurrentPlayer={player.id === currentPlayerId}
                selectedStat={selectedStat}
              />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && players.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              No performance data available yet. Complete your onboarding to see your stats.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
