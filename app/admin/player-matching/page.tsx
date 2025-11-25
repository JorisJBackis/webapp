"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, AlertCircle, ExternalLink, Calendar, MapPin, User, TrendingUp, X, Check, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// NORMALIZED interfaces - fetch player data via JOINs
interface ReviewQueueItem {
  id: number;
  tm_player_id: number;
  candidate_1_id: number | null;
  candidate_1_confidence: number | null;
  candidate_2_id: number | null;
  candidate_2_confidence: number | null;
  candidate_3_id: number | null;
  candidate_3_confidence: number | null;
  reviewed: boolean;
  created_at: string;
}

interface TMPlayer {
  id: number;
  name: string;
  club_name: string;
  club_logo_url: string | null;
  transfermarkt_url: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  main_position: string | null;
  picture_url: string | null;
}

interface SFPlayer {
  sofascore_id: number;
  name: string;
  current_team_name: string;
  date_of_birth: string | null;
  nationality: string | null;
  position: string | null;
  photo_url: string | null;
  profile_url: string | null;
}

interface MatchDetails {
  tm_player_id: number;
  sf_player_id: number;
  name_match: boolean;
  dob_match: boolean;
  club_match: boolean;
  nationality_match: boolean;
  position_match: boolean;
  name_similarity_score: number;
  club_similarity_score: number;
}

interface ReviewItemWithData extends ReviewQueueItem {
  tm_player: TMPlayer;
  candidate_1?: SFPlayer;
  candidate_2?: SFPlayer;
  candidate_3?: SFPlayer;
}

interface AutoApprovedMatch {
  tm_player: TMPlayer;
  sf_player: SFPlayer;
  overall_confidence: number;
  name_match: boolean;
  dob_match: boolean;
  club_match: boolean;
  nationality_match: boolean;
  name_similarity_score: number;
  club_similarity_score: number;
  matched_at: string;
}

