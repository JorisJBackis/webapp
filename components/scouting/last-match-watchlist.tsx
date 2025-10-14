"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Progress } from "@/components/ui/progress"
import SoccerIcon from "@/components/scouting/soccer-icon"
import Link from "next/link"
import { Loader2 } from "lucide-react"

export function LastMatchWatchlist({
  playerId,
  playerName
}: {
  playerId: number | string
  playerName: string
}) {
  const [matchData, setMatchData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetchLastMatch = async () => {
      try {
        const nameParts = playerName.trim().split(' ')

        if (nameParts.length < 2) {
          console.log("Invalid name format:", playerName)
          setLoading(false)
          return
        }

        const lastName = nameParts[nameParts.length - 1]
        const firstPart = nameParts[0]
        const firstLetter = firstPart.charAt(0).toUpperCase()

        // Build multiple search patterns with wildcards for fuzzy matching
        const patterns = [
          playerName,                           // Exact: "Ramunas Merkelis"
          `${firstLetter}. ${lastName}`,        // Initial: "R. Merkelis"
          `${firstLetter}.${lastName}`,         // No space: "R.Merkelis"
          `${firstLetter} ${lastName}`,         // No dot: "R Merkelis"
        ]

        console.log(`🔍 Searching for player: "${playerName}"`)
        console.log(`📋 Generated patterns:`, patterns)

        let data = null
        let foundPattern = null

        // First, try exact patterns
        for (const pattern of patterns) {
          console.log(`  ➤ Trying pattern: "${pattern}"`)

          const { data: result, error } = await supabase
            .from("new_watchlist")
            .select("*")
            .ilike("player_name", pattern)
            .order("match_date", { ascending: false })
            .limit(1)

          if (error) {
            console.error(`    ❌ Error with pattern "${pattern}":`, error)
            continue
          }

          console.log(`    ℹ️ Found ${result?.length || 0} matches`)

          if (result && result.length > 0) {
            data = result[0]
            foundPattern = pattern
            console.log(`    ✅ Match found!`)
            break
          }
        }

        // If no exact match, try with wildcards
        if (!data) {
          console.log(`🔄 No exact matches found, trying with wildcards...`)

          for (const pattern of patterns) {
            const wildcardPattern = `%${pattern}%`
            console.log(`  ➤ Trying wildcard: "${wildcardPattern}"`)

            const { data: result, error } = await supabase
              .from("new_watchlist")
              .select("*")
              .ilike("player_name", wildcardPattern)
              .order("match_date", { ascending: false })
              .limit(1)

            if (error) {
              console.error(`    ❌ Error:`, error)
              continue
            }

            console.log(`    ℹ️ Found ${result?.length || 0} matches`)

            if (result && result.length > 0) {
              data = result[0]
              foundPattern = `${pattern} (wildcard)`
              console.log(`    ✅ Match found with wildcard!`)
              break
            }
          }
        }

        if (!data) {
          console.log(`❌ No matches found for "${playerName}" with any pattern`)

          // Debug: Check if player exists at all in the table
          const { data: allMatches, error: debugError } = await supabase
            .from("new_watchlist")
            .select("player_name")
            .limit(100)

          if (!debugError && allMatches) {
            console.log(`📊 Sample player names in watchlist:`,
              allMatches.slice(0, 10).map(m => m.player_name))
          }

          setLoading(false)
          return
        }

        console.log(`✅ Match found using pattern "${foundPattern}":`, {
          player: data.player_name,
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

    if (playerName) {
      fetchLastMatch()
    }
  }, [playerName])

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
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!matchData) {
    return (
      <div className="p-2">
        <span className="text-muted-foreground text-sm">No matches found</span>
      </div>
    )
  }

  return (
      <Link
          href={`/players/${playerId}/all-matches/${matchData.matchId}`}
          onClick={(e) => e.stopPropagation()} // prevents opening modal onClick
      >
        <div className="flex flex-col gap-2 cursor-pointer p-2 hover:bg-muted/50 rounded-md
         hover:bg-accent hover:text-accent-foreground pointer-events-none">
          <div className="flex items-center gap-2">
            {matchData.result === "W" && <WinBadge />}
            {matchData.result === "L" && <LoseBadge />}
            {matchData.result === "D" && <DrawBadge />}
            vs
            <span className="text-base font-medium">{matchData.opponent}</span>
          </div>

        <div className="flex items-center gap-4">
          <Progress value={matchData.minutesPlayed} className="h-2 w-full min-w-[176px]" />
          <span className="text-muted-foreground">{matchData.minutesPlayed}'</span>
        </div>

          <div className="flex gap-4 items-center">
            <div className="flex gap-1 items-center text-muted-foreground">

              <SoccerIcon width={16} height={16} />
              <div>{matchData.goals}</div>
            </div>

          {matchData.redCards > 0 && (
            <div className="flex gap-1 items-center">
              <span className="bg-red-card w-4 h-4 rounded-sm" />
              <div>{matchData.redCards}</div>
            </div>
          )}

          {matchData.yellowCards > 0 && (
            <div className="flex gap-1 items-center">
              <span className="bg-yellow-card w-4 h-4 rounded-sm" />
              <div>{matchData.yellowCards}</div>
            </div>
          )}

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
    <span className="text-destructive bg-destructive/20 border border-destructive w-8 h-8 rounded-md font-bold flex justify-center items-center">
      L
    </span>
  )
}

export function WinBadge() {
  return (
    <span className="text-success bg-success/20 border border-success w-8 h-8 rounded-md font-bold flex justify-center items-center">
      W
    </span>
  )
}

export function DrawBadge() {
  return (
    <span className="text-muted-foreground bg-muted border border-border w-8 h-8 rounded-md font-bold flex justify-center items-center">
      D
    </span>
  )
}
