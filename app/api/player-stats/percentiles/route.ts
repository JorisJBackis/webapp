import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Helper function to extract most recent season stats for a tournament
function extractSeasonStats(sfData: any, tournamentName: string): any {
  if (!sfData) return null;

  // sf_data structure: { "player_id": { "tournament_name": "...", "seasons": { "season_id": {...} } } }
  for (const playerId in sfData) {
    const playerData = sfData[playerId];

    if (playerData.tournament_name === tournamentName && playerData.seasons) {
      // Get the most recent season (highest season ID)
      const seasonIds = Object.keys(playerData.seasons);
      if (seasonIds.length === 0) continue;

      // Sort season IDs numerically and get the latest
      const latestSeasonId = seasonIds.sort((a, b) => parseInt(b) - parseInt(a))[0];
      const seasonData = playerData.seasons[latestSeasonId];

      return seasonData.statistics;
    }
  }

  return null;
}

// Helper function to calculate percentile
function calculatePercentile(value: number, allValues: number[], higherIsBetter: boolean = true): number {
  const sortedValues = [...allValues].sort((a, b) => a - b);
  const index = sortedValues.findIndex(v => v >= value);
  if (index === -1) return higherIsBetter ? 100 : 0;
  const percentile = Math.round((index / sortedValues.length) * 100);
  // Invert for stats where lower is better (e.g., red cards, fouls)
  return higherIsBetter ? percentile : (100 - percentile);
}

