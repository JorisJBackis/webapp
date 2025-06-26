// components/marketplace/agency-rb-prospects-tab.tsx
"use client";

import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Search, Instagram, Link as LinkIcon } from 'lucide-react'; // Removed unused icons
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TooltipProvider } from "@/components/ui/tooltip"; // Tooltip might still be useful for other columns if added
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination';

type AgencyRBProspect = {
    id: number;
    player_name: string | null;
    transfermarkt_url: string | null;
    instagram_url: string | null;
    reached_out_on: string | null;
    their_response: string | null; // Keep in type if API still sends it, just don't display
    goals: number | null;
    assists: number | null;
    matches_played: number | null;
    original_league_name: string | null;
    original_team_name: string | null;
    position_excel: string | null;
    age: number | null;
    market_value: number | null;
    contract_expires: string | null;
    passport_country: string | null;
    foot: string | null;
    height: number | null;
    weight: number | null;
    on_loan: string | null;
    successful_defensive_actions_p90: number | null;
    defensive_duels_won_pct: number | null;
    accurate_crosses_pct: number | null;
    accurate_passes_pct: number | null;
    key_passes_p90: number | null;
    xa_p90: number | null;
    footy_labs_score: number | null;
};

const ITEMS_PER_PAGE = 15;

export default function AgencyRBProspectsTab() {
    const [prospects, setProspects] = useState<AgencyRBProspect[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        const fetchProspects = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/agency-rb-prospects?page=${currentPage}&limit=${ITEMS_PER_PAGE}`);
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
                }
                const { data, count }: { data: AgencyRBProspect[], count: number } = await response.json();
                setProspects(data || []);
                setTotalCount(count || 0);
            } catch (err: any) {
                setError(err.message || "Could not load agency prospects.");
                console.error("Error fetching agency prospects:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProspects();
    }, [currentPage]);

    const filteredProspects = prospects.filter(prospect =>
        !searchQuery || (prospect.player_name && prospect.player_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const formatCurrency = (value: number | null) => {
        if (value === null || isNaN(value)) return 'N/A';
        return `€${value.toLocaleString()}`;
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) {
            return dateString;
        }
    };

    const formatDecimal = (value: number | null, precision = 2) => {
        if (value === null || value === undefined || isNaN(value)) return 'N/A';
        return value.toFixed(precision);
    }

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    const renderPaginationItems = () => {
        const items = [];
        const maxPagesToShow = 5;
        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) {
                items.push(<PaginationItem key={i}><PaginationLink href="#" isActive={i === currentPage} onClick={(e) => { e.preventDefault(); setCurrentPage(i); }}>{i}</PaginationLink></PaginationItem>);
            }
        } else {
            items.push(<PaginationItem key={1}><PaginationLink href="#" isActive={1 === currentPage} onClick={(e) => { e.preventDefault(); setCurrentPage(1); }}>1</PaginationLink></PaginationItem>);
            if (currentPage > 3) items.push(<PaginationEllipsis key="start-ellipsis" />);
            let startPage = Math.max(2, currentPage - 1);
            let endPage = Math.min(totalPages - 1, currentPage + 1);
            if (currentPage <= 2) endPage = Math.min(totalPages - 1, 3);
            if (currentPage >= totalPages -1) startPage = Math.max(2, totalPages - 2);
            for (let i = startPage; i <= endPage; i++) {
                items.push(<PaginationItem key={i}><PaginationLink href="#" isActive={i === currentPage} onClick={(e) => { e.preventDefault(); setCurrentPage(i); }}>{i}</PaginationLink></PaginationItem>);
            }
            if (currentPage < totalPages - 2) items.push(<PaginationEllipsis key="end-ellipsis" />);
            items.push(<PaginationItem key={totalPages}><PaginationLink href="#" isActive={totalPages === currentPage} onClick={(e) => { e.preventDefault(); setCurrentPage(totalPages); }}>{totalPages}</PaginationLink></PaginationItem>);
        }
        return items;
    };

    return (
        <TooltipProvider> {/* Keep for potential future tooltips on other columns */}
            <Card>
                <CardHeader>
                    <CardTitle>Curated Prospects</CardTitle>
                    <CardDescription>Exclusive players sourced and contacted by FootyLabs, ready for new opportunities.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative flex-1 min-w-[200px] max-w-xs">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by player name..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading && <div className="flex justify-center items-center py-10 h-64"><Loader2 className="h-12 w-12 animate-spin text-[#31348D]" /></div>}
                    {error && <Alert variant="destructive" className="my-6"><AlertCircle className="h-4 w-4" /><AlertTitle>Error Loading Prospects</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                    {!loading && !error && prospects.length === 0 && totalCount === 0 && <p className="text-center text-muted-foreground py-10">No agency prospects found.</p>}
                    {!loading && !error && prospects.length > 0 && filteredProspects.length === 0 && <p className="text-center text-muted-foreground py-10">No prospects match your current search query.</p>}

                    {!loading && !error && filteredProspects.length > 0 && (
                        <>
                            <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                                <Table className="min-w-[1600px]"> {/* Adjusted min-width slightly */}
                                    <TableHeader className="bg-slate-100">
                                        <TableRow>
                                            <TableHead className="sticky left-0 bg-slate-100 z-10 w-[180px] font-semibold text-slate-700">Player</TableHead>
                                            <TableHead className="w-[150px] font-semibold text-slate-700">Team</TableHead>
                                            <TableHead className="w-[150px] font-semibold text-slate-700">League</TableHead>
                                            <TableHead className="w-[120px] font-semibold text-slate-700">Position</TableHead> {/* Changed Header */}
                                            <TableHead className="w-[60px] text-center font-semibold text-slate-700">Age</TableHead>
                                            <TableHead className="w-[70px] text-center font-semibold text-slate-700">Height</TableHead>
                                            <TableHead className="w-[80px] font-semibold text-slate-700">Foot</TableHead>
                                            <TableHead className="w-[120px] font-semibold text-slate-700">Market Val.</TableHead>
                                            <TableHead className="w-[100px] font-semibold text-slate-700">Contract End</TableHead>
                                            <TableHead className="w-[60px] text-center font-semibold text-slate-700">G</TableHead>
                                            <TableHead className="w-[60px] text-center font-semibold text-slate-700">A</TableHead>
                                            <TableHead className="w-[60px] text-center font-semibold text-slate-700">MP</TableHead>
                                            <TableHead className="w-[100px] text-center font-semibold text-slate-700">FootyLabs Score</TableHead>
                                            {/* Response Column Removed from Headers */}
                                            <TableHead className="w-[100px] text-center font-semibold text-slate-700">Links</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProspects.map((p) => (
                                            <TableRow key={p.id} className="hover:bg-slate-50">
                                                <TableCell className="font-medium sticky left-0 bg-white group-hover:bg-slate-50 z-10 w-[180px] group-hover:shadow-md">
                                                    {p.player_name}
                                                </TableCell>
                                                <TableCell>{p.original_team_name || 'N/A'}</TableCell>
                                                <TableCell>{p.original_league_name || 'N/A'}</TableCell>
                                                <TableCell><Badge variant="outline">{p.position_excel || 'N/A'}</Badge></TableCell> {/* Still shows original Excel pos */}
                                                <TableCell className="text-center">{p.age ?? 'N/A'}</TableCell>
                                                <TableCell className="text-center">{p.height ? `${p.height} cm` : 'N/A'}</TableCell>
                                                <TableCell>{p.foot || 'N/A'}</TableCell>
                                                <TableCell>{formatCurrency(p.market_value)}</TableCell>
                                                <TableCell>{formatDate(p.contract_expires)}</TableCell>
                                                <TableCell className="text-center">{p.goals ?? 'N/A'}</TableCell>
                                                <TableCell className="text-center">{p.assists ?? 'N/A'}</TableCell>
                                                <TableCell className="text-center">{p.matches_played ?? 'N/A'}</TableCell>
                                                <TableCell className="text-center font-semibold text-footylabs-newblue">{formatDecimal(p.footy_labs_score, 2)}</TableCell>
                                                {/* Response Cell Removed */}
                                                <TableCell className="text-center space-x-1">
                                                    {p.transfermarkt_url && (
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-blue-100" asChild>
                                                            <a href={p.transfermarkt_url} target="_blank" rel="noopener noreferrer" title="Transfermarkt">
                                                                <LinkIcon className="h-4 w-4 text-blue-600"/>
                                                            </a>
                                                        </Button>
                                                    )}
                                                    {p.instagram_url && (
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-pink-100" asChild>
                                                            <a href={p.instagram_url} target="_blank" rel="noopener noreferrer" title="Instagram">
                                                                <Instagram className="h-4 w-4 text-pink-600"/>
                                                            </a>
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                            {totalPages > 1 && (
                                <Pagination className="mt-6">
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href="#"
                                                onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage(currentPage - 1); }}
                                                aria-disabled={currentPage === 1}
                                                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                                            />
                                        </PaginationItem>
                                        {renderPaginationItems()}
                                        <PaginationItem>
                                            <PaginationNext
                                                href="#"
                                                onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) setCurrentPage(currentPage + 1); }}
                                                aria-disabled={currentPage === totalPages}
                                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </TooltipProvider>
    );
}