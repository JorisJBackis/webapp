// components/scouting/league-player-browser.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';
// UI Component Imports
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Search, ArrowUpDown, Info, SlidersHorizontal, Filter, Star } from 'lucide-react';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import PlayerDetailModal from '@/components/common/player-detail-modal';
import type { PlayerDataForModal } from '@/components/common/player-detail-modal';
import { useToast } from "@/components/ui/use-toast";

// --- Type Definitions ---
type ScoutingPlayer = Database['public']['Functions']['get_scouting_players']['Returns'][number];

// --- Helper Functions ---
const formatFootylabsScore = (score: number | string | null | undefined): string => {
  if (score === null || score === undefined) return "N/A";
  const numScore = Number(score);
  if (isNaN(numScore)) return "N/A";
  return (numScore * 10).toFixed(1);
};

const getScoreColor = (score: number | string | null | undefined): string => {
  if (score === null || score === undefined) return "text-muted-foreground";
  const numScore = Number(score);
  if (isNaN(numScore)) return "text-muted-foreground";
  const scaledScore = numScore * 100;
  if (scaledScore <= 33.3) return "text-red-600 font-medium";
  if (scaledScore <= 66.6) return "text-amber-500 font-medium";
  return "text-green-600 font-medium";
};

const formatFootDisplay = (foot: string | null | undefined): string => {
  if (!foot) return "N/A";
  const lowerFoot = foot.toLowerCase();
  if (lowerFoot === 'unknown') return "N/A";
  if (lowerFoot === 'left') return "Left";
  if (lowerFoot === 'right') return "Right";
  if (lowerFoot === 'both') return "Both";
  return foot; // Fallback to original if not matched
};

