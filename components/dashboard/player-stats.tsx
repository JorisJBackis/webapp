"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search } from 'lucide-react'
import { fetchClubPlayers } from "@/lib/api"

type Player = {
  id: number
  name: string
  position: string
  stats: {
    appearances: number
    goals: number
    assists: number
    rating: number
  }
}

export default function PlayerStats({ clubId }: { clubId?: number }) {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [positionFilter, setPositionFilter] = useState("all")

  useEffect(() => {
    const fetchData = async () => {
      if (!clubId) return
      
      try {
        setLoading(true)
        const data = await fetchClubPlayers(clubId)
        setPlayers(data)
      } catch (error: any) {
        console.error("Error fetching players:", error)
        setError(error.message || "Failed to load player data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [clubId])

  // Filter players based on search and position
  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(search.toLowerCase())
    const matchesPosition = positionFilter === "all" || player.position.toLowerCase() === positionFilter.toLowerCase()
    return matchesSearch && matchesPosition
  })

  if (loading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="border-b bg-footylabs-darkblue text-white">
          <CardTitle>Player Statistics</CardTitle>
          <CardDescription className="text-white/80">
            Loading player data...
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 h-[300px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="border-b bg-footylabs-darkblue text-white">
          <CardTitle>Player Statistics</CardTitle>
          <CardDescription className="text-white/80">
            Error loading player data
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-red-500">{error}</div>
        </CardContent>
      </Card>
    )
  }

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
            <Select
              value={positionFilter}
              onValueChange={setPositionFilter}
            >
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
                      <Badge variant="outline" className="bg-footylabs-blue/10 text-footylabs-blue border-footylabs-blue/20">
                        {player.position}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{player.stats.appearances}</TableCell>
                    <TableCell className="text-right">{player.stats.goals}</TableCell>
                    <TableCell className="text-right">{player.stats.assists}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={`${player.stats.rating >= 8.0 ? 'text-green-600' : player.stats.rating >= 7.0 ? 'text-amber-600' : 'text-red-600'}`}>
                        {player.stats.rating.toFixed(1)}
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

