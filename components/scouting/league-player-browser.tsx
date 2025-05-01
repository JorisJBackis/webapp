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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Search, ArrowUpDown, Info, SlidersHorizontal, Filter, X } from 'lucide-react';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip as RechartsTooltip } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
// import { DatePickerWithRange } from "@/components/ui/date-range-picker"; // Assuming not yet implemented
// import type { DateRange } from "react-day-picker";

// --- Type Definitions ---

// Type matching the RETURNS TABLE of the get_scouting_players function
// Ensure this matches your generated database.types.ts EXACTLY
type ScoutingPlayer = Database['public']['Functions']['get_scouting_players']['Returns'][number];

// Type for Player Stats JSON blob (more specific, reuse if possible)
export type PlayerStatsJSON = {
    Age?: number | null;
    Goals?: number | null;
    Assists?: number | null;
    'Minutes played'?: number | null;
    avg_percentile?: number | null; // Footylabs Score
    // Add keys for percentile metrics used in radar chart
    'Conceded goals per 90_percentile'?: number | null;
    'Accurate passes, %_percentile'?: number | null;
    'xG against per 90_percentile'?: number | null;
    'Prevented goals per 90_percentile'?: number | null;
    'Save rate, %_percentile'?: number | null;
    'Exits per 90_percentile'?: number | null;
    'Successful defensive actions per 90_percentile'?: number | null;
    'Defensive duels won, %_percentile'?: number | null;
    'Accurate crosses, %_percentile'?: number | null;
    // 'Accurate passes, %_percentile'?: number | null; // Already exists above
    'Key passes per 90_percentile'?: number | null;
    'xA per 90_percentile'?: number | null;
    'Aerial duels won, %_percentile'?: number | null;
    'Accurate passes to final third per 90_percentile'?: number | null;
    'Interceptions per 90_percentile'?: number | null;
    'Sliding tackles per 90_percentile'?: number | null;
    'Accurate passes to penalty area per 90_percentile'?: number | null;
    'Accurate progressive passes per 90_percentile'?: number | null;
    'Accurate smart passes per 90_percentile'?: number | null;
    'Goals per 90_percentile'?: number | null;
    'Successful dribbles per 90_percentile'?: number | null;
    'Non-penalty goals per 90_percentile'?: number | null;
    'xG per 90_percentile'?: number | null;
    'Shots on target per 90_percentile'?: number | null;
    'Assists per 90_percentile'?: number | null;
    // 'xA per 90_percentile'?: number | null; // Already exists above
    'Touches in box per 90_percentile'?: number | null;
    'Offensive duels won, %_percentile'?: number | null;
    // Add other percentile keys as needed
} & {
    [key: string]: number | string | boolean | null; // Allow other string keys
};

// Key metrics definition (same as PlayerStats.tsx)
const sixMetricsWithLegend: { [position: string]: string[] } = { // Just the percentile keys
    'Goalkeeper': [ 'Conceded goals per 90_percentile', 'Accurate passes, %_percentile', 'xG against per 90_percentile', 'Prevented goals per 90_percentile', 'Save rate, %_percentile', 'Exits per 90_percentile' ],
    'Full Back': [ 'Successful defensive actions per 90_percentile', 'Defensive duels won, %_percentile', 'Accurate crosses, %_percentile', 'Accurate passes, %_percentile', 'Key passes per 90_percentile', 'xA per 90_percentile' ],
    'Centre Back': [ 'Successful defensive actions per 90_percentile', 'Defensive duels won, %_percentile', 'Aerial duels won, %_percentile', 'Accurate passes to final third per 90_percentile', 'Accurate passes, %_percentile', 'Interceptions per 90_percentile' ],
    'Defensive Midfielder': [ 'Interceptions per 90_percentile', 'Sliding tackles per 90_percentile', 'Aerial duels won, %_percentile', 'Accurate passes to penalty area per 90_percentile', 'Accurate passes to final third per 90_percentile', 'Accurate progressive passes per 90_percentile' ],
    'Central Midfielder': [ 'Successful defensive actions per 90_percentile', 'Defensive duels won, %_percentile', 'Accurate passes, %_percentile', 'Accurate passes to final third per 90_percentile', 'Key passes per 90_percentile', 'xA per 90_percentile' ],
    'Attacking Midfielder': [ 'Defensive duels won, %_percentile', 'Successful defensive actions per 90_percentile', 'Accurate smart passes per 90_percentile', 'Accurate passes to penalty area per 90_percentile', 'Goals per 90_percentile', 'Successful dribbles per 90_percentile' ],
    'Winger': [ 'Non-penalty goals per 90_percentile', 'xG per 90_percentile', 'Shots on target per 90_percentile', 'Successful dribbles per 90_percentile', 'Assists per 90_percentile', 'xA per 90_percentile' ],
    'Centre Forward': [ 'Non-penalty goals per 90_percentile', 'xG per 90_percentile', 'Shots on target per 90_percentile', 'Touches in box per 90_percentile', 'xA per 90_percentile', 'Offensive duels won, %_percentile' ]
};