// --- Main Scouting Component ---
export default function LeaguePlayerBrowser({ initialUserClubId }: { initialUserClubId: number | null }) {
  const [players, setPlayers] = useState<ScoutingPlayer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const { toast } = useToast();

  const [leagues, setLeagues] = useState<string[]>([]);

  const [filters, setFilters] = useState({
    name: '',
    position: 'all',
    foot: 'all',
    minHeight: '',
    maxHeight: '',
    league: 'all',
  });
  const [sortColumn, setSortColumn] = useState<string>('avg_percentile');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedPlayer, setSelectedPlayer] = useState<ScoutingPlayer | null>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(filters.name);

  const [watchlistPlayerIds, setWatchlistPlayerIds] = useState<Set<number>>(new Set());
  const [togglingWatchlist, setTogglingWatchlist] = useState<Set<number>>(new Set());

  const fetchWatchlistStatus = useCallback(async () => {
    if (!initialUserClubId || !supabase) return;
    try {
      const { data, error: watchlistError } = await supabase
          .from("watchlist")
          .select("player_id")
          .eq("club_id", initialUserClubId);

      if (watchlistError) throw watchlistError;
      const playerIds = new Set(data?.map((item) => item.player_id) || []);
      setWatchlistPlayerIds(playerIds);
    } catch (err) {
      console.error("Error fetching watchlist status:", err);
    }
  }, [initialUserClubId, supabase]);

  const toggleWatchlist = async (player: ScoutingPlayer) => {
    if (!initialUserClubId || !supabase || player.player_id === null || player.player_id === undefined) {
      toast({ title: "Error", description: "Cannot update watchlist. Missing user or player ID.", variant: "destructive" });
      return;
    }

    const playerIdToToggle = player.player_id;
    const playerName = player.name || "Player";
    const isInWatchlist = watchlistPlayerIds.has(playerIdToToggle);

    setTogglingWatchlist((prev) => new Set(prev).add(playerIdToToggle));

    try {
      if (isInWatchlist) {
        const { error: deleteError } = await supabase
            .from("watchlist")
            .delete()
            .eq("club_id", initialUserClubId)
            .eq("player_id", playerIdToToggle);
        if (deleteError) throw deleteError;
        setWatchlistPlayerIds((prev) => { const newSet = new Set(prev); newSet.delete(playerIdToToggle); return newSet; });
        toast({ title: "Removed from Watchlist", description: `${playerName} removed.` });
      } else {
        const { error: insertError } = await supabase.from("watchlist").insert({
          club_id: initialUserClubId,
          player_id: playerIdToToggle,
        });
        if (insertError) throw insertError;
        setWatchlistPlayerIds((prev) => new Set(prev).add(playerIdToToggle));
        toast({ title: "Added to Watchlist", description: `${playerName} added.` });
      }
    } catch (err: any) {
      console.error("Error toggling watchlist:", err);
      toast({ title: "Watchlist Error", description: `Could not update: ${err.message}`, variant: "destructive" });
    } finally {
      setTogglingWatchlist((prev) => { const newSet = new Set(prev); newSet.delete(playerIdToToggle); return newSet; });
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedSearchTerm(filters.name); }, 500);
    return () => clearTimeout(handler);
  }, [filters.name]);

  useEffect(() => {
    const fetchLeagues = async () => {
      if (!supabase) return;
      const { data, error: leagueError } = await supabase
          .from('clubs')
          .select('league')
          .neq('league', null);

      if (leagueError) console.error("Error fetching leagues:", leagueError);
      else if (data) {
        const distinctLeagues = [...new Set(data.map(item => item.league).filter(Boolean))] as string[];
        setLeagues(distinctLeagues.sort());
      }
    };
    fetchLeagues();
  }, [supabase]);

  const fetchData = useCallback(async () => {
    if (initialUserClubId === null || initialUserClubId === undefined || !supabase) {
      setError("User/club context missing or connection error."); setLoading(false); return;
    }
    setLoading(true); setError(null);
    const offset = (currentPage - 1) * itemsPerPage;

    try {
      const response: PostgrestSingleResponse<ScoutingPlayer[]> = await supabase.rpc(
          'get_scouting_players',
          {
            p_requesting_club_id: initialUserClubId,
            p_name_filter: debouncedSearchTerm.trim() === '' ? null : debouncedSearchTerm.trim(),
            p_position_filter: filters.position === 'all' ? null : filters.position,
            p_min_height: filters.minHeight === '' ? null : parseInt(filters.minHeight, 10),
            p_max_height: filters.maxHeight === '' ? null : parseInt(filters.maxHeight, 10),
            p_foot_filter: filters.foot === 'all' ? null : filters.foot,
            p_contract_start: null,
            p_contract_end: null,
            p_league_filter: filters.league === 'all' ? null : filters.league,
            p_sort_column: sortColumn,
            p_sort_direction: sortDirection,
            p_limit: itemsPerPage,
            p_offset: offset
          }
      );
      if (response.error) throw response.error;
      const fetchedPlayers = response.data;
      setPlayers(fetchedPlayers || []);
      if (fetchedPlayers && fetchedPlayers.length > 0 && fetchedPlayers[0].total_count !== undefined) {
        setTotalCount(Number(fetchedPlayers[0].total_count));
      } else { setTotalCount(0); }
    } catch (err: any) {
      console.error("Error fetching scouting players:", err);
      setError(`Could not load player data: ${err.message || 'Unknown RPC error'}`);
      setPlayers([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [initialUserClubId, supabase, currentPage, itemsPerPage, sortColumn, sortDirection, debouncedSearchTerm, filters]);

  useEffect(() => {
    if (initialUserClubId !== null) { // Only fetch if clubId is available
      fetchData();
      fetchWatchlistStatus();
    }
  }, [fetchData, fetchWatchlistStatus, initialUserClubId]);

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
  }, [debouncedSearchTerm, filters.position, filters.foot, filters.minHeight, filters.maxHeight, filters.league, sortColumn, sortDirection]); // Reset page on filter/sort change

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => { setFilters(prev => ({ ...prev, [filterName]: value })); };
  const handleSort = (column: string) => {
    const validSortColumns = ['name', 'club_name', 'player_pos', 'age', 'height', 'foot', 'contract_expiry', 'avg_percentile', 'listing_status'];
    if (!validSortColumns.includes(column)) { console.warn("Invalid sort column:", column); return; }
    if (sortColumn === column) { setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc')); }
    else { setSortColumn(column); setSortDirection('asc'); }
  };
  const handlePlayerRowClick = (player: ScoutingPlayer) => { setSelectedPlayer(player); };
  const handleCloseModal = () => { setSelectedPlayer(null); };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginationItems = useMemo(() => {
    const items = []; const maxPagesToShow = 5; const halfMaxPages = Math.floor(maxPagesToShow / 2);
    if (totalPages <= maxPagesToShow) { for (let i = 1; i <= totalPages; i++) { items.push( <PaginationItem key={i}> <PaginationLink href="#" isActive={i === currentPage} onClick={(e) => { e.preventDefault(); setCurrentPage(i); }}> {i} </PaginationLink> </PaginationItem> ); } }
    else {
      items.push( <PaginationItem key={1}> <PaginationLink href="#" isActive={1 === currentPage} onClick={(e) => { e.preventDefault(); setCurrentPage(1); }}> 1 </PaginationLink> </PaginationItem> );
      if (currentPage > halfMaxPages + 1 && totalPages > maxPagesToShow ) { items.push(<PaginationEllipsis key="start-ellipsis" />); }
      let startPage = Math.max(2, currentPage - halfMaxPages + (currentPage > totalPages - halfMaxPages && totalPages > maxPagesToShow ? (maxPagesToShow - (totalPages-currentPage) -1) : 0)   );
      let endPage = Math.min(totalPages - 1, startPage + maxPagesToShow -3 );
      if (currentPage <= halfMaxPages +1 && totalPages > maxPagesToShow) { endPage = Math.min(totalPages - 1, maxPagesToShow-1); }
      else if (currentPage > totalPages - halfMaxPages && totalPages > maxPagesToShow) { startPage = Math.max(2, totalPages - maxPagesToShow + 2); }

      for (let i = startPage; i <= endPage; i++) { items.push( <PaginationItem key={i}> <PaginationLink href="#" isActive={i === currentPage} onClick={(e) => { e.preventDefault(); setCurrentPage(i); }}> {i} </PaginationLink> </PaginationItem> ); }
      if (currentPage < totalPages - halfMaxPages && totalPages > maxPagesToShow) { items.push(<PaginationEllipsis key="end-ellipsis" />); }
      items.push( <PaginationItem key={totalPages}> <PaginationLink href="#" isActive={totalPages === currentPage} onClick={(e) => { e.preventDefault(); setCurrentPage(totalPages); }}> {totalPages} </PaginationLink> </PaginationItem> );
    } return items;
  }, [currentPage, totalPages]);

  return (
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center"><Filter className="mr-2 h-5 w-5"/> Filters</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
            <div className="space-y-1"><Label htmlFor="playerNameSearch">Player Name</Label><Input id="playerNameSearch" placeholder="Search..." value={filters.name} onChange={(e) => handleFilterChange('name', e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="leagueFilter">League</Label><Select value={filters.league} onValueChange={(value) => handleFilterChange('league', value)}><SelectTrigger id="leagueFilter"><SelectValue placeholder="Any League" /></SelectTrigger><SelectContent><SelectItem value="all">All Leagues</SelectItem>{leagues.map(league => (<SelectItem key={league} value={league}>{league}</SelectItem>))}</SelectContent></Select></div>
            <div className="space-y-1"><Label htmlFor="positionFilter">Position</Label><Select value={filters.position} onValueChange={(value) => handleFilterChange('position', value)}><SelectTrigger id="positionFilter"><SelectValue placeholder="Any Position" /></SelectTrigger><SelectContent><SelectItem value="all">All Positions</SelectItem><SelectItem value="Goalkeeper">Goalkeeper</SelectItem><SelectItem value="Centre Back">Centre Back</SelectItem><SelectItem value="Full Back">Full Back</SelectItem><SelectItem value="Defensive Midfielder">Defensive Midfielder</SelectItem><SelectItem value="Central Midfielder">Central Midfielder</SelectItem><SelectItem value="Attacking Midfielder">Attacking Midfielder</SelectItem><SelectItem value="Winger">Winger</SelectItem><SelectItem value="Centre Forward">Centre Forward</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label htmlFor="footFilter">Preferred Foot</Label><Select value={filters.foot} onValueChange={(value) => handleFilterChange('foot', value)}><SelectTrigger id="footFilter"><SelectValue placeholder="Any Foot" /></SelectTrigger><SelectContent><SelectItem value="all">Any Foot</SelectItem><SelectItem value="Left">Left</SelectItem><SelectItem value="Right">Right</SelectItem><SelectItem value="Both">Both</SelectItem></SelectContent></Select></div>
            <div className="flex gap-2 items-end space-y-1"><div className="flex-1"><Label htmlFor="minHeight">Min Height (cm)</Label><Input id="minHeight" type="number" placeholder="170" value={filters.minHeight} onChange={(e) => handleFilterChange('minHeight', e.target.value)} /></div><div className="flex-1"><Label htmlFor="maxHeight">Max Height (cm)</Label><Input id="maxHeight" type="number" placeholder="190" value={filters.maxHeight} onChange={(e) => handleFilterChange('maxHeight', e.target.value)} /></div></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>League Players ({loading ? '...' : totalCount})</CardTitle><CardDescription>Browse players matching your criteria. Click star to watchlist.</CardDescription></CardHeader>
          <CardContent>
            {loading && <div className="flex justify-center items-center py-20 h-64"><Loader2 className="h-10 w-10 animate-spin text-[#31348D]" /></div>}
            {error && <Alert variant="destructive" className="my-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
            {!loading && !error && players.length === 0 && <p className="text-center text-muted-foreground py-10">No players found matching the current filters.</p>}
            {!loading && !error && players.length > 0 && (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="cursor-pointer sticky left-0 bg-background z-10 w-[200px] min-w-[200px]" onClick={() => handleSort('name')}>Name <ArrowUpDown className="inline h-4 w-4 ml-1" /></TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort('club_name')}>Club <ArrowUpDown className="inline h-4 w-4 ml-1" /></TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort('player_pos')}>Position <ArrowUpDown className="inline h-4 w-4 ml-1" /></TableHead>
                          <TableHead className="cursor-pointer text-center" onClick={() => handleSort('age')}>Age <ArrowUpDown className="inline h-4 w-4 ml-1" /></TableHead>
                          <TableHead className="cursor-pointer text-center" onClick={() => handleSort('height')}>Height <ArrowUpDown className="inline h-4 w-4 ml-1" /></TableHead>
                          <TableHead className="cursor-pointer text-center" onClick={() => handleSort('foot')}>Foot <ArrowUpDown className="inline h-4 w-4 ml-1" /></TableHead>
                          <TableHead className="cursor-pointer text-center" onClick={() => handleSort('contract_expiry')}>Contract Ends <ArrowUpDown className="inline h-4 w-4 ml-1" /></TableHead>
                          <TableHead className="cursor-pointer text-center" onClick={() => handleSort('avg_percentile')}>FootyLabs Score <ArrowUpDown className="inline h-4 w-4 ml-1" /></TableHead>
                          <TableHead className="cursor-pointer text-center" onClick={() => handleSort('listing_status')}>Listing Status <ArrowUpDown className="inline h-4 w-4 ml-1" /></TableHead>
                          <TableHead className="text-center sticky right-0 bg-background z-10 w-[80px]">Watch</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {players.map((player) => {
                          const isPlayerInWatchlist = watchlistPlayerIds.has(player.player_id!);
                          const isTogglingThisPlayer = togglingWatchlist.has(player.player_id!);
                          return (
                              <TableRow
                                  key={player.wyscout_player_id?.toString() || player.player_id?.toString()}
                                  className="hover:bg-gray-50"
                              >
                                <TableCell
                                    className="font-medium sticky left-0 bg-inherit group-hover:bg-gray-50 z-10 w-[200px] min-w-[200px] cursor-pointer"
                                    onClick={() => handlePlayerRowClick(player)}
                                >
                                  {player.name || 'N/A'}
                                </TableCell>
                                <TableCell className="cursor-pointer" onClick={() => handlePlayerRowClick(player)}>{player.club_name || 'N/A'}</TableCell>
                                <TableCell className="cursor-pointer" onClick={() => handlePlayerRowClick(player)}><Badge variant="outline">{player.player_pos || 'N/A'}</Badge></TableCell>
                                <TableCell className="text-center cursor-pointer" onClick={() => handlePlayerRowClick(player)}>{player.age ?? 'N/A'}</TableCell>
                                <TableCell className="text-center cursor-pointer" onClick={() => handlePlayerRowClick(player)}>{player.height ? `${player.height} cm` : 'N/A'}</TableCell>
                                <TableCell className="text-center cursor-pointer" onClick={() => handlePlayerRowClick(player)}>{formatFootDisplay(player.foot)}</TableCell>
                                <TableCell className="text-center cursor-pointer" onClick={() => handlePlayerRowClick(player)}>{player.contract_expiry ? new Date(player.contract_expiry).toLocaleDateString() : 'N/A'}</TableCell>
                                <TableCell className={`text-center font-medium ${getScoreColor(player.avg_percentile)} cursor-pointer`} onClick={() => handlePlayerRowClick(player)}>{formatFootylabsScore(player.avg_percentile)}</TableCell>
                                <TableCell className="text-center cursor-pointer" onClick={() => handlePlayerRowClick(player)}>
                                  {player.listing_status === "Not Listed" ? (
                                      <Badge variant="outline" className="text-muted-foreground">Not Listed</Badge>
                                  ) : ( <Badge variant={player.listing_status === "Transfer" ? "default" : "secondary"} className={ player.listing_status === "Transfer" ? "bg-[#31348D] text-white" : player.listing_status === "Loan" ? "bg-orange-500 text-white" : "" }> {player.listing_status} </Badge> )}
                                </TableCell>
                                <TableCell className="text-center sticky right-0 bg-inherit group-hover:bg-gray-50 z-10 w-[80px]">
                                  <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 p-0 hover:bg-accent"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleWatchlist(player);
                                      }}
                                      disabled={isTogglingThisPlayer}
                                      title={isPlayerInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                                  >
                                    {isTogglingThisPlayer ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Star
                                            className={`h-5 w-5 transition-colors ${
                                                isPlayerInWatchlist
                                                    ? "fill-yellow-400 text-yellow-500"
                                                    : "text-gray-400 hover:text-yellow-400"
                                            }`}
                                        />
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {totalPages > 1 && ( <Pagination className="mt-6">  <PaginationContent> <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(prev => Math.max(1, prev - 1)); }} aria-disabled={currentPage === 1} tabIndex={currentPage === 1 ? -1 : undefined} className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}/></PaginationItem> {paginationItems} <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(prev => Math.min(totalPages, prev + 1)); }} aria-disabled={currentPage === totalPages} tabIndex={currentPage === totalPages ? -1 : undefined} className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}/></PaginationItem> </PaginationContent> </Pagination> )}
                </>
            )}
          </CardContent>
        </Card>

        <PlayerDetailModal
            isOpen={!!selectedPlayer}
            onClose={handleCloseModal}
            player={selectedPlayer ? {
              id: selectedPlayer.player_id!, // Use player_id from RPC which is players.id
              name: selectedPlayer.name,
              position: selectedPlayer.player_pos,
              player_pos: selectedPlayer.player_pos,
              stats: selectedPlayer.stats,
              club_id: selectedPlayer.club_id,
              wyscout_player_id: selectedPlayer.wyscout_player_id,
              player_league_name: selectedPlayer.player_league_name
            } : null}
        />
      </div>
  );
}