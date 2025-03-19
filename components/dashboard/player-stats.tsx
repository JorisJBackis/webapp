"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"

// Sample data - replace with actual data from your API
const samplePlayers = [
  { id: 1, name: "John Smith", position: "Forward", appearances: 18, goals: 12, assists: 7, rating: 8.2 },
  { id: 2, name: "David Johnson", position: "Midfielder", appearances: 17, goals: 5, assists: 10, rating: 7.9 },
  { id: 3, name: "Michael Brown", position: "Defender", appearances: 18, goals: 1, assists: 2, rating: 7.5 },
  { id: 4, name: "Robert Wilson", position: "Goalkeeper", appearances: 16, goals: 0, assists: 0, rating: 7.8 },
  { id: 5, name: "James Taylor", position: "Forward", appearances: 15, goals: 9, assists: 3, rating: 7.7 },
  { id: 6, name: "Daniel Anderson", position: "Midfielder", appearances: 18, goals: 3, assists: 8, rating: 7.6 },
  { id: 7, name: "Christopher Martinez", position: "Defender", appearances: 17, goals: 0, assists: 1, rating: 7.3 },
  { id: 8, name: "Matthew Thomas", position: "Midfielder", appearances: 16, goals: 4, assists: 5, rating: 7.5 },
]

export default function PlayerStats({ clubId }: { clubId?: number }) {
  const [players, setPlayers] = useState(samplePlayers)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [positionFilter, setPositionFilter] = useState("all")
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!clubId) return

      // Here you would fetch actual data from your API
      // const { data, error } = await supabase...

      // For now, we'll just simulate loading
      setTimeout(() => {
        setLoading(false)
      }, 1000)
    }

    fetchData()
  }, [clubId, supabase])

  // Filter players based on search and position
  const filteredPlayers = players.filter((player) => {
    const matchesSearch = player.name.toLowerCase().includes(search.toLowerCase())
    const matchesPosition = positionFilter === "all" || player.position.toLowerCase() === positionFilter.toLowerCase()
    return matchesSearch && matchesPosition
  })

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="border-b bg-footylabs-darkblue text-white">
        <CardTitle>Player Statistics</CardTitle>
        <CardDescription className="text-white/80">
          Performance metrics for all players in the current season
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                <SelectItem value="goalkeeper">Goalkeeper</SelectItem>
                <SelectItem value="defender">Defender</SelectItem>
                <SelectItem value="midfielder">Midfielder</SelectItem>
                <SelectItem value="forward">Forward</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-footylabs-darkblue">
                <TableRow>
                  <TableHead className="text-white">Name</TableHead>
                  <TableHead className="text-white">Position</TableHead>
                  <TableHead className="text-white text-right">Appearances</TableHead>
                  <TableHead className="text-white text-right">Goals</TableHead>
                  <TableHead className="text-white text-right">Assists</TableHead>
                  <TableHead className="text-white text-right">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">{player.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-footylabs-blue/10 text-footylabs-blue border-footylabs-blue/20"
                      >
                        {player.position}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{player.appearances}</TableCell>
                    <TableCell className="text-right">{player.goals}</TableCell>
                    <TableCell className="text-right">{player.assists}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span
                        className={`${player.rating >= 8.0 ? "text-green-600" : player.rating >= 7.0 ? "text-amber-600" : "text-red-600"}`}
                      >
                        {player.rating.toFixed(1)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPlayers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No players found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

