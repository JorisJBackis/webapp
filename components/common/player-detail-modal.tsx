// components/common/player-detail-modal.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose} from "@/components/ui/dialog";
import { Loader2, X } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip as RechartsTooltip } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Tooltip as ShadTooltip, TooltipContent as ShadTooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types'; // Ensure correct path

// --- Type Definitions ---
export type PlayerDataForModal = {
    id: number;
    name: string | null;
    player_pos?: string | null;
    position?: string | null;
    stats: { [key: string]: number | string | boolean | null } | null;
    club_id?: number | null;
    wyscout_player_id?: number | string | null;
    player_league_name?: string | null; // For fetching correct league averages
};

type RadarDataPoint = {
    attribute: string;
    percentile: number;
    actualValue: string | number;
    leagueAverage: string | number;
};

type PlayerStatsJSON = { [key: string]: number | string | boolean | null };

// Type for data returned by get_metric_averages_for_position_league
// Ensure this matches your generated database.types.ts
type MetricAverage = Database['public']['Functions']['get_metric_averages_for_position_league']['Returns'][number];


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

const formatFootylabsScore = (score: number | string | boolean | null | undefined): string => {
    if (score === null || score === undefined) return "N/A";
    const numScore = Number(score);
    if (isNaN(numScore)) return "N/A";
    return (numScore * 10).toFixed(1); // Assuming score is 0-1 percentile
};

const getScoreColor = (score: number | string | boolean | null | undefined): string => {
    if (score === null || score === undefined) return "text-muted-foreground";
    const numScore = Number(score);
    if (isNaN(numScore)) return "text-muted-foreground";
    const scaledScore = numScore * 100; // Scale 0-1 percentile to 0-100
    if (scaledScore <= 33.3) return "text-red-600 font-medium";
    if (scaledScore <= 66.6) return "text-amber-500 font-medium";
    return "text-green-600 font-medium";
};

// --- Radar Chart Data Generation (Now uses real league averages) ---
const generateRadarData = (
    player: PlayerDataForModal,
    positionMetricAverages: MetricAverage[] // Pass fetched averages
): RadarDataPoint[] => {
    if (!player.stats) return [];
    const currentPosition = player.player_pos ?? player.position ?? 'Other';
    const percentileMetricKeys = sixMetricsWithLegend[currentPosition] || [];
    if (percentileMetricKeys.length === 0) return [];

    // Create a map for quick lookup of averages by metric_name
    const averagesMap = new Map(positionMetricAverages.map(avg => [avg.metric_name, avg.average_value]));

    return percentileMetricKeys.map((metricKey) => {
        const actualMetricKey = metricKey.replace(/_percentile$/, '');
        const readableAttribute = actualMetricKey.replace(/ per 90/g, ' per 90').replace(/, %/g, ' %').replace(/_/g, ' ');

        const percentileValue = player.stats![metricKey];
        const playerStatPercent = percentileValue != null && !isNaN(Number(percentileValue))
            ? Math.round(Number(percentileValue) * 100)
            : 0;

        const rawActualValue = player.stats![actualMetricKey];
        let actualValueDisplay: string | number = 'N/A';
        if (rawActualValue !== null && rawActualValue !== undefined) {
            const numVal = Number(rawActualValue);
            if (!isNaN(numVal)) {
                actualValueDisplay = actualMetricKey.includes('%') ? `${numVal.toFixed(1)}%` : numVal.toFixed(2);
            } else {
                actualValueDisplay = rawActualValue.toString();
            }
        }

        const leagueAverageForMetric = averagesMap.get(actualMetricKey); // Get from fetched averages
        let leagueAverageDisplay: string | number = 'N/A';
        if (leagueAverageForMetric != null && !isNaN(Number(leagueAverageForMetric))) {
            const numAvg = Number(leagueAverageForMetric);
            leagueAverageDisplay = actualMetricKey.includes('%') ? `${numAvg.toFixed(1)}%` : numAvg.toFixed(2);
        }

        return {
            attribute: readableAttribute,
            percentile: playerStatPercent,
            actualValue: actualValueDisplay,
            leagueAverage: leagueAverageDisplay, // Use the fetched and formatted average
        };
    });
};

