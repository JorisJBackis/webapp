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
  return foot;
};

// --- Main Scouting Component ---
export default function LeaguePlayerBrowser({ initialUserClubId }: { initialUserClubId: number | null }) {
  const [allPlayers, setAllPlayers] = useState<ScoutingPlayer[]>([]); // Store all fetched players
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

  const [watchlistPlayerIds, setWatchlistPlayerIds] = useState<Set<number>>(new Set());
  const [togglingWatchlist, setTogglingWatchlist] = useState<Set<number>>(new Set());

  const fetchWatchlistStatus = useCallback(async () => {
    if (!initialUserClubId || !supabase) return;
    try {
      const { data, error: watchlistError } = await supabase.from("watchlist").select("player_id").eq("club_id", initialUserClubId);
      if (watchlistError) throw watchlistError;
      setWatchlistPlayerIds(new Set(data?.map((item) => item.player_id) || []));
    } catch (err) {
      console.error("Error fetching watchlist status:", err);
    }
  }, [initialUserClubId, supabase]);

  const toggleWatchlist = async (player: ScoutingPlayer) => {
    if (!initialUserClubId || !supabase || player.player_id === null || player.player_id === undefined) {
      toast({ title: "Error", description: "Cannot update watchlist. Missing info.", variant: "destructive" });
      return;
    }
    const playerIdToToggle = player.player_id;
    const playerName = player.name || "Player";
    const isInWatchlist = watchlistPlayerIds.has(playerIdToToggle);

    setTogglingWatchlist(prev => new Set(prev).add(playerIdToToggle));
    try {
      if (isInWatchlist) {
        await supabase.from("watchlist").delete().match({ club_id: initialUserClubId, player_id: playerIdToToggle });
        setWatchlistPlayerIds(prev => { const newSet = new Set(prev); newSet.delete(playerIdToToggle); return newSet; });
        toast({ title: "Removed from Watchlist", description: `${playerName} removed.` });
      } else {
        await supabase.from("watchlist").insert({ club_id: initialUserClubId, player_id: playerIdToToggle });
        setWatchlistPlayerIds(prev => new Set(prev).add(playerIdToToggle));
        toast({ title: "Added to Watchlist", description: `${playerName} added.` });
      }
    } catch (err: any) {
      toast({ title: "Watchlist Error", description: `Could not update: ${err.message}`, variant: "destructive" });
    } finally {
      setTogglingWatchlist(prev => { const newSet = new Set(prev); newSet.delete(playerIdToToggle); return newSet; });
    }
  };

  useEffect(() => {
    const fetchLeagues = async () => {
      if (!supabase) return;
      const { data, error: leagueError } = await supabase.from('clubs').select('league').neq('league', null);
      if (leagueError) { console.error("Error fetching leagues:", leagueError); }
      else if (data) {
        setLeagues([...new Set(data.map(item => item.league).filter(Boolean))] as string[]);
      }
    };
    fetchLeagues();
    fetchWatchlistStatus();
  }, [supabase, fetchWatchlistStatus]);

  useEffect(() => {
    const fetchAllData = async () => {
      if (initialUserClubId === null) { setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        if (!supabase) return;
        const response: PostgrestSingleResponse<ScoutingPlayer[]> = await supabase.rpc(
            'get_scouting_players', { p_requesting_club_id: initialUserClubId, p_limit: 5000 }
        );
        if (response.error) throw response.error;
        setAllPlayers(response.data || []);
      } catch (err: any) {
        setError(`Could not load player data: ${err.message || 'Unknown RPC error'}`);
        setAllPlayers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [initialUserClubId, supabase]);

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setCurrentPage(1);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) { setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc')); }
    else { setSortColumn(column); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = allPlayers.filter(player => {
      const nameMatch = !filters.name || (player.name && player.name.toLowerCase().includes(filters.name.toLowerCase()));
      const leagueMatch = filters.league === 'all' || player.player_league_name === filters.league;
      const positionMatch = filters.position === 'all' || player.player_pos === filters.position;
      const footMatch = filters.foot === 'all' || (player.foot && player.foot.toLowerCase() === filters.foot);
      const minHeightMatch = !filters.minHeight || (player.height && player.height >= parseInt(filters.minHeight, 10));
      const maxHeightMatch = !filters.maxHeight || (player.height && player.height <= parseInt(filters.maxHeight, 10));
      return nameMatch && leagueMatch && positionMatch && footMatch && minHeightMatch && maxHeightMatch;
    });

    filtered.sort((a, b) => {
      let aVal = a[sortColumn as keyof ScoutingPlayer] as any;
      let bVal = b[sortColumn as keyof ScoutingPlayer] as any;

      const orderFoot = { 'left': 1, 'right': 2, 'both': 3 };
      const orderListing = { 'Loan': 1, 'Transfer': 2, 'Not Listed': 3 };

      if (sortColumn === 'foot') {
        aVal = a.foot ? orderFoot[a.foot.toLowerCase() as keyof typeof orderFoot] : 99;
        bVal = b.foot ? orderFoot[b.foot.toLowerCase() as keyof typeof orderFoot] : 99;
      }
      if (sortColumn === 'listing_status') {
        aVal = a.listing_status ? orderListing[a.listing_status as keyof typeof orderListing] : 99;
        bVal = b.listing_status ? orderListing[b.listing_status as keyof typeof orderListing] : 99;
      }

      const aIsNull = aVal === null || aVal === undefined || aVal === 'N/A';
      const bIsNull = bVal === null || bVal === undefined || bVal === 'N/A';

      if (aIsNull) return 1;
      if (bIsNull) return -1;

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    return filtered;
  }, [allPlayers, filters, sortColumn, sortDirection]);

  const paginatedPlayers = useMemo(() => {
    const offset = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedPlayers.slice(offset, offset + itemsPerPage);
  }, [filteredAndSortedPlayers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedPlayers.length / itemsPerPage);

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
      if (currentPage < totalPages - halfMaxPages) { items.push(<PaginationEllipsis key="end-ellipsis" />); }
      items.push( <PaginationItem key={totalPages}> <PaginationLink href="#" isActive={totalPages === currentPage} onClick={(e) => { e.preventDefault(); setCurrentPage(totalPages); }}> {totalPages} </PaginationLink> </PaginationItem> );
    } return items;
  }, [currentPage, totalPages]);

  const handlePlayerRowClick = (player: ScoutingPlayer) => { setSelectedPlayer(player); };
  const handleCloseModal = () => { setSelectedPlayer(null); };

  return (
      <div className="space-y-6">
        <Card className="shadow-md">
          <CardHeader className="border-b bg-muted">
            <CardTitle className="text-primary">League Players ({loading ? '...' : filteredAndSortedPlayers.length})</CardTitle>
            <CardDescription className="text-muted-foreground">Browse players matching your criteria. Click star to watchlist.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
                <div className="space-y-1"><Label htmlFor="playerNameSearch">Player Name</Label><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="playerNameSearch" placeholder="Search..." className="pl-8" value={filters.name} onChange={(e) => handleFilterChange('name', e.target.value)} /></div></div>
                <div className="space-y-1"><Label htmlFor="leagueFilter">League</Label><Select value={filters.league} onValueChange={(value) => handleFilterChange('league', value)}><SelectTrigger id="leagueFilter"><SelectValue placeholder="Any League" /></SelectTrigger><SelectContent><SelectItem value="all">All Leagues</SelectItem>{leagues.map(league => (<SelectItem key={league} value={league}>{league}</SelectItem>))}</SelectContent></Select></div>
                <div className="space-y-1"><Label htmlFor="positionFilter">Position</Label><Select value={filters.position} onValueChange={(value) => handleFilterChange('position', value)}><SelectTrigger id="positionFilter"><SelectValue placeholder="Any Position" /></SelectTrigger><SelectContent><SelectItem value="all">All Positions</SelectItem><SelectItem value="Goalkeeper">Goalkeeper</SelectItem><SelectItem value="Centre Back">Centre Back</SelectItem><SelectItem value="Full Back">Full Back</SelectItem><SelectItem value="Defensive Midfielder">Defensive Midfielder</SelectItem><SelectItem value="Central Midfielder">Central Midfielder</SelectItem><SelectItem value="Attacking Midfielder">Attacking Midfielder</SelectItem><SelectItem value="Winger">Winger</SelectItem><SelectItem value="Centre Forward">Centre Forward</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
                <div className="space-y-1"><Label htmlFor="footFilter">Preferred Foot</Label><Select value={filters.foot} onValueChange={(value) => handleFilterChange('foot', value)}><SelectTrigger id="footFilter"><SelectValue placeholder="Any Foot" /></SelectTrigger><SelectContent><SelectItem value="all">Any Foot</SelectItem><SelectItem value="left">Left</SelectItem><SelectItem value="right">Right</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent></Select></div>
                <div className="flex gap-2 items-end"><div className="flex-1"><Label htmlFor="minHeight">Height (cm)</Label><Input id="minHeight" type="number" placeholder="Min" value={filters.minHeight} onChange={(e) => handleFilterChange('minHeight', e.target.value)} /></div><div className="flex-1"><Label className="sr-only" htmlFor="maxHeight">Max Height</Label><Input id="maxHeight" type="number" placeholder="Max" value={filters.maxHeight} onChange={(e) => handleFilterChange('maxHeight', e.target.value)} /></div></div>
              </div>

              {loading && <div className="flex justify-center items-center py-20 h-64"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}
              {error && <Alert variant="destructive" className="my-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
              {!loading && !error && allPlayers.length > 0 && paginatedPlayers.length === 0 && <p className="text-center text-muted-foreground py-10">No players match the current filters.</p>}

              {!loading && !error && paginatedPlayers.length > 0 && (
                  <>
                    <div className="rounded-md border mt-4 relative overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="cursor-pointer text-muted-foreground font-medium hover:text-primary/90" onClick={() => handleSort('name')}><div className="flex items-center">Name <ArrowUpDown className="inline h-4 w-4 ml-1" /></div></TableHead>
                            <TableHead className="cursor-pointer text-muted-foreground font-medium hover:text-primary/90" onClick={() => handleSort('club_name')}><div className="flex items-center">Club <ArrowUpDown className="inline h-4 w-4 ml-1" /></div></TableHead>
                            <TableHead className="cursor-pointer text-muted-foreground font-medium hover:text-primary/90" onClick={() => handleSort('player_pos')}><div className="flex items-center">Position <ArrowUpDown className="inline h-4 w-4 ml-1" /></div></TableHead>
                            <TableHead className="cursor-pointer text-center text-muted-foreground font-medium hover:text-primary/90" onClick={() => handleSort('age')}><div className="flex justify-center items-center gap-1"><span>Age</span><ArrowUpDown className="h-4 w-4" /></div></TableHead>
                            <TableHead className="cursor-pointer text-center text-muted-foreground font-medium hover:text-primary/90" onClick={() => handleSort('height')}><div className="flex justify-center items-center gap-1"><span>Height</span><ArrowUpDown className="h-4 w-4" /></div></TableHead>
                            <TableHead className="cursor-pointer text-center text-muted-foreground font-medium hover:text-primary/90" onClick={() => handleSort('foot')}><div className="flex justify-center items-center gap-1"><span>Foot</span><ArrowUpDown className="h-4 w-4" /></div></TableHead>
                            <TableHead className="cursor-pointer text-center text-muted-foreground font-medium hover:text-primary/90" onClick={() => handleSort('contract_expiry')}><div className="flex justify-center items-center gap-1"><span>Contract Ends</span><ArrowUpDown className="h-4 w-4" /></div></TableHead>
                            <TableHead className="cursor-pointer text-center text-muted-foreground font-medium hover:text-primary/90" onClick={() => handleSort('avg_percentile')}><div className="flex justify-center items-center gap-1"><span>FootyLabs Score</span><ArrowUpDown className="h-4 w-4" /></div></TableHead>
                            <TableHead className="cursor-pointer text-center text-muted-foreground font-medium hover:text-primary/90" onClick={() => handleSort('listing_status')}><div className="inline-flex items-center justify-center gap-1"><span>Listing Status</span><ArrowUpDown className="h-4 w-4" /></div></TableHead>
                            <TableHead className="text-center text-muted-foreground font-medium">Watch</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedPlayers.map((player) => {
                            const isPlayerInWatchlist = watchlistPlayerIds.has(player.player_id!);
                            const isTogglingThisPlayer = togglingWatchlist.has(player.player_id!);
                            return (
                                <TableRow key={player.player_id?.toString()} className="hover:bg-muted/50">
                                  <TableCell className="font-medium cursor-pointer" onClick={() => handlePlayerRowClick(player)}>{player.name || 'N/A'}</TableCell>
                                  <TableCell className="cursor-pointer" onClick={() => handlePlayerRowClick(player)}>{player.club_name || 'N/A'}</TableCell>
                                  <TableCell className="cursor-pointer whitespace-nowrap" onClick={() => handlePlayerRowClick(player)}><Badge variant="outline" className="bg-primary/10 text-primary border-[#31348D]/20">{player.player_pos || 'N/A'}</Badge></TableCell>
                                  <TableCell className="text-center cursor-pointer" onClick={() => handlePlayerRowClick(player)}>{player.age ?? 'N/A'}</TableCell>
                                  <TableCell className="text-center cursor-pointer" onClick={() => handlePlayerRowClick(player)}>{player.height ? `${player.height} cm` : 'N/A'}</TableCell>
                                  <TableCell className="text-center cursor-pointer" onClick={() => handlePlayerRowClick(player)}>{formatFootDisplay(player.foot)}</TableCell>
                                  <TableCell className="text-center cursor-pointer" onClick={() => handlePlayerRowClick(player)}>{player.contract_expiry ? new Date(player.contract_expiry).toLocaleDateString() : 'N/A'}</TableCell>
                                  <TableCell className={`text-center font-medium ${getScoreColor(player.avg_percentile)} cursor-pointer`} onClick={() => handlePlayerRowClick(player)}>{formatFootylabsScore(player.avg_percentile)}</TableCell>
                                  <TableCell className="text-center cursor-pointer" onClick={() => handlePlayerRowClick(player)}>{player.listing_status === "Not Listed" ? (<Badge variant="outline" className="text-muted-foreground">Not Listed</Badge>) : ( <Badge variant={player.listing_status === "Transfer" ? "default" : "secondary"} className={ player.listing_status === "Transfer" ? "bg-primary text-primary-foreground" : "bg-orange-500 text-primary-foreground" }> {player.listing_status} </Badge> )}</TableCell>
                                  <TableCell className="text-center">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0 hover:bg-accent" onClick={(e) => { e.stopPropagation(); toggleWatchlist(player); }} disabled={isTogglingThisPlayer} title={isPlayerInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}>
                                      {isTogglingThisPlayer ? (<Loader2 className="h-4 w-4 animate-spin" />) : (<Star className={`h-5 w-5 transition-colors ${ isPlayerInWatchlist ? "fill-yellow-400 text-yellow-500" : "text-gray-400 hover:text-yellow-400"}`} />)}
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
            </div>
          </CardContent>
        </Card>

        <PlayerDetailModal
            isOpen={!!selectedPlayer}
            onClose={handleCloseModal}
            player={selectedPlayer ? {
              id: selectedPlayer.player_id!,
              name: selectedPlayer.name,
              position: selectedPlayer.player_pos,
              player_pos: selectedPlayer.player_pos,
              stats: selectedPlayer.stats as { [key: string]: string | number | boolean | null } | null,
              club_id: selectedPlayer.club_id,
              wyscout_player_id: selectedPlayer.wyscout_player_id,
              player_league_name: selectedPlayer.player_league_name
            } : null}
        />
      </div>
  );
}