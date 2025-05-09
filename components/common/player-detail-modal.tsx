// components/common/player-detail-modal.tsx
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, X } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip as RechartsTooltip } from "recharts";
import { ChartContainer } from "@/components/ui/chart"; // Assuming ChartTooltipContent is part of this or imported separately
import { Tooltip as ShadTooltip, TooltipContent as ShadTooltipContent, TooltipProvider } from "@/components/ui/tooltip"; // Shadcn Tooltip for button
import { toast } from '@/components/ui/use-toast'; // Assuming used by suggest button
import { createClient } from '@/lib/supabase/client'; // For suggest button if kept

// --- Type Definitions ---
// Generic type for player data passed to this modal
// It should have 'name', 'position' (or 'player_pos'), and 'stats'
export type PlayerDataForModal = {
    id: number; // For logging, keys, etc.
    name: string | null;
    player_pos?: string | null;   // From get_scouting_players
    position?: string | null;    // From get_latest_players_for_club (PlayerStats.tsx)
    stats: { [key: string]: number | string | boolean | null } | null; // The raw stats JSON
    // Add other fields if your "Suggest Recruitment" button needs them, e.g., club_id
    club_id?: number | null; // Example if suggest button needs it
    wyscout_player_id?: number | string | null; // Example
};

// Type for the processed data points for the radar chart and tooltip
type RadarDataPoint = {
    attribute: string;          // Readable name for the metric
    percentile: number;         // Player's percentile value (0-100) for radar line
    actualValue: string | number; // Player's raw value for the metric (for tooltip)
    leagueAverage: string | number; // (Dummy) League average for the metric (for tooltip)
};

// Key metrics definition (this should be consistent with what's in PlayerStatsJSON)
// Ensure all metric keys used here end with '_percentile' if that's how they are in stats JSON
const sixMetricsWithLegend: { [position: string]: string[] } = {
    'Goalkeeper': [ 'Conceded goals per 90_percentile', 'Accurate passes, %_percentile', 'xG against per 90_percentile', 'Prevented goals per 90_percentile', 'Save rate, %_percentile', 'Exits per 90_percentile' ],
    'Full Back': [ 'Successful defensive actions per 90_percentile', 'Defensive duels won, %_percentile', 'Accurate crosses, %_percentile', 'Accurate passes, %_percentile', 'Key passes per 90_percentile', 'xA per 90_percentile' ],
    'Centre Back': [ 'Successful defensive actions per 90_percentile', 'Defensive duels won, %_percentile', 'Aerial duels won, %_percentile', 'Accurate passes to final third per 90_percentile', 'Accurate passes, %_percentile', 'Interceptions per 90_percentile' ],
    'Defensive Midfielder': [ 'Accurate passes to final third per 90_percentile', 'Interceptions per 90_percentile', 'Sliding tackles per 90_percentile', 'Accurate passes to penalty area per 90_percentile', 'Aerial duels won, %_percentile',  'Accurate progressive passes per 90_percentile' ],
    'Central Midfielder': [ 'Successful defensive actions per 90_percentile', 'Defensive duels won, %_percentile', 'Accurate passes, %_percentile', 'Accurate passes to final third per 90_percentile', 'Key passes per 90_percentile', 'xA per 90_percentile' ],
    'Attacking Midfielder': [ 'Successful defensive actions per 90_percentile', 'Defensive duels won, %_percentile', 'Accurate smart passes per 90_percentile', 'Accurate passes to penalty area per 90_percentile', 'Goals per 90_percentile', 'Successful dribbles per 90_percentile' ],
    'Winger': [ 'Non-penalty goals per 90_percentile', 'xG per 90_percentile', 'Shots on target per 90_percentile', 'Successful dribbles per 90_percentile', 'Assists per 90_percentile', 'xA per 90_percentile' ],
    'Centre Forward': [ 'Non-penalty goals per 90_percentile', 'xG per 90_percentile', 'Shots on target per 90_percentile', 'Touches in box per 90_percentile', 'xA per 90_percentile', 'Offensive duels won, %_percentile' ]
};

// Helper functions (copied or defined here for self-containment)
const formatFootylabsScore = (score: number | string | null | undefined): string => {
    if (score === null || score === undefined) return "N/A";
    const numScore = Number(score);
    if (isNaN(numScore)) return "N/A";
    return (numScore * 10).toFixed(1); // Assuming score is 0-1 percentile
};