// --- Custom Tooltip (remains the same) ---
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
                        <span className="font-mono text-[#31348D] font-medium">{dataPoint.percentile}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground mr-2">Actual Value:</span>
                        <span className="font-mono text-[#31348D] font-medium">{dataPoint.actualValue}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground mr-2">League Average:</span>
                        <span className="font-mono text-[#31348D] font-medium">{dataPoint.leagueAverage}</span>
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
    // playerLeague prop is no longer needed here as it's part of the 'player' object
}) {
    const [radarData, setRadarData] = useState<RadarDataPoint[]>([]);
    const [positionAverages, setPositionAverages] = useState<MetricAverage[]>([]);
    const [loadingAverages, setLoadingAverages] = useState(false);
    const [suggestLoading, setSuggestLoading] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isEstimating, setIsEstimating] = useState(false);
    const [hasRequested, setHasRequested] = useState(false);
    const supabase = createClient();


    useEffect(() => {
        const fetchUser = async () => {
            if (isOpen) {
                if (!supabase) return;
                const { data: { user } } = await supabase.auth.getUser();
                setUserEmail(user?.email ?? null);
                // Reset request status when a new player modal is opened
                setHasRequested(false);
            }
        };
        fetchUser();
    }, [isOpen, supabase]);

    // Fetch position averages when modal opens or player changes
    useEffect(() => {
        const fetchAverages = async () => {
            if (!isOpen || !player || !player.player_league_name) { // Check for player_league_name
                setPositionAverages([]);
                setRadarData(player ? generateRadarData(player, []) : []); // Generate with empty averages if no league
                return;
            }
            const currentPosition = player.player_pos ?? player.position ?? 'Other';
            if (currentPosition === 'Other' || !sixMetricsWithLegend[currentPosition]) {
                setPositionAverages([]);
                setRadarData(generateRadarData(player, []));
                return;
            }

            setLoadingAverages(true);
            try {
                if (!supabase) return;
                const { data, error } = await supabase.rpc('get_metric_averages_for_position_league', {
                    p_position_name: currentPosition,
                    p_league_name: player.player_league_name // Use league from player prop
                });
                if (error) throw error;
                const fetchedAverages = data as MetricAverage[] | null;
                console.log(`Fetched averages for ${currentPosition} in ${player.player_league_name}:`, fetchedAverages);
                setPositionAverages(fetchedAverages || []);
            } catch (err) {
                console.error("Error fetching position averages:", err);
                setPositionAverages([]); // Set to empty on error
            } finally {
                setLoadingAverages(false);
            }
        };

        fetchAverages();
    }, [isOpen, player, supabase]);


    // Generate radar data when player OR positionAverages (or loadingAverages state) change
    useEffect(() => {
        if (isOpen && player) {
            // Only generate radar data once averages are fetched (or attempted)
            if (!loadingAverages) {
                const generatedData = generateRadarData(player, positionAverages);
                setRadarData(generatedData);
                console.log("Generated Radar Data for modal with fetched/empty averages:", generatedData);
            }
        } else if (!isOpen) {
            setRadarData([]);
        }
    }, [isOpen, player, positionAverages, loadingAverages]);

    // Inside PlayerDetailModal, before the return statement

    // <<< ADD THIS ENTIRE FUNCTION >>>
    const handleRequestSalary = async () => {
        if (!player || !userEmail || !player.club_id || !player.name) {
            toast({
                title: "Error",
                description: "Missing player or user info to make a request.",
                variant: "destructive",
            });
            return;
        }

        setIsEstimating(true);

        try {
            if (!supabase) return;
            const { error } = await supabase.from("salary_estimation_requests").insert({
                user_email: userEmail,
                club_id: player.club_id,
                player_id: player.id, // This is the players.id PK
                player_name: player.name,
            });

            if (error) throw error;

            toast({
                title: "Request Sent!",
                description: "Our analysts will prepare a salary estimation and reach out to you shortly.",
            });
            setHasRequested(true); // Disable the button after a successful request

        } catch (err: any) {
            console.error("Error logging salary request:", err);
            toast({
                title: "Request Failed",
                description: "Could not submit your request. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsEstimating(false);
        }
    };

    if (!isOpen || !player) return null;
    const stats = player.stats as PlayerStatsJSON | null;
    const displayMinutes = stats?.['Minutes played'] ?? 'N/A'; /* ... etc ... */
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
                        <div className="flex items-center gap-4">
                            <span className="text-[#31348D]">{player.name}</span>
                            <Button
                                onClick={handleRequestSalary}
                                disabled={isEstimating || hasRequested}
                                size="sm"
                            >
                                {isEstimating ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : hasRequested ? (
                                    'Request Sent'
                                ) : (
                                    'Request Salary Estimation'
                                )}
                            </Button>
                        </div>
                        {/* The custom close button is now GONE. */}
                    </DialogTitle>
                    <DialogDescription>
                        Performance Analysis - Position: {positionDisplay} - League: {player.player_league_name || 'N/A'}
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                    {/* Summary Cards ... */}
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
                                    outerRadius="94.4%" // Control how much of the container the radar uses (adjust as needed)
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
                    ) : !loadingAverages && ( <div className="text-center text-muted-foreground py-8 h-[480px] flex items-center justify-center">Radar chart data not available or position not configured.</div> )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
