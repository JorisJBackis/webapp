import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Helper function to calculate percentile
function calculatePercentile(value: number, allValues: number[], higherIsBetter: boolean = true): number {
  const sortedValues = [...allValues].sort((a, b) => a - b);
  const index = sortedValues.findIndex(v => v >= value);
  if (index === -1) return higherIsBetter ? 100 : 0;
  const percentile = Math.round((index / sortedValues.length) * 100);
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
  const tournamentId = searchParams.get('tournamentId');
  const seasonId = searchParams.get('seasonId');
  const position = searchParams.get('position');

  try {
    const supabase = await createClient();

    // Get current user to auto-detect their tournament/season/position if not provided
    let userTournamentId = tournamentId;
    let userSeasonId = seasonId;
    let userPosition = position;
    let userPlayerId: number | null = null;

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Get player profile
      const { data: playerProfile } = await supabase
        .from('player_profiles')
        .select('transfermarkt_player_id')
        .eq('id', user.id)
        .single();

      if (playerProfile?.transfermarkt_player_id) {
        userPlayerId = playerProfile.transfermarkt_player_id;

        // Get player data to auto-detect position and default tournament/season
        const { data: playerData } = await supabase
          .from('players_transfermarkt')
          .select(`
            id,
            sf_data,
            clubs_transfermarkt (
              leagues_transfermarkt (
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
          const sofascoreData = playerData.sofascore_players_staging as any;
          userPosition = userPosition || sofascoreData?.position;

          // If no tournament/season provided, find default from sf_data
          if (!userTournamentId || !userSeasonId) {
            const sfData = playerData.sf_data as any;
            const club = playerData.clubs_transfermarkt as any;
            const leagueName = club?.leagues_transfermarkt?.name;

            if (sfData && leagueName) {
              // Find tournament matching player's league
              for (const tId in sfData) {
                const tournament = sfData[tId];
                if (tournament.tournament_name === leagueName && tournament.seasons) {
                  userTournamentId = userTournamentId || tId;
                  // Get most recent season
                  const seasonIds = Object.keys(tournament.seasons).sort((a, b) => parseInt(b) - parseInt(a));
                  userSeasonId = userSeasonId || seasonIds[0];
                  break;
                }
              }

              // Fallback: use tournament with most recent season
              if (!userTournamentId || !userSeasonId) {
                let mostRecentSeasonId = 0;
                for (const tId in sfData) {
                  const tournament = sfData[tId];
                  if (tournament.seasons) {
                    const seasonIds = Object.keys(tournament.seasons).map(id => parseInt(id));
                    const latestSeasonId = Math.max(...seasonIds);
                    if (latestSeasonId > mostRecentSeasonId) {
                      mostRecentSeasonId = latestSeasonId;
                      userTournamentId = tId;
                      userSeasonId = latestSeasonId.toString();
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Must have tournament, season, and position
    if (!userTournamentId || !userSeasonId || !userPosition) {
      return NextResponse.json({
        error: 'Tournament, season, and position are required',
        tournamentId: userTournamentId,
        seasonId: userSeasonId,
        position: userPosition
      }, { status: 400 });
    }

    console.log(`[PlayerStats] Fetching percentiles for tournament=${userTournamentId}, season=${userSeasonId}, position=${userPosition}`);

    // Use RPC to filter on database side - much more efficient than fetching all players
    // This queries only players who have the specific tournament AND season in their sf_data
    const { data: filteredPlayers, error } = await supabase.rpc('get_players_for_percentiles', {
      p_tournament_id: userTournamentId,
      p_season_id: userSeasonId,
      p_position: userPosition
    });

    if (error) {
      console.error('[PlayerStats] Error from RPC:', error);

      // Fallback to old method if RPC doesn't exist yet
      if (error.code === '42883') { // function does not exist
        console.log('[PlayerStats] RPC not found, using fallback method');
        return await fallbackFetchPlayers(supabase, userTournamentId!, userSeasonId!, userPosition!);
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allPlayers = filteredPlayers || [];
    console.log(`[PlayerStats] Players from RPC: ${allPlayers?.length}`);

    // Map RPC response to expected format
    // RPC already filters by tournament/season/position, so we just extract stats
    const playersWithStats = allPlayers.map((player: any) => {
      const sfData = player.sf_data as any;
      const stats = sfData[userTournamentId!].seasons[userSeasonId!].statistics;

      return {
        id: player.id,
        name: player.name,
        age: player.age,
        picture_url: player.picture_url,
        position: player.player_position || player.main_position,
        club: player.club_name,
        club_logo: player.club_logo_url,
        transfermarkt_url: player.transfermarkt_url,
        club_transfermarkt_url: player.club_transfermarkt_url,
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
    });

    console.log(`[PlayerStats] Found ${playersWithStats.length} players with position ${userPosition} in tournament ${userTournamentId} season ${userSeasonId}`);

    if (playersWithStats.length === 0) {
      return NextResponse.json({
        players: [],
        tournamentId: userTournamentId,
        seasonId: userSeasonId,
        position: userPosition,
        totalPlayers: 0,
        message: 'No players found with stats for this tournament/season/position combination'
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
      statValues[config.key] = playersWithStats.map(p => (p.stats as any)[config.key]);
    });

    // Add percentiles and ranks to each player
    const playersWithPercentiles = playersWithStats.map(player => {
      const percentiles: { [key: string]: number } = {};
      const ranks: { [key: string]: number } = {};

      statsConfig.forEach(config => {
        const value = (player.stats as any)[config.key];
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
    playersWithPercentiles.sort((a, b) => b.stats.rating - a.stats.rating);

    return NextResponse.json({
      players: playersWithPercentiles,
      tournamentId: userTournamentId,
      seasonId: userSeasonId,
      position: userPosition,
      totalPlayers: playersWithPercentiles.length,
      currentPlayerId: userPlayerId
    });

  } catch (error) {
    console.error('[PlayerStats] Unexpected error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Fallback function when RPC doesn't exist - uses the old pagination method
async function fallbackFetchPlayers(
  supabase: any,
  tournamentId: string,
  seasonId: string,
  position: string
) {
  let allPlayers: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error } = await supabase
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
        clubs_transfermarkt (
          id,
          name,
          logo_url,
          league_id,
          transfermarkt_url
        ),
        sofascore_players_staging (
          position
        )
      `)
      .not('sf_data', 'is', null)
      .not('sofascore_id', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (batch && batch.length > 0) {
      allPlayers = allPlayers.concat(batch);
      page++;
      hasMore = batch.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  // Filter and process (same logic as main function)
  const playersWithStats = allPlayers
    .filter(player => {
      const sfPosition = (player.sofascore_players_staging as any)?.position;
      if (sfPosition !== position) return false;
      const sfData = player.sf_data as any;
      if (!sfData?.[tournamentId]?.seasons?.[seasonId]?.statistics) return false;
      return true;
    })
    .map(player => {
      const sfData = player.sf_data as any;
      const stats = sfData[tournamentId].seasons[seasonId].statistics;
      return {
        id: player.id,
        name: player.name,
        age: player.age,
        picture_url: player.picture_url,
        position: (player.sofascore_players_staging as any)?.position || player.main_position,
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
    });

  if (playersWithStats.length === 0) {
    return NextResponse.json({
      players: [],
      tournamentId,
      seasonId,
      position,
      totalPlayers: 0,
      message: 'No players found'
    });
  }

  // Calculate percentiles (simplified version)
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

  const statValues: { [key: string]: number[] } = {};
  statsConfig.forEach(config => {
    statValues[config.key] = playersWithStats.map(p => (p.stats as any)[config.key]);
  });

  const playersWithPercentiles = playersWithStats.map(player => {
    const percentiles: { [key: string]: number } = {};
    const ranks: { [key: string]: number } = {};

    statsConfig.forEach(config => {
      const value = (player.stats as any)[config.key];
      percentiles[config.key] = calculatePercentile(value, statValues[config.key], config.higherIsBetter);
      ranks[config.key] = calculateRank(value, statValues[config.key], config.higherIsBetter);
    });

    return { ...player, percentiles, ranks, totalPlayers: playersWithStats.length };
  });

  playersWithPercentiles.sort((a, b) => b.stats.rating - a.stats.rating);

  return NextResponse.json({
    players: playersWithPercentiles,
    tournamentId,
    seasonId,
    position,
    totalPlayers: playersWithPercentiles.length
  });
}