// --- Radar Chart Data Generation ---
const generateRadarData = (playerName: string, position: string, stats: PlayerStatsJSON | null) => {
    if (!stats) return [];
    const metrics = sixMetricsWithLegend[position] || []; // Get list of percentile keys
    const playerLabel = playerName || "Player";

    return metrics.map((metricKey) => {
        const readableAttribute = metricKey
            .replace(/_percentile$/, '')
            .replace(/ per 90/g, '/90')
            .replace(/, %/g, ' %')
            .replace(/_/g, ' ');

        const percentileValue = stats[metricKey];
        const playerStatPercent = percentileValue != null && !isNaN(Number(percentileValue))
            ? Math.round(Number(percentileValue) * 100)
            : 0;

        // Dummy team average (replace later if needed)
        const teamAverage = 50 + Math.floor(Math.random() * 25);

        return {
            attribute: readableAttribute,
            [playerLabel]: playerStatPercent,
            // teamAverage: teamAverage, // You can add this back if you calculate/fetch league averages
        };
    });
};

// --- Player Detail Modal Component ---
function PlayerDetailModal({ isOpen, onClose, player }: {
    isOpen: boolean;
    onClose: () => void;
    player: ScoutingPlayer | null;
}) {
    const [radarData, setRadarData] = useState<any[]>([]);

    useEffect(() => {
        if (player) {
            const position = player.player_pos ?? 'Other'; // Use player_pos alias
            const generatedData = generateRadarData(player.name ?? 'Unknown', position, player.stats as PlayerStatsJSON | null);
            setRadarData(generatedData);
            console.log("Generated Radar Data for modal:", generatedData);
        } else {
            setRadarData([]);
        }
    }, [player]);

    if (!isOpen || !player) return null;

    // Extract summary stats safely
    const stats = player.stats as PlayerStatsJSON | null;
    const minutes = stats?.['Minutes played'] ?? 'N/A';
    const goals = stats?.['Goals'] ?? 'N/A';
    const assists = stats?.['Assists'] ?? 'N/A';
    const footylabsScore = formatFootylabsScore(stats?.['avg_percentile']); // Use helper
    const scoreColor = getScoreColor(stats?.['avg_percentile']); // Use helper

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span className="text-[#31348D]">{player.name}</span>
                        {/* Add Suggest Recruitment Button here if desired */}
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"> <X className="h-4 w-4" /> </Button>
                    </DialogTitle>
                    {/* Use player_pos alias */}
                    <DialogDescription>Performance Analysis - Position: {player.player_pos || 'N/A'}</DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    {/* Summary Cards */}
                    <div className="mb-6 grid grid-cols-4 gap-4">
                        <div className="rounded-lg bg-gray-50 p-3 text-center">
                            <div className="text-sm text-gray-500">Minutes</div>
                            <div className="text-xl font-bold text-[#31348D]">{minutes}</div>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3 text-center">
                            <div className="text-sm text-gray-500">Goals</div>
                            <div className="text-xl font-bold text-[#31348D]">{goals}</div>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3 text-center">
                            <div className="text-sm text-gray-500">Assists</div>
                            <div className="text-xl font-bold text-[#31348D]">{assists}</div>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3 text-center">
                            <div className="text-sm text-gray-500">Footylabs Score</div>
                            <div className={`text-xl font-bold ${scoreColor}`}>
                                {footylabsScore}
                            </div>
                        </div>
                    </div>

                    {/* Radar Chart */}
                    {radarData.length > 0 ? (
                        <ChartContainer
                            config={{ [player.name ?? 'Player']: { label: player.name ?? 'Player', color: "hsl(var(--chart-1))" }, /*teamAverage: { label: "League Average", color: "hsl(var(--chart-2))" } */ }}
                            className="h-[400px] w-full"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}> {/* Adjusted margin */}
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="attribute" tick={{ fontSize: 10 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }}/> {/* Percentile scale */}
                                    <RechartsTooltip content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="rounded-md border bg-popover p-2 shadow-sm text-xs">
                                                    <div className="font-bold text-popover-foreground">{label}</div>
                                                    <div className="mt-1 space-y-0.5">
                                                        {payload.map((entry: any, idx: number) => (
                                                            <div key={`item-${idx}`} className="flex items-center">
                                                                <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: entry.color || entry.payload.fill }}></span>
                                                                <span className="text-muted-foreground mr-1">{entry.name}:</span>
                                                                <span className="font-medium text-foreground">{Number(entry.value).toFixed(0)}</span>
                                                                <span className="text-muted-foreground ml-0.5">%</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div> );
                                        } return null;
                                    }} />
                                    <Radar
                                        name={player.name ?? 'Player'}
                                        dataKey={player.name ?? 'Player'}
                                        stroke="hsl(var(--chart-1))"
                                        fill="hsl(var(--chart-1))"
                                        fillOpacity={0.6}
                                    />
                                    {/* Add Team Average Radar back if you implement average calculation */}
                                    {/* <Radar name="Team Average" dataKey="teamAverage" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.4} /> */}
                                    <Legend />
                                </RadarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            No percentile stats available or position not configured for radar chart.
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>


    );
}


