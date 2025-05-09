// components/dashboard/player-stats.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from '@/lib/supabase/database.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, AlertCircle, ArrowUpDown, X, Info } from "lucide-react"; // Removed Edit, Trash2
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
// Import the shared modal
import PlayerDetailModal from '@/components/common/player-detail-modal'; // Adjust path if needed
import type { PlayerDataForModal, PlayerStatsJSON as ModalPlayerStatsJSON } from '@/components/common/player-detail-modal'; // Import types from modal

// --- Type Definitions ---

// Type for data returned by `get_latest_players_for_club` RPC call
// This should directly use or match the generated type
type LatestPlayerFromRPC = Database['public']['Functions']['get_latest_players_for_club']['Returns'][number];

// Display type for the table in this component
// It needs to be compatible with PlayerDataForModal for the modal prop
export type PlayerDisplayData = {
  id: number; // players.id (PK of the specific row from get_latest_players_for_club)
  name: string;
  position: string; // This component will use the 'player_pos' alias as 'position'
  age: string | null;
  goals: string;
  xG: string;
  assists: string | null;
  minutes: string;
  contractEnds: string;
  footylabsScore: string | null; // Formatted score
  listingStatus: string | null;
  stats?: ModalPlayerStatsJSON | null; // Raw stats blob for the modal
  wyscout_player_id?: number | string | null;
  club_id?: number | null; // Add if needed by modal's suggest recruitment
};


// Helper functions (formatFootylabsScore, getScoreColor - can also be moved to utils)
const formatFootylabsScore = (score: number | string | null | undefined): string => {
  if (score === null || score === undefined || score === "N.A") return "N/A";
  const numScore = typeof score === "string" ? Number.parseFloat(score) : score;
  if (isNaN(numScore)) return "N/A";
  return (numScore * 10).toFixed(1); // Assuming score is 0-1 percentile
};

const getScoreColor = (score: number | string | null | undefined): string => {
  if (score === null || score === undefined || score === "N/A") return "text-muted-foreground";

  // Ensure the score is parsed correctly regardless of its format
  const numScore = typeof score === "string" ? parseFloat(score) : score;
  if (isNaN(numScore)) return "text-muted-foreground";

  // Scale the score to a percentage
  const scaledScore = numScore;
  if (scaledScore <= 3.33) return "text-red-600 font-medium";
  if (scaledScore <= 6.66) return "text-amber-500 font-medium";
  return "text-green-600 font-medium";
};




