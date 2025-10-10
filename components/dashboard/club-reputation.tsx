// components/dashboard/club-reputation.tsx
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Loader2, AlertCircle, Star } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- Type Definitions ---
type IndividualReview = {
    id: number;
    overall_rating: number;
    comment: string | null;
    category_ratings: {
        "Salary Punctuality"?: number;
        "Training Conditions"?: number;
        "Club Management"?: number;
        "Fair Salary"?: number;
    };
    created_at: string;
}

type AggregatedReview = {
    clubName: string;
    reviewCount: number;
    avgOverall: number;
    avgPunctuality: number;
    avgConditions: number;
    avgManagement: number;
    avgFairSalary: number;
    reviews: IndividualReview[];
};

// --- Child Components ---

const StarRating = ({ rating, label }: { rating: number; label?: string }) => {
    const fullStars = Math.round(rating);
    return (
        <div className="flex items-center">
            {label && <span className="text-sm text-muted-foreground w-40 shrink-0">{label}</span>}
            <div className="flex">
                {[...Array(5)].map((_, i) => (
                    <Star
                        key={i}
                        className={`h-4 w-4 ${i < fullStars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                    />
                ))}
            </div>
            <span className="ml-2 text-sm font-medium text-gray-600">{rating.toFixed(1)}</span>
        </div>
    );
};

// --- Main Component ---
export default function ClubReputation({ leagueName }: { leagueName: string | null }) {
    const [data, setData] = useState<AggregatedReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedClub, setSelectedClub] = useState<AggregatedReview | null>(null);
    const [selectedMetric, setSelectedMetric] = useState<keyof AggregatedReview>('avgOverall');

    const metricDisplayNames: Record<keyof AggregatedReview, string> = {
        avgOverall: "Overall Rating",
        avgPunctuality: "Salary Punctuality",
        avgFairSalary: "Fair Salary",
        avgConditions: "Training Conditions",
        avgManagement: "Club Management",
        // Add other keys if they become selectable, even if not used now
        clubName: "Club Name",
        reviewCount: "Review Count",
        reviews: "Reviews",
    };


    useEffect(() => {
        if (!leagueName) {
            setLoading(false); setData([]); return;
        }
        const fetchData = async () => {
            setLoading(true); setError(null);
            try {
                const response = await fetch(`/api/club-reviews?league=${encodeURIComponent(leagueName)}`);
                if (!response.ok) throw new Error("Failed to fetch data from server.");
                const result = await response.json();
                if (result.error) throw new Error(result.error);

                result.sort((a: AggregatedReview, b: AggregatedReview) => b.avgOverall - a.avgOverall);
                setData(result);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [leagueName]);

    if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (error) return <Alert variant="destructive" className="my-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    if (!leagueName || data.length === 0) {
        return (
            <Card><CardHeader><CardTitle>Club Reputation</CardTitle></CardHeader><CardContent><p className="text-center text-muted-foreground py-10">No review data available for this league yet.</p></CardContent></Card>
        );
    }

    // Sort data for the chart based on the selected metric
    const sortedChartData = [...data].sort((a, b) => b[selectedMetric] - a[selectedMetric]);

    return (
        <>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div>
                                <CardTitle>Club Reputation Ratings - {leagueName}</CardTitle>
                                <CardDescription>Aggregated player reviews on key off-pitch factors. Based on {data.reduce((sum, club) => sum + club.reviewCount, 0)} total reviews.</CardDescription>
                            </div>
                            <Select
                                value={selectedMetric}
                                onValueChange={(value) => setSelectedMetric(value as keyof AggregatedReview)}
                            >
                                <SelectTrigger className="w-full sm:w-[220px]">
                                    <SelectValue placeholder="Select a metric to display..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="avgOverall">Overall Rating</SelectItem>
                                    <SelectItem value="avgPunctuality">Salary Punctuality</SelectItem>
                                    <SelectItem value="avgFairSalary">Fair Salary</SelectItem>
                                    <SelectItem value="avgConditions">Training Conditions</SelectItem>
                                    <SelectItem value="avgManagement">Club Management</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[450px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={sortedChartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
                                    <YAxis type="category" dataKey="clubName" width={100} tick={{ fontSize: 12 }} reversed={true} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(243, 244, 246, 0.5)' }}
                                        formatter={(value) => (typeof value === 'number' ? value.toFixed(2) : value)}
                                    />
                                    <Bar dataKey={selectedMetric} name={metricDisplayNames[selectedMetric]} fill="#31348D" barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Overall Club Standings</CardTitle>
                        <CardDescription>Based on the weighted average of all player reviews. Click a club to see comments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {data.map((club, index) => (
                                <div
                                    key={club.clubName}
                                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
                                    onClick={() => setSelectedClub(club)}
                                >
                                    <div className="flex items-center">
                                        <span className="font-bold text-lg w-10 text-center text-muted-foreground">{index + 1}.</span>
                                        <span className="font-medium">{club.clubName}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <StarRating rating={club.avgOverall} />
                                        <span className="text-xs text-muted-foreground">{club.reviewCount} reviews</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* The Modal for displaying individual reviews */}
            <Dialog open={!!selectedClub} onOpenChange={() => setSelectedClub(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Reviews for {selectedClub?.clubName}</DialogTitle>
                        <DialogDescription>
                            Showing {selectedClub?.reviews.length} anonymous reviews.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto pr-4 mt-4">
                        <div className="space-y-6">
                            {selectedClub?.reviews.map(review => (
                                <div key={review.id} className="border-b pb-4 last:border-b-0">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-semibold">Overall Rating</p>
                                            <StarRating rating={review.overall_rating} />
                                        </div>
                                        <p className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</p>
                                    </div>
                                    {review.comment && (
                                        <blockquote className="mt-2 pl-4 border-l-2 italic text-muted-foreground">
                                            "{review.comment}"
                                        </blockquote>
                                    )}
                                    <div className="mt-4 space-y-1">
                                        <StarRating rating={review.category_ratings?.["Salary Punctuality"] || 0} label="Salary Punctuality" />
                                        <StarRating rating={review.category_ratings?.["Fair Salary"] || 0} label="Fair Salary" />
                                        <StarRating rating={review.category_ratings?.["Training Conditions"] || 0} label="Training Conditions" />
                                        <StarRating rating={review.category_ratings?.["Club Management"] || 0} label="Club Management" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}