// Helper function to calculate rank (1-indexed)
function calculateRank(value: number, allValues: number[], higherIsBetter: boolean = true): number {
  const sortedValues = [...allValues].sort((a, b) => higherIsBetter ? b - a : a - b);
  const rank = sortedValues.findIndex(v => v === value) + 1;
  return rank;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const league = searchParams.get('league'); // Optional now
  const position = searchParams.get('position'); // Optional now
  const currentPlayerId = searchParams.get('playerId'); // Current logged-in player

  try {
    const supabase = await createClient();

    // Get current user to auto-detect their league and position
    let userLeague = league;
    let userPosition = position;
    let userPlayerData = null;

    if (!league || !position) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Get player profile to find their transfermarkt player
        const { data: playerProfile } = await supabase
          .from('player_profiles')
          .select('transfermarkt_player_id')
          .eq('id', user.id)
          .single();

        if (playerProfile?.transfermarkt_player_id) {
          // Get player data with club and position info
          const { data: playerData } = await supabase
            .from('players_transfermarkt')
            .select(`
              id,
              club_id,
              sofascore_id,
              clubs_transfermarkt!inner (
                league_id,
                leagues_transfermarkt!inner (
                  name
                )
              ),
              sofascore_players_staging (
                position
              )
            `)
            .eq('id', playerProfile.transfermarkt_player_id)
            .single();

          if (playerData) {
            const club = playerData.clubs_transfermarkt as any;
            const league = club?.leagues_transfermarkt;
            const sofascoreData = playerData.sofascore_players_staging as any;

            // Map league ID to tournament name
            const leagueMap: { [key: string]: string } = {
              'LET1': 'Virsliga',
              'FI1': 'Veikkausliiga'
            };

            userLeague = leagueMap[club?.league_id] || null;
            userPosition = sofascoreData?.position || null;
            userPlayerData = playerData;
          }
        }
      }
    }

    // Must have league and position
    if (!userLeague || !userPosition) {
      return NextResponse.json({
        error: 'League and position are required. Could not auto-detect from user profile.',
        league: userLeague,
        position: userPosition
      }, { status: 400 });
    }

    // Map tournament names to league IDs for DB filtering
    const tournamentToLeagueId: { [key: string]: string } = {
      'Virsliga': 'LET1',
      'Veikkausliiga': 'FI1'
    };

    const leagueId = tournamentToLeagueId[userLeague];
    if (!leagueId) {
      return NextResponse.json({
        error: `Unknown league: ${userLeague}`,
        league: userLeague
      }, { status: 400 });
    }

    console.log(`[PlayerStats] Fetching stats for league=${userLeague} (${leagueId}), position=${userPosition}`);

    // Query players filtered by league at DB level (much faster!)
    const { data: players, error } = await supabase
      .from('players_transfermarkt')
      .select(`
        id,
        name,
        age,
        picture_url,
        main_position,
        sf_data,
        sofascore_id,
        club_id,
        transfermarkt_url,
        market_value_eur,
        clubs_transfermarkt!inner (
          id,
          name,
          logo_url,
          league_id,
          transfermarkt_url
        ),
        sofascore_players_staging!inner (
          position
        )
      `)
      .not('sf_data', 'is', null)
      .not('sofascore_id', 'is', null)
      .eq('clubs_transfermarkt.league_id', leagueId)
      .eq('sofascore_players_staging.position', userPosition);

    if (error) {
      console.error('[PlayerStats] Error fetching players:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // No need for in-memory filtering - already filtered at DB level
    const filteredPlayers = players;

    console.log(`[PlayerStats] Found ${filteredPlayers.length} players in ${userLeague} position ${userPosition}`);

    // Extract stats for each player
    const playersWithStats = filteredPlayers.map(player => {
      const sfPosition = (player.sofascore_players_staging as any)?.position;
      const stats = extractSeasonStats(player.sf_data, userLeague);

      if (!stats) return null;

      return {
        id: player.id,
        name: player.name,
        age: player.age,
        picture_url: player.picture_url,
        position: sfPosition || player.main_position,
        club: (player.clubs_transfermarkt as any)?.name,
        club_logo: (player.clubs_transfermarkt as any)?.logo_url,
        transfermarkt_url: player.transfermarkt_url,
        club_transfermarkt_url: (player.clubs_transfermarkt as any)?.transfermarkt_url,
        market_value_eur: player.market_value_eur,
        stats: {
          rating: stats.rating || 0,
          goals: stats.goals || 0,
          assists: stats.assists || 0,
          appearances: stats.appearances || 0,
          minutesPlayed: stats.minutesPlayed || 0,
          matchesStarted: stats.matchesStarted || 0,
          accuratePassesPercentage: stats.accuratePassesPercentage || 0,
          totalDuelsWonPercentage: stats.totalDuelsWonPercentage || 0,
          successfulDribblesPercentage: stats.successfulDribblesPercentage || 0,
          aerialDuelsWonPercentage: stats.aerialDuelsWonPercentage || 0,
          ballRecovery: stats.ballRecovery || 0,
          keyPasses: stats.keyPasses || 0,
          shotsOnTarget: stats.shotsOnTarget || 0,
          totalShots: stats.totalShots || 0,
          goalConversionPercentage: stats.goalConversionPercentage || 0,
          clearances: stats.clearances || 0,
          totalCross: stats.totalCross || 0,
          accurateCrossesPercentage: stats.accurateCrossesPercentage || 0,
          yellowCards: stats.yellowCards || 0,
          redCards: stats.redCards || 0,
          fouls: stats.fouls || 0,
          wasFouled: stats.wasFouled || 0,
        }
      };
    }).filter(p => p !== null);

    console.log(`[PlayerStats] Extracted stats for ${playersWithStats.length} players`);

    if (playersWithStats.length === 0) {
      return NextResponse.json({
        players: [],
        league: userLeague,
        position: userPosition,
        totalPlayers: 0,
        message: 'No players found with stats for this league/position combination'
      });
    }

    // Define all stats to calculate percentiles and ranks for
    const statsConfig = [
      { key: 'rating', higherIsBetter: true },
      { key: 'goals', higherIsBetter: true },
      { key: 'assists', higherIsBetter: true },
      { key: 'appearances', higherIsBetter: true },
      { key: 'minutesPlayed', higherIsBetter: true },
      { key: 'accuratePassesPercentage', higherIsBetter: true },
      { key: 'totalDuelsWonPercentage', higherIsBetter: true },
      { key: 'successfulDribblesPercentage', higherIsBetter: true },
      { key: 'aerialDuelsWonPercentage', higherIsBetter: true },
      { key: 'ballRecovery', higherIsBetter: true },
      { key: 'keyPasses', higherIsBetter: true },
      { key: 'shotsOnTarget', higherIsBetter: true },
      { key: 'goalConversionPercentage', higherIsBetter: true },
      { key: 'clearances', higherIsBetter: true },
      { key: 'accurateCrossesPercentage', higherIsBetter: true },
      { key: 'yellowCards', higherIsBetter: false },
      { key: 'redCards', higherIsBetter: false },
      { key: 'fouls', higherIsBetter: false },
    ];

    // Extract all values for each stat
    const statValues: { [key: string]: number[] } = {};
    statsConfig.forEach(config => {
      statValues[config.key] = playersWithStats.map(p => (p!.stats as any)[config.key]);
    });

    // Add percentiles and ranks to each player
    const playersWithPercentiles = playersWithStats.map(player => {
      const percentiles: { [key: string]: number } = {};
      const ranks: { [key: string]: number } = {};

      statsConfig.forEach(config => {
        const value = (player!.stats as any)[config.key];
        percentiles[config.key] = calculatePercentile(value, statValues[config.key], config.higherIsBetter);
        ranks[config.key] = calculateRank(value, statValues[config.key], config.higherIsBetter);
      });

      return {
        ...player,
        percentiles,
        ranks,
        totalPlayers: playersWithStats.length
      };
    });

    // Sort by FootyLabs score descending
    playersWithPercentiles.sort((a, b) =>
      b!.stats.rating - a!.stats.rating
    );

    return NextResponse.json({
      players: playersWithPercentiles,
      league: userLeague,
      position: userPosition,
      totalPlayers: playersWithPercentiles.length,
      currentPlayerId: userPlayerData?.id || null
    });

  } catch (error) {
    console.error('[PlayerStats] Unexpected error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