const getScoreColor = (score: number | string | null | undefined): string => {
    if (score === null || score === undefined) return "text-muted-foreground";
    const numScore = Number(score);
    if (isNaN(numScore)) return "text-muted-foreground";
    const scaledScore = numScore * 100; // Scale 0-1 percentile to 0-100
    if (scaledScore <= 33.3) return "text-red-600 font-medium";
    if (scaledScore <= 66.6) return "text-amber-500 font-medium";
    return "text-green-600 font-medium";
};


// --- Radar Chart Data Generation (Modified to match TeamComparison style) ---
const generateRadarData = (player: PlayerDataForModal): RadarDataPoint[] => {
    if (!player.stats) return [];
    const currentPosition = player.player_pos ?? player.position ?? 'Other'; // Get the actual position
    const metrics = sixMetricsWithLegend[currentPosition] || [];
    if (metrics.length === 0) return [];

    return metrics.map((metricKey) => {
        const actualMetricKey = metricKey.replace(/_percentile$/, '');
        const readableAttribute = actualMetricKey
            // .replace(/ per 90/g, '/90')
            .replace(/, %/g, ' %')
            .replace(/_/g, ' ');

        const percentileValue = player.stats![metricKey]; // Access percentile from stats
        const playerStatPercent = percentileValue != null && !isNaN(Number(percentileValue))
            ? Math.round(Number(percentileValue) * 100)
            : 0;

        const rawActualValue = player.stats![actualMetricKey]; // Access raw value from stats
        let actualValueDisplay: string | number = 'N/A';
        if (rawActualValue !== null && rawActualValue !== undefined) {
            const numVal = Number(rawActualValue);
            if (!isNaN(numVal)) {
                actualValueDisplay = actualMetricKey.includes('%') ? `${numVal.toFixed(1)}%` : numVal.toFixed(2);
            } else {
                actualValueDisplay = rawActualValue.toString();
            }
        }

        // Dummy league average for now
        const dummyLeagueAverage = (30 + Math.random() * 60).toFixed(2);

        return {
            attribute: readableAttribute,
            percentile: playerStatPercent, // This drives the radar line
            actualValue: actualValueDisplay,
            leagueAverage: dummyLeagueAverage,
        };
    });
};

// --- Custom Tooltip for Radar Chart ---
const CustomRadarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        // The data for the hovered point is in payload[0].payload
        const dataPoint = payload[0].payload as RadarDataPoint;
        if (!dataPoint) return null;

        return (
            <div className="rounded-md border bg-popover p-2.5 shadow-lg text-xs">
                <div className="font-semibold text-popover-foreground mb-1.5">{dataPoint.attribute}</div>
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground mr-2">Percentile:</span>
                        <span className="font-medium text-foreground">{dataPoint.percentile}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground mr-2">Actual Value:</span>
                        <span className="font-medium text-foreground">{dataPoint.actualValue}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground mr-2">League Avg:</span>
                        <span className="font-medium text-foreground">{dataPoint.leagueAverage}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};