export default function PlayerMatchingReview() {
  const [reviewItems, setReviewItems] = useState<ReviewItemWithData[]>([]);
  const [autoApprovedMatches, setAutoApprovedMatches] = useState<AutoApprovedMatch[]>([]);
  const [manuallyApprovedMatches, setManuallyApprovedMatches] = useState<AutoApprovedMatch[]>([]);
  const [totalAutoApproved, setTotalAutoApproved] = useState<number>(0);
  const [totalManuallyApproved, setTotalManuallyApproved] = useState<number>(0);
  const [matchDetails, setMatchDetails] = useState<Map<string, MatchDetails>>(new Map());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("needs-review");
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadReviewQueue(), loadAutoApproved(), loadManuallyApproved()]);
    setLoading(false);
  }

  async function loadReviewQueue() {
    // Fetch review queue items (just IDs and confidences)
    // Sort by candidate_1_confidence descending (highest confidence first)
    const { data: queueData, error } = await supabase
      .from("player_matching_review_queue")
      .select("*")
      .eq("reviewed", false)
      .order("candidate_1_confidence", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("Error loading review queue:", error);
      return;
    }

    if (!queueData || queueData.length === 0) {
      setReviewItems([]);
      return;
    }

    // Fetch related player data for each review item
    const enrichedItems = await Promise.all(
      queueData.map(async (item: ReviewQueueItem) => {
        // Fetch TM player data with club info (if tm_player_id exists)
        const tmPlayer = item.tm_player_id ? await fetchTMPlayer(item.tm_player_id) : null;

        // Fetch SF candidates
        const candidate_1 = item.candidate_1_id ? await fetchSFPlayer(item.candidate_1_id) : undefined;
        const candidate_2 = item.candidate_2_id ? await fetchSFPlayer(item.candidate_2_id) : undefined;
        const candidate_3 = item.candidate_3_id ? await fetchSFPlayer(item.candidate_3_id) : undefined;

        // Load match details for each candidate (only if TM player exists)
        if (item.tm_player_id) {
          if (item.candidate_1_id) await loadMatchDetail(item.tm_player_id, item.candidate_1_id);
          if (item.candidate_2_id) await loadMatchDetail(item.tm_player_id, item.candidate_2_id);
          if (item.candidate_3_id) await loadMatchDetail(item.tm_player_id, item.candidate_3_id);
        }

        return {
          ...item,
          tm_player: tmPlayer!,
          candidate_1,
          candidate_2,
          candidate_3,
        };
      })
    );

    setReviewItems(enrichedItems as ReviewItemWithData[]);
  }

  async function fetchTMPlayer(playerId: number): Promise<TMPlayer | null> {
    const { data, error } = await supabase
      .from("players_transfermarkt")
      .select(`
        id,
        name,
        date_of_birth,
        nationality,
        main_position,
        picture_url,
        transfermarkt_url,
        clubs_transfermarkt!inner (
          name,
          logo_url
        )
      `)
      .eq("id", playerId)
      .single();

    if (error) {
      console.error("Error fetching TM player:", error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      club_name: (data as any).clubs_transfermarkt?.name || "",
      club_logo_url: (data as any).clubs_transfermarkt?.logo_url || null,
      transfermarkt_url: data.transfermarkt_url,
      date_of_birth: data.date_of_birth,
      nationality: data.nationality,
      main_position: data.main_position,
      picture_url: data.picture_url,
    };
  }

  async function fetchSFPlayer(playerId: number): Promise<SFPlayer | null> {
    const { data, error } = await supabase
      .from("sofascore_players_staging")
      .select("*")
      .eq("sofascore_id", playerId)
      .single();

    if (error) {
      console.error("Error fetching SF player:", error);
      return null;
    }

    return data as SFPlayer;
  }

  async function loadMatchDetail(tmPlayerId: number, sfPlayerId: number) {
    const { data } = await supabase
      .from("player_matching_candidates")
      .select("*")
      .eq("tm_player_id", tmPlayerId)
      .eq("sf_player_id", sfPlayerId)
      .single();

    if (data) {
      setMatchDetails(prev => new Map(prev).set(`${tmPlayerId}-${sfPlayerId}`, data as MatchDetails));
    }
  }

  async function loadAutoApproved() {
    // First get the total count for display in the tab
    const { count: totalCount } = await supabase
      .from("player_matching_candidates")
      .select("*", { count: "exact", head: true })
      .eq("match_status", "auto_approved");

    // Then fetch only the most recent 100 for display (to avoid overwhelming the UI)
    const { data, error } = await supabase
      .from("player_matching_candidates")
      .select("*")
      .eq("match_status", "auto_approved")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error loading auto-approved matches:", error);
      return;
    }

    if (!data || data.length === 0) {
      setAutoApprovedMatches([]);
      return;
    }

    // Fetch player data for each match (now only 100 max = 200 queries)
    const enrichedMatches = await Promise.all(
      data.map(async (match: any) => {
        const tmPlayer = await fetchTMPlayer(match.tm_player_id);
        const sfPlayer = await fetchSFPlayer(match.sf_player_id);

        if (!tmPlayer || !sfPlayer) return null;

        return {
          tm_player: tmPlayer,
          sf_player: sfPlayer,
          overall_confidence: match.overall_confidence,
          name_match: match.name_match,
          dob_match: match.dob_match,
          club_match: match.club_match,
          nationality_match: match.nationality_match,
          name_similarity_score: match.name_similarity_score || 0,
          club_similarity_score: match.club_similarity_score || 0,
          matched_at: match.created_at,
        };
      })
    );

    setAutoApprovedMatches(enrichedMatches.filter(Boolean) as AutoApprovedMatch[]);
    setTotalAutoApproved(totalCount || data.length);
  }

  async function loadManuallyApproved() {
    // First get the total count for display in the tab
    const { count: totalCount } = await supabase
      .from("player_matching_candidates")
      .select("*", { count: "exact", head: true })
      .eq("match_status", "manually_approved");

    // Then fetch only the most recent 100 for display
    const { data, error } = await supabase
      .from("player_matching_candidates")
      .select("*")
      .eq("match_status", "manually_approved")
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error loading manually approved matches:", error);
      return;
    }

    if (!data || data.length === 0) {
      setManuallyApprovedMatches([]);
      setTotalManuallyApproved(0);
      return;
    }

    // Fetch player data for each match
    const enrichedMatches = await Promise.all(
      data.map(async (match: any) => {
        const tmPlayer = await fetchTMPlayer(match.tm_player_id);
        const sfPlayer = await fetchSFPlayer(match.sf_player_id);

        if (!tmPlayer || !sfPlayer) return null;

        return {
          tm_player: tmPlayer,
          sf_player: sfPlayer,
          overall_confidence: match.overall_confidence,
          name_match: match.name_match,
          dob_match: match.dob_match,
          club_match: match.club_match,
          nationality_match: match.nationality_match,
          name_similarity_score: match.name_similarity_score || 0,
          club_similarity_score: match.club_similarity_score || 0,
          matched_at: match.updated_at,
        };
      })
    );

    setManuallyApprovedMatches(enrichedMatches.filter(Boolean) as AutoApprovedMatch[]);
    setTotalManuallyApproved(totalCount || data.length);
  }

  async function approveMatch(item: ReviewItemWithData, candidateId: number) {
    setProcessing(item.id);

    try {
      console.log('[approveMatch] Starting approval process...', {
        tm_player_id: item.tm_player_id,
        candidateId,
        review_item_id: item.id
      });

      // 1. Update the Transfermarkt player with SofaScore ID
      console.log('[approveMatch] Step 1: Updating players_transfermarkt...');
      const { error: updateError } = await supabase
        .from("players_transfermarkt")
        .update({ sofascore_id: candidateId })
        .eq("id", item.tm_player_id);

      if (updateError) {
        console.error('[approveMatch] Step 1 failed:', updateError);
        throw new Error(`Failed to update player: ${updateError.message}`);
      }
      console.log('[approveMatch] Step 1: Success ✓');

      // 2. Mark review item as reviewed
      console.log('[approveMatch] Step 2: Updating review queue...');
      const { error: reviewError } = await supabase
        .from("player_matching_review_queue")
        .update({
          reviewed: true,
          reviewed_at: new Date().toISOString(),
          approved_sf_player_id: candidateId,
        })
        .eq("id", item.id);

      if (reviewError) {
        console.error('[approveMatch] Step 2 failed:', reviewError);
        throw new Error(`Failed to update review queue: ${reviewError.message}`);
      }
      console.log('[approveMatch] Step 2: Success ✓');

      // 3. Update match candidate status
      console.log('[approveMatch] Step 3: Updating match candidate...');
      const { error: candidateError } = await supabase
        .from("player_matching_candidates")
        .update({ match_status: "manually_approved" })
        .eq("tm_player_id", item.tm_player_id)
        .eq("sf_player_id", candidateId);

      if (candidateError) {
        console.error('[approveMatch] Step 3 failed:', candidateError);
        throw new Error(`Failed to update match candidate: ${candidateError.message}`);
      }
      console.log('[approveMatch] Step 3: Success ✓');

      // Update local state instead of reloading
      console.log('[approveMatch] Updating local state...');

      // Remove from review queue
      setReviewItems(prev => prev.filter(i => i.id !== item.id));

      // Add to manually approved list
      const approvedCandidate = item.candidate_1?.sofascore_id === candidateId ? item.candidate_1 :
                                 item.candidate_2?.sofascore_id === candidateId ? item.candidate_2 :
                                 item.candidate_3;

      if (approvedCandidate) {
        const newMatch: AutoApprovedMatch = {
          tm_player: item.tm_player,
          sf_player: approvedCandidate,
          overall_confidence: item.candidate_1?.sofascore_id === candidateId ? item.candidate_1_confidence :
                              item.candidate_2?.sofascore_id === candidateId ? item.candidate_2_confidence :
                              item.candidate_3_confidence,
          name_match: true,
          dob_match: true,
          club_match: true,
          nationality_match: true,
          name_similarity_score: 0,
          club_similarity_score: 0,
          matched_at: new Date().toISOString(),
        };
        setManuallyApprovedMatches(prev => [newMatch, ...prev]);
      }

      console.log('[approveMatch] ✓ Match approved successfully!');
    } catch (error) {
      console.error("Error approving match:", error);
      alert(`Failed to approve match: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(null);
    }
  }

  async function rejectMatch(item: ReviewItemWithData, reason: string) {
    setProcessing(item.id);

    try {
      // Mark review item as reviewed with rejection
      const { error } = await supabase
        .from("player_matching_review_queue")
        .update({
          reviewed: true,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq("id", item.id);

      if (error) throw error;

      // Update all candidates as rejected
      const { error: candidateError } = await supabase
        .from("player_matching_candidates")
        .update({ match_status: "rejected" })
        .eq("tm_player_id", item.tm_player_id);

      if (candidateError) throw candidateError;

      // Reload data
      await loadData();
    } catch (error) {
      console.error("Error rejecting match:", error);
      alert("Failed to reject match. Check console for details.");
    } finally {
      setProcessing(null);
    }
  }

  function getMatchKey(tmPlayerId: number, sfPlayerId: number): string {
    return `${tmPlayerId}-${sfPlayerId}`;
  }

  function renderMatchIndicators(tmPlayerId: number, sfPlayerId: number) {
    const details = matchDetails.get(getMatchKey(tmPlayerId, sfPlayerId));
    if (!details) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-3">
        <Badge variant={details.name_match ? "default" : "secondary"} className="text-xs">
          {details.name_match ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
          Name {(details.name_similarity_score || 0).toFixed(0)}%
        </Badge>
        <Badge variant={details.dob_match ? "default" : "secondary"} className="text-xs">
          {details.dob_match ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
          DOB
        </Badge>
        <Badge variant={details.club_match ? "default" : "secondary"} className="text-xs">
          {details.club_match ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
          Club {(details.club_similarity_score || 0).toFixed(0)}%
        </Badge>
        <Badge variant={details.nationality_match ? "default" : "secondary"} className="text-xs">
          {details.nationality_match ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
          Nationality
        </Badge>
        <Badge variant={details.position_match ? "default" : "secondary"} className="text-xs">
          {details.position_match ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
          Position
        </Badge>
      </div>
    );
  }

  function renderCandidate(candidate: SFPlayer, confidence: number, tmPlayerId: number, primary: boolean = false) {
    const opacity = primary ? "" : primary === false ? "opacity-75" : "opacity-60";

    return (
      <div className={`bg-green-50 dark:bg-green-950/${primary ? '20' : '10'} rounded-lg p-4 border-2 ${primary ? 'border-green-200 dark:border-green-900' : 'border-green-100 dark:border-green-900/50'} ${opacity}`}>
        <div className="flex gap-4 mb-3">
          {candidate.photo_url ? (
            <Image
              src={candidate.photo_url}
              alt={candidate.name}
              width={70}
              height={70}
              className={`rounded-lg object-cover ${primary ? 'border-2 border-green-300' : ''}`}
              referrerPolicy="no-referrer"
              unoptimized
            />
          ) : (
            <div className="w-[70px] h-[70px] bg-muted rounded-lg flex items-center justify-center">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {candidate.profile_url ? (
                <Link
                  href={candidate.profile_url}
                  target="_blank"
                  className="text-lg font-bold hover:underline flex items-center gap-1"
                >
                  {candidate.name}
                  <ExternalLink className="w-4 h-4" />
                </Link>
              ) : (
                <span className="text-lg font-bold">{candidate.name}</span>
              )}
              <Badge variant={primary ? "default" : "secondary"} className="ml-auto">
                {(confidence * 100).toFixed(1)}%
              </Badge>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3 h-3" />
                {candidate.current_team_name}
              </div>
              {candidate.date_of_birth && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  {new Date(candidate.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              )}
              {candidate.nationality && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  {candidate.nationality}
                </div>
              )}
            </div>

            {renderMatchIndicators(tmPlayerId, candidate.sofascore_id)}
          </div>
        </div>

        <Button
          onClick={() => approveMatch({ ...reviewItems.find(r => r.tm_player_id === tmPlayerId)! }, candidate.sofascore_id)}
          disabled={processing !== null}
          className="w-full"
          variant={primary ? "default" : "outline"}
          size="sm"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Approve This Match
        </Button>
      </div>
    );
  }

  function renderUnmatchedSFPlayer(player: SFPlayer) {
    return (
      <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-5 border-2 border-green-200 dark:border-green-900">
        <div className="flex gap-5">
          {player.photo_url ? (
            <Image
              src={player.photo_url}
              alt={player.name}
              width={100}
              height={100}
              className="rounded-lg object-cover border-2 border-green-300"
              referrerPolicy="no-referrer"
              unoptimized
            />
          ) : (
            <div className="w-[100px] h-[100px] bg-muted rounded-lg flex items-center justify-center border-2 border-green-300">
              <User className="w-12 h-12 text-muted-foreground" />
            </div>
          )}

          <div className="flex-1">
            {player.profile_url ? (
              <Link
                href={player.profile_url}
                target="_blank"
                className="text-2xl font-bold mb-2 hover:underline flex items-center gap-2"
              >
                {player.name}
                <ExternalLink className="w-5 h-5" />
              </Link>
            ) : (
              <h3 className="text-2xl font-bold mb-2">{player.name}</h3>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{player.current_team_name}</span>
              </div>
              {player.date_of_birth && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{new Date(player.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
              {player.nationality && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{player.nationality}</span>
                </div>
              )}
              {player.position && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{player.position}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading player matching data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3">Player Matching Dashboard</h1>
        <p className="text-muted-foreground text-lg">
          Review and approve Transfermarkt ↔ SofaScore player matches
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="needs-review" className="text-base">
            <AlertCircle className="w-4 h-4 mr-2" />
            Needs Review ({reviewItems.length})
          </TabsTrigger>
          <TabsTrigger value="auto-approved" className="text-base">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Auto-Approved ({totalAutoApproved})
          </TabsTrigger>
          <TabsTrigger value="manually-approved" className="text-base">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Manually Approved ({totalManuallyApproved})
          </TabsTrigger>
        </TabsList>

        {/* NEEDS REVIEW TAB */}
        <TabsContent value="needs-review" className="space-y-6">
          {reviewItems.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle2 className="w-20 h-20 mx-auto mb-4 text-green-500" />
              <h2 className="text-3xl font-bold mb-2">All Clear!</h2>
              <p className="text-muted-foreground text-lg">
                No players need manual review at the moment.
              </p>
            </Card>
          ) : (
            reviewItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="bg-muted/50 px-6 py-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold">Ambiguous Match</h3>
                      <p className="text-sm text-muted-foreground">
                        Multiple candidates found - manual verification required
                      </p>
                    </div>
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      70-80% Confidence
                    </Badge>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Transfermarkt Player */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-1 bg-blue-500 rounded-full" />
                        <h4 className="text-lg font-bold">Transfermarkt Source</h4>
                      </div>

                      {item.tm_player ? (
                        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-5 border-2 border-blue-200 dark:border-blue-900">
                          <div className="flex gap-5">
                            {item.tm_player.picture_url ? (
                              <Image
                                src={item.tm_player.picture_url}
                                alt={item.tm_player.name}
                                width={100}
                                height={100}
                                className="rounded-lg object-cover border-2 border-blue-300"
                              />
                            ) : (
                              <div className="w-[100px] h-[100px] bg-muted rounded-lg flex items-center justify-center border-2 border-blue-300">
                                <User className="w-12 h-12 text-muted-foreground" />
                              </div>
                            )}

                            <div className="flex-1">
                              {item.tm_player.transfermarkt_url ? (
                                <Link
                                  href={item.tm_player.transfermarkt_url}
                                  target="_blank"
                                  className="text-2xl font-bold mb-2 hover:underline flex items-center gap-2"
                                >
                                  {item.tm_player.name}
                                  <ExternalLink className="w-5 h-5" />
                                </Link>
                              ) : (
                                <h3 className="text-2xl font-bold mb-2">{item.tm_player.name}</h3>
                              )}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  {item.tm_player.club_logo_url ? (
                                    <Image
                                      src={item.tm_player.club_logo_url}
                                      alt={item.tm_player.club_name}
                                      width={16}
                                      height={16}
                                      className="object-contain"
                                    />
                                  ) : (
                                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                  )}
                                  <span className="font-medium">{item.tm_player.club_name}</span>
                                </div>
                                {item.tm_player.date_of_birth && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span>{new Date(item.tm_player.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                  </div>
                                )}
                                {item.tm_player.nationality && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                    <span>{item.tm_player.nationality}</span>
                                  </div>
                                )}
                                {item.tm_player.main_position && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <span>{item.tm_player.main_position}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-5 border-2 border-yellow-200 dark:border-yellow-900">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                            <div>
                              <h4 className="font-bold text-yellow-900 dark:text-yellow-100">No Transfermarkt Match Found</h4>
                              <p className="text-sm text-yellow-700 dark:text-yellow-300">This SofaScore player does not exist in Transfermarkt database (confidence: 0%)</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SofaScore Candidates */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-1 bg-green-500 rounded-full" />
                        <h4 className="text-lg font-bold">SofaScore {item.tm_player ? 'Candidates' : 'Player'}</h4>
                      </div>

                      <div className="space-y-3">
                        {/* Show candidate_1 even if there's no TM match (for unmatched SF players) */}
                        {item.candidate_1 && (
                          item.tm_player
                            ? renderCandidate(item.candidate_1, item.candidate_1_confidence, item.tm_player_id, true)
                            : renderUnmatchedSFPlayer(item.candidate_1)
                        )}

                        {item.candidate_2 && item.candidate_2_confidence &&
                          renderCandidate(item.candidate_2, item.candidate_2_confidence, item.tm_player_id, false)}

                        {item.candidate_3 && item.candidate_3_confidence &&
                          renderCandidate(item.candidate_3, item.candidate_3_confidence, item.tm_player_id, false)}

                        {/* Reject All */}
                        <Button
                          onClick={() => rejectMatch(item, item.tm_player ? "No suitable match found" : "SofaScore player not in Transfermarkt")}
                          disabled={processing === item.id}
                          variant="destructive"
                          className="w-full mt-4"
                          size="sm"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          {item.tm_player ? 'Reject All Candidates' : 'Mark as Not in Transfermarkt'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* AUTO-APPROVED TAB */}
        <TabsContent value="auto-approved" className="space-y-4">
          {autoApprovedMatches.length === 0 ? (
            <Card className="p-12 text-center">
              <AlertCircle className="w-20 h-20 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-3xl font-bold mb-2">No Auto-Approved Matches Yet</h2>
              <p className="text-muted-foreground text-lg">
                Run the matching pipeline to see high-confidence matches here.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {totalAutoApproved > 100 && (
                <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg text-sm">
                  Showing 100 most recent of {totalAutoApproved} auto-approved matches
                </div>
              )}
              {autoApprovedMatches.map((match, idx) => (
                <Card key={idx} className="p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-6">
                    {/* TM Player */}
                    <div className="flex items-center gap-3 flex-1">
                      {match.tm_player.picture_url ? (
                        <Image
                          src={match.tm_player.picture_url}
                          alt={match.tm_player.name}
                          width={60}
                          height={60}
                          className="rounded-lg object-cover border-2 border-blue-200"
                        />
                      ) : (
                        <div className="w-[60px] h-[60px] bg-muted rounded-lg flex items-center justify-center">
                          <User className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        {match.tm_player.transfermarkt_url ? (
                          <Link
                            href={match.tm_player.transfermarkt_url}
                            target="_blank"
                            className="font-bold text-lg hover:underline flex items-center gap-1"
                          >
                            {match.tm_player.name}
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        ) : (
                          <h4 className="font-bold text-lg">{match.tm_player.name}</h4>
                        )}
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          <div className="flex items-center gap-2">
                            {match.tm_player.club_logo_url ? (
                              <Image
                                src={match.tm_player.club_logo_url}
                                alt={match.tm_player.club_name}
                                width={12}
                                height={12}
                                className="object-contain"
                              />
                            ) : (
                              <TrendingUp className="w-3 h-3" />
                            )}
                            {match.tm_player.club_name}
                          </div>
                          {match.tm_player.date_of_birth && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              {new Date(match.tm_player.date_of_birth).toLocaleDateString('en-GB')}
                            </div>
                          )}
                          {match.tm_player.nationality && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3" />
                              {match.tm_player.nationality}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center">
                        <Badge variant="default" className="mb-1">
                          {(match.overall_confidence * 100).toFixed(1)}%
                        </Badge>
                        <div className="text-2xl">→</div>
                      </div>
                    </div>

                    {/* SF Player */}
                    <div className="flex items-center gap-3 flex-1">
                      {match.sf_player.photo_url ? (
                        <Image
                          src={match.sf_player.photo_url}
                          alt={match.sf_player.name}
                          width={60}
                          height={60}
                          className="rounded-lg object-cover border-2 border-green-200"
                          referrerPolicy="no-referrer"
                          unoptimized
                        />
                      ) : (
                        <div className="w-[60px] h-[60px] bg-muted rounded-lg flex items-center justify-center">
                          <User className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        {match.sf_player.profile_url ? (
                          <Link
                            href={match.sf_player.profile_url}
                            target="_blank"
                            className="font-bold text-lg hover:underline flex items-center gap-1"
                          >
                            {match.sf_player.name}
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        ) : (
                          <h4 className="font-bold text-lg">{match.sf_player.name}</h4>
                        )}
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-3 h-3" />
                            {match.sf_player.current_team_name}
                          </div>
                          {match.sf_player.date_of_birth && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              {new Date(match.sf_player.date_of_birth).toLocaleDateString('en-GB')}
                            </div>
                          )}
                          {match.sf_player.nationality && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3" />
                              {match.sf_player.nationality}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Match Details */}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={match.name_match ? "default" : "secondary"} className="text-xs">
                        {match.name_match ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                        Name {(match.name_similarity_score || 0).toFixed(0)}%
                      </Badge>
                      <Badge variant={match.dob_match ? "default" : "secondary"} className="text-xs">
                        {match.dob_match ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                        DOB
                      </Badge>
                      <Badge variant={match.club_match ? "default" : "secondary"} className="text-xs">
                        {match.club_match ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                        Club {(match.club_similarity_score || 0).toFixed(0)}%
                      </Badge>
                      <Badge variant={match.nationality_match ? "default" : "secondary"} className="text-xs">
                        {match.nationality_match ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                        Nat
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* MANUALLY APPROVED TAB */}
        <TabsContent value="manually-approved" className="space-y-4">
          {manuallyApprovedMatches.length === 0 ? (
            <Card className="p-12 text-center">
              <AlertCircle className="w-20 h-20 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-3xl font-bold mb-2">No Manually Approved Matches Yet</h2>
              <p className="text-muted-foreground text-lg">
                Approve matches from the review queue to see them here.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {manuallyApprovedMatches.map((match, idx) => (
                <Card key={idx} className="p-5 hover:shadow-md transition-shadow border-blue-200">
                  <div className="flex items-center gap-6">
                    {/* TM Player */}
                    <div className="flex items-center gap-3 flex-1">
                      {match.tm_player.picture_url ? (
                        <Image
                          src={match.tm_player.picture_url}
                          alt={match.tm_player.name}
                          width={60}
                          height={60}
                          className="rounded-lg object-cover border-2 border-blue-200"
                        />
                      ) : (
                        <div className="w-[60px] h-[60px] bg-muted rounded-lg flex items-center justify-center">
                          <User className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        {match.tm_player.transfermarkt_url ? (
                          <Link
                            href={match.tm_player.transfermarkt_url}
                            target="_blank"
                            className="font-bold text-lg hover:underline flex items-center gap-1"
                          >
                            {match.tm_player.name}
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        ) : (
                          <h3 className="font-bold text-lg">{match.tm_player.name}</h3>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {match.tm_player.club_logo_url && (
                            <Image
                              src={match.tm_player.club_logo_url}
                              alt={match.tm_player.club_name}
                              width={16}
                              height={16}
                              className="object-contain"
                            />
                          )}
                          <span>{match.tm_player.club_name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Match Arrow */}
                    <div className="flex flex-col items-center">
                      <ArrowRight className="w-8 h-8 text-blue-600" />
                      <span className="text-xs font-semibold text-blue-600 mt-1">
                        {(match.overall_confidence * 100).toFixed(1)}%
                      </span>
                    </div>

                    {/* SF Player */}
                    <div className="flex items-center gap-3 flex-1">
                      {match.sf_player.photo_url ? (
                        <Image
                          src={match.sf_player.photo_url}
                          alt={match.sf_player.name}
                          width={60}
                          height={60}
                          className="rounded-lg object-cover border-2 border-blue-200"
                          referrerPolicy="no-referrer"
                          unoptimized
                        />
                      ) : (
                        <div className="w-[60px] h-[60px] bg-muted rounded-lg flex items-center justify-center">
                          <User className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        {match.sf_player.profile_url ? (
                          <Link
                            href={match.sf_player.profile_url}
                            target="_blank"
                            className="font-bold text-lg hover:underline flex items-center gap-1"
                          >
                            {match.sf_player.name}
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        ) : (
                          <h3 className="font-bold text-lg">{match.sf_player.name}</h3>
                        )}
                        <p className="text-sm text-muted-foreground">{match.sf_player.current_team_name}</p>
                      </div>
                    </div>

                    {/* Match Details */}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={match.name_match ? "default" : "secondary"} className="text-xs">
                        {match.name_match ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                        Name {(match.name_similarity_score || 0).toFixed(0)}%
                      </Badge>
                      <Badge variant={match.dob_match ? "default" : "secondary"} className="text-xs">
                        {match.dob_match ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                        DOB
                      </Badge>
                      <Badge variant={match.club_match ? "default" : "secondary"} className="text-xs">
                        {match.club_match ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                        Club {(match.club_similarity_score || 0).toFixed(0)}%
                      </Badge>
                      <Badge variant={match.nationality_match ? "default" : "secondary"} className="text-xs">
                        {match.nationality_match ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                        Nat
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
