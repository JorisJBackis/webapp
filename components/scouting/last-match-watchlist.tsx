"use client"

import {useState, useEffect} from "react"
import {createClient} from "@/lib/supabase/client"
import {Progress} from "@/components/ui/progress"
import SoccerIcon from "@/components/scouting/soccer-icon"
import Link from "next/link"
import {Loader2} from "lucide-react"

export function LastMatchWatchlist({
  playerId, 
  playerName,
  onPlayerNameUpdate,
  onClubNameUpdate
}: {
  playerId: number | string
  playerName: string
  onPlayerNameUpdate?: (fullName: string) => void
  onClubNameUpdate?: (clubName: string) => void
}) {
  const [matchData, setMatchData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetchLastMatch = async () => {
      try {

        // Step 1: Get wyscout_player_id from players table using the playerId (wyscout_player_id)
        console.log(`📖 Step 1: Looking up in 'players' table...`)
        const {data: playerData, error: playerError} = await supabase
            .from("players")
            .select("wyscout_player_id")
            .eq("id", playerId)
            .single()

        if (playerError || !playerData) {
          console.error(`❌ Step 1 failed: Could not find player in 'players' table`, playerError)
          setLoading(false)
          return
        }

        const wyscoutPlayerId = playerData.wyscout_player_id

        const {data: mergingData, error: mergingError} = await supabase
            .from("merging_players_names")
            .select("transfermarkt_player_id")
            .eq("wyscout_player_id", wyscoutPlayerId)
            .single()

        if (mergingError || !mergingData) {
          setLoading(false)
          return
        }

        const transfermarktPlayerId = mergingData.transfermarkt_player_id

        const {data: matchResults, error: matchError} = await supabase
            .from("transfermarkt_matches_data")
            .select("*")
            .eq("transfermarkt_player_id", transfermarktPlayerId)
            .order("match_date", {ascending: false})
            .limit(1)

        if (matchError || !matchResults || matchResults.length === 0) {
          console.error(`❌ Step 3 failed: No matches found for this player`, matchError)
          setLoading(false)
          return
        }

        const data = matchResults[0]
        console.log(`✅ Step 3 complete: Found latest match`)

        const fullPlayerName = data.player_name
        const fullClubName = data.team_name

        // Call callbacks to update parent component
        if (onPlayerNameUpdate) {
          onPlayerNameUpdate(fullPlayerName)
        }
        if (onClubNameUpdate) {
          onClubNameUpdate(fullClubName)
        }

        console.log(`✅ All steps complete:`, {
          player: playerName,
          opponent: data.opponent,
          date: data.match_date
        })

        // Calculate days ago
        const matchDate = new Date(data.match_date)
        const today = new Date()
        const diffTime = Math.abs(today.getTime() - matchDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        // Transform the data
        setMatchData({
          matchId: data.match_id,
          playerName: data.player_name,  // Get full name from transfermarkt_matches_data
          opponent: data.opponent || "Unknown",
          result: determineResult(data.match_result, data.home_or_away),
          score: data.match_result,
          date: data.match_date,
          minutesPlayed: data.minutes_played,
          goals: data.goals,
          assists: data.assists,
          yellowCards: data.yellow_cards,
          redCards: data.red_cards,
          daysAgo: diffDays,
        })

      } catch (err) {
        console.error("💥 Error fetching last match:", err)
      } finally {
        setLoading(false)
      }
    }

    if (playerName && playerId) {
      fetchLastMatch()
    }
  }, [playerName, playerId])

  // Helper function to determine W/D/L
  const determineResult = (score: string, homeOrAway: string): "W" | "L" | "D" => {
    if (!score) return "D"

    const mainScore = score.split("(")[0]
    const scoreParts = mainScore.split(":")

    if (scoreParts.length !== 2) return "D"

    const [homeGoals, awayGoals] = scoreParts.map(s => parseInt(s.trim()))

    if (isNaN(homeGoals) || isNaN(awayGoals)) return "D"

    if (homeOrAway === "home") {
      if (homeGoals > awayGoals) return "W"
      if (homeGoals < awayGoals) return "L"
      return "D"
    } else {
      if (awayGoals > homeGoals) return "W"
      if (awayGoals < homeGoals) return "L"
      return "D"
    }
  }

  if (loading) {
    return (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/>
        </div>
    )
  }

  if (!matchData) {
    return (
        <div className="p-2">
          <span className="text-muted-foreground text-sm">No Transfermarkt matches found</span>
        </div>
    )
  }

  return (
      <Link
          href={`/players/${playerId}/all-matches/${matchData.matchId}`}
          onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-2 cursor-pointer p-2 hover:bg-muted/50 rounded-md
         hover:bg-accent hover:text-accent-foreground pointer-events-none">
          <div className="flex items-center gap-2">
            {matchData.result === "W" && <WinBadge/>}
            {matchData.result === "L" && <LoseBadge/>}
            {matchData.result === "D" && <DrawBadge/>}
            vs
            <span className="text-base font-medium">{matchData.opponent}</span>
          </div>

          {matchData.minutesPlayed === 0 ? (
            <div className="text-muted-foreground italic">Sat on the bench</div>
          ) : (
            <div className="flex items-center gap-4">
              <Progress value={matchData.minutesPlayed} className="h-2 w-full min-w-[176px]" max={90}/>
              <span className="text-muted-foreground">{matchData.minutesPlayed}'</span>
            </div>
          )}

          <div className="flex gap-4 items-center">
            <div className="flex gap-1 items-center text-muted-foreground">
              <SoccerIcon width={16} height={16}/>
              <div>{matchData.goals}</div>
            </div>

            <div className="flex gap-1 items-center">
              <span className="bg-red-card w-4 h-4 rounded-sm"/>
              <div>{matchData.redCards}</div>
            </div>

            <div className="flex gap-1 items-center">
              <span className="bg-yellow-card w-4 h-4 rounded-sm"/>
              <div>{matchData.yellowCards}</div>
            </div>

            <div className="text-xs text-muted-foreground text-right flex-1">
              &#8226; {matchData.daysAgo} {matchData.daysAgo === 1 ? 'day' : 'days'} ago
            </div>
          </div>
        </div>
      </Link>
  )
}

export function LoseBadge() {
  return (
      <span
          className="text-destructive bg-destructive/20 border border-destructive w-8 h-8 rounded-md font-bold flex justify-center items-center">
      L
    </span>
  )
}

export function WinBadge() {
  return (
      <span
          className="text-success bg-success/20 border border-success w-8 h-8 rounded-md font-bold flex justify-center items-center">
      W
    </span>
  )
}

export function DrawBadge() {
  return (
      <span
          className="text-muted-foreground bg-muted border border-border w-8 h-8 rounded-md font-bold flex justify-center items-center">
      D
    </span>
  )
}