// --- Helper Functions (copied from PlayerStats.tsx or defined globally) ---
const formatFootylabsScore = (score: number | null | undefined): string => {
    if (score === null || score === undefined) return "N/A";
    const numScore = Number(score);
    if (isNaN(numScore)) return "N/A";
    return (Math.round(numScore * 10 * 10) / 10).toFixed(1)
};

const getScoreColor = (score: number | null | undefined): string => {
    if (score === null || score === undefined) return "text-muted-foreground";
    const numScore = Number(score);
    if (isNaN(numScore)) return "text-muted-foreground";
    const scaledScore = numScore * 100; // Scale 0-1 percentile to 0-100
    if (scaledScore <= 33.3) return "text-red-600 font-medium";
    if (scaledScore <= 66.6) return "text-amber-500 font-medium";
    return "text-green-600 font-medium";
};


const formatFootDisplay = (foot: string | null | undefined): string => {
    if (!foot) { // Handles null, undefined, ""
        return "N/A";
    }
    const lowerFoot = foot.toLowerCase(); // Convert to lowercase for reliable comparison
    if (lowerFoot === 'unknown') {
        return "N/A";
    } else if (lowerFoot === 'left') {
        return "Left"; // Capitalize
    } else if (lowerFoot === 'right') {
        return "Right"; // Capitalize
    } else if (lowerFoot === 'both') {
        return "Both"; // Capitalize
    }
    // Fallback for any other unexpected value
    return "N/A";
};