// --- Player Detail Modal Component ---
export default function PlayerDetailModal({ isOpen, onClose, player }: {
    isOpen: boolean;
    onClose: () => void;
    player: PlayerDataForModal | null;
}) {
    const [radarData, setRadarData] = useState<RadarDataPoint[]>([]);
    const [suggestLoading, setSuggestLoading] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
            setUserEmail(user?.email ?? null);
        }
        if (isOpen && supabase) {
            fetchUser();
        }
    }, [isOpen, supabase]);

    useEffect(() => {
        if (isOpen && player) {
            const generatedData = generateRadarData(player);
            setRadarData(generatedData);
            console.log("Generated Radar Data for modal:", generatedData);
        } else {
            setRadarData([]);
        }
    }, [isOpen, player]);

    const handleSuggestRecruitment = async () => {
        if (!player || !userEmail || player.club_id === undefined || player.club_id === null) {
            toast({ title: "Error", description: "Missing required info (player/user/club).", variant: "destructive" });
            return;
        }
        setSuggestLoading(true);
        try {
            const { error } = await supabase?.from("recruitment_suggestions").insert({
                user_email: userEmail,
                club_id: player.club_id,
                player_id: player.id, // Use the player.id which should be the DB PK
                player_name: player.name,
            });
            if (error) { console.error(error); toast({ title: "Suggestion Logged (Fallback)", description: "AI analysis pending." }); }
            else { toast({ title: "Success", description: "Suggestion logged. AI analysis pending." }); }
        } catch (err) { console.error(err); toast({ title: "Error", description: "Suggestion error.", variant: "destructive" }); }
        finally { setSuggestLoading(false); }
    };

    if (!isOpen || !player) return null;

    const stats = player.stats as PlayerStatsJSON | null;
    const displayMinutes = stats?.['Minutes played'] ?? 'N/A';
    const displayGoals = stats?.['Goals'] ?? 'N/A';
    const displayAssists = stats?.['Assists'] ?? 'N/A';
    const displayFootylabsScore = formatFootylabsScore(stats?.['avg_percentile']);
    const scoreColor = getScoreColor(stats?.['avg_percentile']);
    const positionDisplay = player.player_pos ?? player.position ?? 'N/A';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                            <span className="text-[#31348D]">{player.name}</span>
                            {/*<TooltipProvider delayDuration={0}>*/}
                            {/*    <ShadTooltip>*/}
                            {/*        <ShadTooltipTrigger asChild>*/}
                            {/*            <Button className="ml-4 bg-[#31348D] text-white hover:bg-[#31348D]/90" onClick={(e) => { e.stopPropagation(); handleSuggestRecruitment(); }} disabled={suggestLoading}>*/}
                            {/*                {suggestLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>) : ("Suggest Recruitment")}*/}
                            {/*            </Button>*/}
                            {/*        </ShadTooltipTrigger>*/}
                            {/*        <ShadTooltipContent className="bg-gray-700 text-white border-gray-600"><p>Use AI models to find relevant alternatives</p></ShadTooltipContent>*/}
                            {/*    </ShadTooltip>*/}
                            {/*</TooltipProvider>*/}
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"> <X className="h-4 w-4" /> </Button>
                    </DialogTitle>
                    <DialogDescription>Performance Analysis - Position: {positionDisplay}</DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    <div className="mb-6 grid grid-cols-4 gap-4">
                        <div className="rounded-lg bg-gray-50 p-3 text-center"><div className="text-sm text-gray-500">Minutes</div><div className="text-xl font-bold text-[#31348D]">{displayMinutes}</div></div>
                        <div className="rounded-lg bg-gray-50 p-3 text-center"><div className="text-sm text-gray-500">Goals</div><div className="text-xl font-bold text-[#31348D]">{displayGoals}</div></div>
                        <div className="rounded-lg bg-gray-50 p-3 text-center"><div className="text-sm text-gray-500">Assists</div><div className="text-xl font-bold text-[#31348D]">{displayAssists}</div></div>
                        <div className="rounded-lg bg-gray-50 p-3 text-center"><div className="text-sm text-gray-500">Footylabs Score</div><div className={`text-xl font-bold ${scoreColor}`}>{displayFootylabsScore}</div></div>
                    </div>

                    {/* Radar Chart */}
                    {radarData.length > 0 ? (
                        <ChartContainer
                            config={{ percentile: { label: "Percentile", color: "hsl(var(--chart-1))" } }} className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart
                                    cx="50%" // Explicitly center horizontally
                                    cy="50%" // Explicitly center vertically
                                    outerRadius="94.6%" // Control how much of the container the radar uses (adjust as needed)
                                    data={radarData}
                                    margin={{ top: 20, right: 30, bottom: 20, left: 30 }} >
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="attribute" tick={{ fontSize: 12 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }}/>
                                    <RechartsTooltip content={<CustomRadarTooltip />} />
                                    <Radar
                                        name="Percentile"
                                        dataKey="percentile"
                                        stroke="hsl(var(--chart-1))"
                                        fill="hsl(var(--chart-1))"
                                        fillOpacity={0.6}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    ) : (
                        <div className="text-center text-muted-foreground py-8 h-[400px] flex items-center justify-center"> {/* Match height */}
                            Radar chart data not available for this player/position.
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}