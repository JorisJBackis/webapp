"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" // Import Select
import { Label } from "@/components/ui/label" // Import Label

type ComparisonDataItem = {
    attribute: string;
    percentile: number;
    actualValue: number;
    leagueAverage: number;
}

// Reusable RadarChartCard component remains the same
const RadarChartCard = ({ data, config }: { data: ComparisonDataItem[]; config: any }) => {
    if (data.length === 0) return null;
    return (
        <ChartContainer config={config} className="h-[350px] w-full">
            <ResponsiveContainer>
                <RadarChart data={data}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="attribute" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <ChartTooltip
                        content={
                            <ChartTooltipContent
                                formatter={(value, name, item) => {
                                    const dataPoint = data.find(d => d.attribute === item.payload.attribute);
                                    return (
                                        <div className="min-w-[120px] space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Percentile:</span>
                                                <span className="font-bold">{`${value}%`}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Actual:</span>
                                                <span className="font-bold">{dataPoint?.actualValue.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">League Avg:</span>
                                                <span className="font-bold">{dataPoint?.leagueAverage.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                        }
                    />
                    <Radar name="Percentile" dataKey="percentile" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.6} />
                    <Legend wrapperStyle={{ paddingTop: '25px' }} />
                </RadarChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
};

export default function TeamComparison({ clubId }: { clubId?: number }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const [allComparisonData, setAllComparisonData] = useState<Record<string, ComparisonDataItem[]>>({});
    const [selectedCategory, setSelectedCategory] = useState('attacking'); // Default to 'attacking'

    const calculatePercentile = (values: number[], value: number): number => {
        if (!values || values.length === 0) return 0;
        const validValues = values.filter((v) => !isNaN(v) && v !== undefined && v !== null);
        if (validValues.length === 0) return 0;
        const sortedValues = [...validValues].sort((a, b) => a - b);
        const belowCount = sortedValues.filter((v) => v < value).length;
        return Math.round((belowCount / validValues.length) * 100);
    }

    useEffect(() => {
        const fetchData = async () => {
            if (!clubId) { setLoading(false); setError("Club ID not found."); return; }
            setLoading(true); setError(null);

            try {
                if (!supabase) return;
                const { data: allTeamsData, error: allTeamsError } = await supabase.from("team_metrics_aggregated").select("*");
                if (allTeamsError) throw new Error(`Error fetching league stats: ${allTeamsError.message}`);
                if (!allTeamsData || allTeamsData.length === 0) {
                    setError("No team data available to perform comparison."); setLoading(false); return;
                }
                const teamData = allTeamsData.find((team) => team.team_id === clubId);
                if (!teamData) {
                    setError(`Your team's data (ID: ${clubId}) could not be found.`); setLoading(false); return;
                }

                const metricCategories = {
                    attacking: ["Goals", "xG", "Total Shots", "Shots on Target"],
                    passing: ["Total Passes", "Pass Accuracy", "Total Crosses", "Forward Passes"],
                    defence: ["Total Recoveries", "Duels Success %", "Shots Against on Target", "Interceptions"],
                    gameRhythm: ["PPDA", "Average Passes per Possession", "Match Tempo", "Possession %"]
                };

                const processedData: Record<string, ComparisonDataItem[]> = {};

                for (const category in metricCategories) {
                    processedData[category] = metricCategories[category as keyof typeof metricCategories].map((metric) => {
                        const allValues = allTeamsData.map(team => {
                            const val = (team as any)[metric];
                            return typeof val === "string" ? parseFloat(val) : typeof val === "number" ? val : 0;
                        }).filter(val => !isNaN(val));
                        const rawTeamValue = (teamData as any)[metric]; 
                        const teamValue = typeof rawTeamValue === "string" ? parseFloat(rawTeamValue) : typeof rawTeamValue === "number" ? rawTeamValue : 0;
                        const leagueAverage = allValues.length > 0 ? allValues.reduce((sum, val) => sum + val, 0) / allValues.length : 0;
                        let percentile;
                        if (metric === "PPDA" || metric === "Shots Against on Target") {
                            const aboveCount = allValues.filter((v) => v > teamValue).length;
                            percentile = allValues.length > 0 ? Math.round((aboveCount / allValues.length) * 100) : 0;
                        } else {
                            percentile = calculatePercentile(allValues, teamValue);
                        }
                        return { attribute: metric, percentile, actualValue: teamValue, leagueAverage };
                    });
                }
                setAllComparisonData(processedData);

            } catch (err) {
                setError(err instanceof Error ? err.message : "An unknown error occurred");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [clubId, supabase]);

    if (loading) {
        return (
            <Card className="border-0 shadow-md">
                <CardHeader><CardTitle className="text-[#31348D]">Team Comparison</CardTitle><CardDescription className="text-black/70">Loading comparison data...</CardDescription></CardHeader>
                <CardContent className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-0 shadow-md">
                <CardHeader><CardTitle className="text-[#31348D]">Team Comparison</CardTitle><CardDescription className="text-black/70">Error loading comparison data</CardDescription></CardHeader>
                <CardContent className="pt-6">
                    <div className="text-center text-red-500">{error}</div>
                    <div className="mt-4 text-center text-sm text-gray-500">Please ensure team metrics data is available for your league. Try refreshing the page.</div>
                </CardContent>
            </Card>
        );
    }

    const chartConfig = {
        percentile: { label: "Percentile", color: "hsl(var(--chart-1))" }
    };

    const currentChartData = allComparisonData[selectedCategory] || [];

    return (
        <Card className="border-0 shadow-md">
            <CardHeader>
                <CardTitle className="text-[#31348D]">Team Comparison</CardTitle>
                <CardDescription className="text-black/70">How your team compares to the league across key metrics (percentile ranking).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* <<< NEW: Dropdown selector >>> */}
                <div className="w-full sm:w-64">
                    <Label>Select Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a category to analyze" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="attacking">Attacking</SelectItem>
                            <SelectItem value="passing">Passing</SelectItem>
                            <SelectItem value="defence">Defence</SelectItem>
                            <SelectItem value="gameRhythm">Game Rhythm</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {/* <<< END: Dropdown selector >>> */}

                {currentChartData.length > 0 ? (
                    <RadarChartCard data={currentChartData} config={chartConfig} />
                ) : (
                    <div className="flex h-[350px] items-center justify-center">
                        <p className="text-muted-foreground">No data available for this category.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}