import { Progress } from "@/components/ui/progress";
import SoccerIcon from "@/components/scouting/soccer-icon";
import Link from "next/link";

export function LastMatchWatchlist({ playerId }: { playerId: number | string }) {
  // Mock data for the last match
  const matchData = {
    matchId: 123, // mock match ID
    opponent: "FK Riteriai",
    result: "W" as const, // W = Win, L = Lose, D = Draw
    score: "1-1",
    date: "2025-10-05",
    dateDisplay: "October 5, 2025",
    competition: "Premier League",
    venue: "Emirates Stadium",
    minutesPlayed: 78,
    goals: 1,
    assists: 0,
    yellowCards: 1,
    redCards: 1,
  };

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
              &#8226; 3 days ago
            </div>
          </div>
        </div>
      </Link>
  );
}

export function LoseBadge() {
  return (
      <span className="text-destructive bg-destructive/20 border border-destructive w-8 h-8 rounded-md font-bold flex justify-center items-center">
      L
    </span>
  );
}

export function WinBadge() {
  return (
      <span className="text-success bg-success/20 border border-success w-8 h-8 rounded-md font-bold flex justify-center items-center">
      W
    </span>
  );
}

export function DrawBadge() {
  return (
      <span className="text-muted-foreground bg-muted border border-border w-8 h-8 rounded-md font-bold flex justify-center items-center">
      D
    </span>
  );
}