export default function PlayerStats({ clubId }: { clubId?: number }) {
  const [players, setPlayers] = useState<PlayerDisplayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [sortColumn, setSortColumn] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDisplayData | null>(null);
  // Removed playerComparisonData, clubData, userEmail, suggestLoading as they are handled by/passed to modal if needed
  const supabase = createClient();
  const router = useRouter();

  const fetchData = useCallback(async () => {
    if (!clubId || !supabase) {
      setLoading(false);
      if (!clubId) console.log("PlayerStats: No clubId, skipping fetch.");
      if (!supabase) console.error("PlayerStats: Supabase client not available.");
      return;
    }
    setLoading(true); setError(null);

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_latest_players_for_club", { p_club_id: clubId });

      if (rpcError) throw rpcError;
      console.log("PlayerStats: Fetched data via RPC:", rpcData);

      const latestPlayersFromDB = rpcData as LatestPlayerFromRPC[] | null;

      if (latestPlayersFromDB) {
        const displayData: PlayerDisplayData[] = latestPlayersFromDB.map((lp) => {
          const s = lp.stats as ModalPlayerStatsJSON | null; // Use ModalPlayerStatsJSON
          return {
            id: lp.id,
            name: lp.name ?? "Unknown Player",
            position: lp.player_pos ?? "Unknown", // Use player_pos from RPC for 'position'
            age: s?.["Age"] != null ? String(s["Age"]) : null,
            goals: s?.["Goals"] != null ? String(s["Goals"]) : "0",
            xG: s?.["xG"] != null ? String(s["xG"]) : "0",
            assists: s?.["Assists"] != null ? String(s["Assists"]) : null,
            minutes: s?.["Minutes played"] != null ? String(s["Minutes played"]) : "0",
            contractEnds: s?.["Contract expires"] != null ? String(s["Contract expires"]) : "Unknown",
            footylabsScore: s?.["avg_percentile"] != null ? formatFootylabsScore(Number(s["avg_percentile"])) : "N/A", // Format here
            listingStatus: lp.listing_status,
            stats: s, // Pass the raw stats blob to the modal
            wyscout_player_id: lp.wyscout_player_id,
            club_id: lp.club_id, // Pass club_id for "Suggest Recruitment" if needed
          };
        });
        setPlayers(displayData);
      } else {
        setPlayers([]);
      }
    } catch (err: any) {
      console.error("Error fetching players data in PlayerStats:", err);
      setError(`Failed to fetch players: ${err.message || 'Unknown error'}`);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (column: string) => {
    if (sortColumn === column) setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    else { setSortColumn(column); setSortDirection("asc"); }
  };

  const handlePlayerClick = (player: PlayerDisplayData) => {
    setSelectedPlayer(player); // This will open the modal
  };

  const handleCloseDialog = () => {
    setSelectedPlayer(null);
  };

  const filteredPlayers = players
      .filter((player) => {
        const nameMatch = player.name.toLowerCase().includes(search.toLowerCase());
        const positionMatch = positionFilter === "all" || player.position.toLowerCase() === positionFilter.toLowerCase();
        return nameMatch && positionMatch;
      })
      .sort((a, b) => {
        if (sortColumn === "name") return sortDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        if (sortColumn === "position") return sortDirection === "asc" ? a.position.localeCompare(b.position) : b.position.localeCompare(a.position);
        if (sortColumn === "listingStatus") {
          const statusA = a.listingStatus || ""; const statusB = b.listingStatus || "";
          return sortDirection === "asc" ? statusA.localeCompare(statusB) : statusB.localeCompare(statusA);
        }

        // Special case for Footylabs Score
        if (sortColumn === "footylabsScore") {
          const aScore = a.footylabsScore === "N/A" ? -1 : parseFloat(String(a.footylabsScore));
          const bScore = b.footylabsScore === "N/A" ? -1 : parseFloat(String(b.footylabsScore));

          if (isNaN(aScore)) return 1;
          if (isNaN(bScore)) return -1;

          return sortDirection === "asc" ? aScore - bScore : bScore - aScore;
        }

        // Generic sort for potentially numeric or string values
        const aVal = a[sortColumn as keyof PlayerDisplayData];
        const bVal = b[sortColumn as keyof PlayerDisplayData];

        // Handle numbers specifically for numeric sort
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        // Fallback to string compare, handling nulls
        const valA = String(aVal ?? '').toLowerCase();
        const valB = String(bVal ?? '').toLowerCase();
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });

  return (
      <>
        <Card className="border-0 shadow-md">
          <CardHeader className="border-b bg-gray-100">
            <CardTitle className="text-[#31348D]">Player Statistics</CardTitle>
            <CardDescription className="text-black/70">
              Latest performance metrics for all players in the current season
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-4">
              {/* Filters */}
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search players..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by position" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    <SelectItem value="Goalkeeper">Goalkeeper</SelectItem><SelectItem value="Centre Back">Centre Back</SelectItem><SelectItem value="Full Back">Full Back</SelectItem><SelectItem value="Defensive Midfielder">Defensive Midfielder</SelectItem><SelectItem value="Central Midfielder">Central Midfielder</SelectItem><SelectItem value="Attacking Midfielder">Attacking Midfielder</SelectItem><SelectItem value="Winger">Winger</SelectItem><SelectItem value="Centre Forward">Centre Forward</SelectItem><SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && <Alert variant="destructive"><AlertCircle className="h-5 w-5" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

              <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-gray-100">
                    <TableRow>
                      <TableHead className="cursor-pointer text-black font-medium" onClick={() => handleSort("name")}><div className="flex items-center">Name <ArrowUpDown className="ml-1 h-4 w-4" /></div></TableHead>
                      <TableHead className="cursor-pointer text-black font-medium" onClick={() => handleSort("position")}><div className="flex items-center">Position <ArrowUpDown className="ml-1 h-4 w-4" /></div></TableHead>
                      <TableHead className="cursor-pointer text-center text-black font-medium" onClick={() => handleSort("age")}><div className="flex justify-center items-center gap-1"><span>Age</span><ArrowUpDown className="h-4 w-4" /></div></TableHead>
                      <TableHead className="cursor-pointer text-center text-black font-medium" onClick={() => handleSort("goals")}><div className="flex justify-center items-center gap-1"><span>Goals</span><ArrowUpDown className="h-4 w-4" /></div></TableHead>
                      <TableHead className="cursor-pointer text-center text-black font-medium" onClick={() => handleSort("xG")}><div className="flex justify-center items-center gap-1"><span>xG</span><ArrowUpDown className="h-4 w-4" /></div></TableHead>
                      <TableHead className="cursor-pointer text-center text-black font-medium" onClick={() => handleSort("assists")}><div className="flex justify-center items-center gap-1"><span>Assists</span><ArrowUpDown className="h-4 w-4" /></div></TableHead>
                      <TableHead className="cursor-pointer text-center text-black font-medium" onClick={() => handleSort("minutes")}><div className="flex justify-center items-center gap-1"><span>Minutes</span><ArrowUpDown className="h-4 w-4" /></div></TableHead>
                      <TableHead className="cursor-pointer text-center text-black font-medium" onClick={() => handleSort("contractEnds")}><div className="flex justify-center items-center gap-1"><span>Contract Ends</span><ArrowUpDown className="h-4 w-4" /></div></TableHead>
                      <TableHead className="cursor-pointer text-center text-black font-medium" onClick={() => handleSort("footylabsScore")}><div className="flex justify-center items-center gap-1"><span>FootyLabs Score</span><ArrowUpDown className="h-4 w-4" /></div></TableHead>
                      <TableHead className="cursor-pointer text-center text-black font-medium" onClick={() => handleSort("listingStatus")}><div className="inline-flex items-center justify-center gap-1"><span>Listing Status</span><ArrowUpDown className="h-4 w-4" /></div></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && (<TableRow><TableCell colSpan={10} className="h-24 text-center"><div className="flex justify-center items-center"><Loader2 className="mr-2 h-6 w-6 animate-spin" />Loading players...</div></TableCell></TableRow>)}
                    {!loading && filteredPlayers.map((player) => (
                        <TableRow key={player.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handlePlayerClick(player)}>
                          <TableCell className="font-medium">{player.name}</TableCell>
                          <TableCell><Badge variant="outline" className="bg-[#31348D]/10 text-[#31348D] border-[#31348D]/20">{player.position}</Badge></TableCell>
                          <TableCell className="text-center">{player.age ?? 'N/A'}</TableCell>
                          <TableCell className="text-center">{player.goals}</TableCell>
                          <TableCell className="text-center">{player.xG}</TableCell>
                          <TableCell className="text-center">{player.assists ?? '-'}</TableCell>
                          <TableCell className="text-center">{player.minutes}</TableCell>
                          <TableCell className="text-center">{player.contractEnds}</TableCell>
                          <TableCell className={`text-center font-medium ${getScoreColor(player.footylabsScore)}`}>{player.footylabsScore}</TableCell>
                          <TableCell className="text-center">
                            {player.listingStatus === "Not Listed" ? (
                                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/marketplace?tab=my-postings&action=create&wyscout_id=${player.wyscout_player_id}`); }}> List Player </Button>
                            ) : (
                                <Badge variant={ player.listingStatus === "Transfer" ? "default" : player.listingStatus === "Loan" ? "secondary" : "outline" } className={ player.listingStatus === "Transfer" ? "bg-[#31348D] text-white" : player.listingStatus === "Loan" ? "bg-orange-500 text-white" : "" }>
                                  {player.listingStatus}
                                </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                    ))}
                    {!loading && players.length === 0 && !error && (<TableRow><TableCell colSpan={10} className="h-24 text-center">No players found for this club.</TableCell></TableRow>)}
                    {!loading && players.length > 0 && filteredPlayers.length === 0 && !error && (<TableRow><TableCell colSpan={10} className="h-24 text-center">No players match the current filter.</TableCell></TableRow>)}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Use the shared PlayerDetailModal */}
        <PlayerDetailModal
            isOpen={!!selectedPlayer}
            onClose={handleCloseDialog}
            // Pass the selectedPlayer data, ensuring its structure matches PlayerDataForModal
            player={selectedPlayer ? {
              id: selectedPlayer.id,
              name: selectedPlayer.name,
              position: selectedPlayer.position, // This component uses 'position'
              stats: selectedPlayer.stats ?? null,
              club_id: clubId, // Pass clubId for context if needed by modal's suggest button
              wyscout_player_id: selectedPlayer.wyscout_player_id
            } : null}
        />
      </>
  );
}