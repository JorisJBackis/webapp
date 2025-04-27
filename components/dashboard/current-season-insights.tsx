"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

type TeamMetrics = {
  team_id: number
  Team: string
  xG: number
  PPDA: number
  "Duels Success %": number
  "Pass Accuracy": number
  [key: string]: any
}

export default function CurrentSeasonInsights({ clubId }: { clubId?: number }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<TeamMetrics | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!clubId) return

      try {
        setLoading(true)
        setError(null)

        // Fetch team metrics from team_metrics_aggregated
        const { data, error: metricsError } = await supabase
          .from("team_metrics_aggregated")
          .select("*")
          .eq("team_id", clubId)
          .single()

        if (metricsError) throw new Error(`Error fetching team metrics: ${metricsError.message}`)

        if (!data) {
          setError("No metrics data available for your team")
          setLoading(false)
          return
        }

        console.log("Team metrics:", data)
        setMetrics(data)
        setLoading(false)
      } catch (err) {
        console.error("Error fetching team metrics:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
        setLoading(false)
      }
    }

    fetchData()
  }, [clubId, supabase])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Current Season Insights</h2>
        <div className="flex h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#31348D]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Current Season Insights</h2>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Current Season Insights</h2>
        <p className="text-gray-500">No metrics data available</p>
      </div>
    )
  }

  // Extract metrics for KPI cards
  const xG = Number.parseFloat(metrics.xG?.toString() || "0")
  const ppda = Number.parseFloat(metrics.PPDA?.toString() || "0")
  const duelSuccess = Number.parseFloat(metrics["Duels Success %"]?.toString() || "0")
  const passAccuracy = Number.parseFloat(metrics["Pass Accuracy"]?.toString() || "0")

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold mb-6">Current Season Performance</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* xG Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#31348D]">Average xG</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold">{xG.toFixed(2)}</div>
              <div className="text-sm text-gray-500 mt-2">Expected Goals</div>
            </div>
          </CardContent>
        </Card>

        {/* PPDA Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#31348D]">Average PPDA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold">{ppda.toFixed(2)}</div>
              <div className="text-sm text-gray-500 mt-2">Passes Per Defensive Action</div>
            </div>
          </CardContent>
        </Card>

        {/* Duel Success % Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#31348D]">Average Duel Success</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold">{duelSuccess.toFixed(1)}%</div>
              <div className="text-sm text-gray-500 mt-2">Success Rate</div>
            </div>
          </CardContent>
        </Card>

        {/* Pass Accuracy % Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-[#31348D]">Average Pass Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold">{passAccuracy.toFixed(1)}%</div>
              <div className="text-sm text-gray-500 mt-2">Completion Rate</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