// --- Main Scouting Component ---
export default function LeaguePlayerBrowser({ initialUserClubId }: { initialUserClubId: number | null }) {
    const [players, setPlayers] = useState<ScoutingPlayer[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();
    const [filters, setFilters] = useState({ name: '', position: 'all', foot: 'all', minHeight: '', maxHeight: '' /*, contractDateRange: undefined as DateRange | undefined */ });
    const [sortColumn, setSortColumn] = useState<string>('avg_percentile');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [selectedPlayer, setSelectedPlayer] = useState<ScoutingPlayer | null>(null);
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(filters.name);

    // Debounce Effect
    useEffect(() => { const handler = setTimeout(() => { setDebouncedSearchTerm(filters.name); }, 500); return () => clearTimeout(handler); }, [filters.name]);

    // Fetch Data Callback
    const fetchData = useCallback(async () => {
        if (initialUserClubId === null || initialUserClubId === undefined || !supabase) { setLoading(false); return; }
        setLoading(true); setError(null);
        const offset = (currentPage - 1) * itemsPerPage;
        const contractStart = undefined; const contractEnd = undefined; // Placeholder dates

        try {
            console.log("Fetching scouting players:", { ...filters, debouncedSearchTerm, sortColumn, sortDirection, currentPage });
            const response: PostgrestSingleResponse<ScoutingPlayer[]> = await supabase.rpc(
                'get_scouting_players', { p_requesting_club_id: initialUserClubId, p_name_filter: debouncedSearchTerm.trim() === '' ? null : debouncedSearchTerm.trim(), p_position_filter: filters.position === 'all' ? null : filters.position, p_min_height: filters.minHeight === '' ? null : parseInt(filters.minHeight, 10), p_max_height: filters.maxHeight === '' ? null : parseInt(filters.maxHeight, 10), p_foot_filter: filters.foot === 'all' ? null : filters.foot, p_contract_start: contractStart, p_contract_end: contractEnd, p_sort_column: sortColumn, p_sort_direction: sortDirection, p_limit: itemsPerPage, p_offset: offset }
            );
            if (response.error) throw response.error;
            const fetchedPlayers = response.data;
            setPlayers(fetchedPlayers || []);
            if (fetchedPlayers && fetchedPlayers.length > 0 && fetchedPlayers[0].total_count !== undefined) { setTotalCount(Number(fetchedPlayers[0].total_count)); }
            else { setTotalCount(0); }
        } catch (err: any) { console.error("Error fetching scouting players:", err); setError(`Could not load player data: ${err.message || 'Unknown RPC error'}`); setPlayers([]); setTotalCount(0); }
        finally { setLoading(false); }
    }, [ initialUserClubId, supabase, currentPage, itemsPerPage, sortColumn, sortDirection, debouncedSearchTerm, filters.position, filters.foot, filters.minHeight, filters.maxHeight ]);

    // Trigger fetch effect
    useEffect(() => { fetchData(); }, [fetchData]);
    // Reset page effect
    useEffect(() => { if (currentPage !== 1) setCurrentPage(1); }, [debouncedSearchTerm, filters.position, filters.foot, filters.minHeight, filters.maxHeight]);

    // Handlers
    const handleFilterChange = (filterName: keyof typeof filters, value: any) => { setFilters(prev => ({ ...prev, [filterName]: value })); };
    const handleSort = (column: string) => {
        const validSortColumns = ['name', 'club_name', 'player_pos', 'age', 'height', 'foot', 'contract_expiry', 'avg_percentile', 'on_loan'];
        if (!validSortColumns.includes(column)) { console.warn("Invalid sort column:", column); return; }
        if (sortColumn === column) { setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc')); }
        else { setSortColumn(column); setSortDirection('asc'); }
    };
    const handlePlayerRowClick = (player: ScoutingPlayer) => { setSelectedPlayer(player); };
    const handleCloseModal = () => { setSelectedPlayer(null); };

    // Pagination calculation
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const paginationItems = useMemo(() => { /* ... existing pagination logic ... */ const items = []; const maxPagesToShow = 5; const halfMaxPages = Math.floor(maxPagesToShow / 2); if (totalPages <= maxPagesToShow) { for (let i = 1; i <= totalPages; i++) { items.push( <PaginationItem key={i}> <PaginationLink href="#" isActive={i === currentPage} onClick={(e) => { e.preventDefault(); setCurrentPage(i); }}> {i} </PaginationLink> </PaginationItem> ); } } else { items.push( <PaginationItem key={1}> <PaginationLink href="#" isActive={1 === currentPage} onClick={(e) => { e.preventDefault(); setCurrentPage(1); }}> 1 </PaginationLink> </PaginationItem> ); if (currentPage > halfMaxPages + 1) { items.push(<PaginationEllipsis key="start-ellipsis" />); } let startPage = Math.max(2, currentPage - halfMaxPages + (currentPage > totalPages - halfMaxPages ? 1 : 0)); let endPage = Math.min(totalPages - 1, currentPage + halfMaxPages - (currentPage <= halfMaxPages ? 1 : 0)); if (currentPage <= halfMaxPages +1) { endPage = Math.min(totalPages - 1, maxPagesToShow-1); } if (currentPage > totalPages - halfMaxPages) { startPage = Math.max(2, totalPages - maxPagesToShow + 2); } for (let i = startPage; i <= endPage; i++) { items.push( <PaginationItem key={i}> <PaginationLink href="#" isActive={i === currentPage} onClick={(e) => { e.preventDefault(); setCurrentPage(i); }}> {i} </PaginationLink> </PaginationItem> ); } if (currentPage < totalPages - halfMaxPages) { items.push(<PaginationEllipsis key="end-ellipsis" />); } items.push( <PaginationItem key={totalPages}> <PaginationLink href="#" isActive={totalPages === currentPage} onClick={(e) => { e.preventDefault(); setCurrentPage(totalPages); }}> {totalPages} </PaginationLink> </PaginationItem> ); } return items; }, [currentPage, totalPages]);


    // --- Render Logic ---
    return (
        <div className="space-y-6">
            {/* Filter Card */}
            <Card>
                <CardHeader><CardTitle className="text-lg flex items-center"><Filter className="mr-2 h-5 w-5"/> Filters</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-4 items-end">
                    {/* Filter Controls */}
                    <div className="flex-grow min-w-[200px] space-y-1"><Label htmlFor="playerNameSearch">Player Name</Label><Input id="playerNameSearch" placeholder="Search..." value={filters.name} onChange={(e) => handleFilterChange('name', e.target.value)} /></div>
                    <div className="min-w-[180px] space-y-1"><Label htmlFor="positionFilter">Position</Label><Select value={filters.position} onValueChange={(value) => handleFilterChange('position', value)}><SelectTrigger id="positionFilter"><SelectValue placeholder="Any Position" /></SelectTrigger><SelectContent>{/* Options */}<SelectItem value="all">All Positions</SelectItem><SelectItem value="Goalkeeper">Goalkeeper</SelectItem><SelectItem value="Centre Back">Centre Back</SelectItem><SelectItem value="Full Back">Full Back</SelectItem><SelectItem value="Defensive Midfielder">Defensive Midfielder</SelectItem><SelectItem value="Central Midfielder">Central Midfielder</SelectItem><SelectItem value="Attacking Midfielder">Attacking Midfielder</SelectItem><SelectItem value="Winger">Winger</SelectItem><SelectItem value="Centre Forward">Centre Forward</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
                    <div className="min-w-[120px] space-y-1"><Label htmlFor="footFilter">Preferred Foot</Label><Select value={filters.foot} onValueChange={(value) => handleFilterChange('foot', value)}><SelectTrigger id="footFilter"><SelectValue placeholder="Any Foot" /></SelectTrigger><SelectContent><SelectItem value="all">Any Foot</SelectItem><SelectItem value="Left">Left</SelectItem><SelectItem value="Right">Right</SelectItem><SelectItem value="Both">Both</SelectItem></SelectContent></Select></div>
                    <div className="flex gap-2 items-end min-w-[200px] space-y-1"><div className="flex-1"><Label htmlFor="minHeight">Min Height (cm)</Label><Input id="minHeight" type="number" placeholder="e.g., 170" value={filters.minHeight} onChange={(e) => handleFilterChange('minHeight', e.target.value)} /></div><div className="flex-1"><Label htmlFor="maxHeight">Max Height (cm)</Label><Input id="maxHeight" type="number" placeholder="e.g., 190" value={filters.maxHeight} onChange={(e) => handleFilterChange('maxHeight', e.target.value)} /></div></div>
                </CardContent>
            </Card>

            {/* Results Table Card */}
            <Card>
                <CardHeader><CardTitle>League Players ({loading ? '...' : totalCount})</CardTitle><CardDescription>Browse players matching your criteria.</CardDescription></CardHeader>
                <CardContent>
                    {loading && <div className="flex justify-center items-center py-20"><Loader2 className="h-10 w-10 animate-spin text-[#31348D]" /></div>}
                    {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                    {!loading && !error && players.length === 0 && <p className="text-center text-muted-foreground py-10">No players found matching the current filters.</p>}
                    {!loading && !error && players.length > 0 && (
                        <>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>Name <ArrowUpDown className="inline h-4 w-4 ml-1" /></TableHead>
                                            <TableHead className="cursor-pointer" onClick={() => handleSort('club_name')}>Club <ArrowUpDown className="inline h-4 w-4 ml-1" /></TableHead>
                                            <TableHead className="cursor-pointer" onClick={() => handleSort('player_pos')}>Position <ArrowUpDown className="inline h-4 w-4 ml-1" /></TableHead>
                                            <TableHead className="cursor-pointer text-center" onClick={() => handleSort('age')}>Age <ArrowUpDown className="inline h-4 w-4 ml-1" /></TableHead>
                                            <TableHead className="cursor-pointer text-center" onClick={() => handleSort('height')}>Height <ArrowUpDown className="inline h-4 w-4 ml-1" /></TableHead>
                                            <TableHead className="cursor-pointer text-center" onClick={() => handleSort('foot')}>Foot <ArrowUpDown className="inline h-4 w-4 ml-1" /></TableHead>
                                            <TableHead className="cursor-pointer text-center" onClick={() => handleSort('contract_expiry')}>Contract Ends <ArrowUpDown className="inline h-4 w-4 ml-1" /></TableHead>
                                            <TableHead className="cursor-pointer text-center" onClick={() => handleSort('avg_percentile')}>FootyLabs Score <ArrowUpDown className="inline h-4 w-4 ml-1" /></TableHead>
                                            <TableHead className="cursor-pointer text-center" onClick={() => handleSort('on_loan')}>On Loan? <ArrowUpDown className="inline h-4 w-4 ml-1" /></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {players.map((player) => (
                                            <TableRow key={player.wyscout_player_id?.toString()} className="cursor-pointer hover:bg-gray-50" onClick={() => handlePlayerRowClick(player)}>
                                                <TableCell className="font-medium">{player.name || 'N/A'}</TableCell>
                                                <TableCell>{player.club_name || 'N/A'}</TableCell>
                                                <TableCell><Badge variant="outline">{player.player_pos || 'N/A'}</Badge></TableCell>
                                                <TableCell className="text-center">{player.age ?? 'N/A'}</TableCell>
                                                <TableCell className="text-center">{player.height ? `${player.height} cm` : 'N/A'}</TableCell>
                                                <TableCell className="text-center">{formatFootDisplay(player.foot)}</TableCell>
                                                <TableCell className="text-center">{player.contract_expiry ? new Date(player.contract_expiry).toLocaleDateString() : 'N/A'}</TableCell>
                                                <TableCell className={`text-center font-medium ${getScoreColor(player.avg_percentile)}`}>{formatFootylabsScore(player.avg_percentile)}</TableCell>
                                                <TableCell className="text-center">{player.on_loan ? 'Yes' : 'No'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {/* Pagination Controls */}
                            {totalPages > 1 && ( <Pagination className="mt-6"> <PaginationContent> <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(prev => Math.max(1, prev - 1)); }} aria-disabled={currentPage === 1} tabIndex={currentPage === 1 ? -1 : undefined} className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}/></PaginationItem> {paginationItems} <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(prev => Math.min(totalPages, prev + 1)); }} aria-disabled={currentPage === totalPages} tabIndex={currentPage === totalPages ? -1 : undefined} className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}/></PaginationItem> </PaginationContent> </Pagination> )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Player Detail Modal */}
            <PlayerDetailModal
                isOpen={!!selectedPlayer}
                onClose={handleCloseModal}
                player={selectedPlayer}
            />
        </div>
    );
}