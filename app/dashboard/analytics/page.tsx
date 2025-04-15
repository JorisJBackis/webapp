import { createClient } from "@/lib/supabase/server"
import PositionAnalytics from "@/components/dashboard/position-analytics"

export default async function AnalyticsPage() {
  const supabase = createClient()

  // Fetch position average data
  const { data: positionData, error } = await supabase
    .from("final_position_averages")
    .select("position, stats")
    .order("position", { ascending: false }) // Order from 10 to 1

  if (error) {
    console.error("Error fetching position data:", error)
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Team Performance Insights</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">League Position Analysis</h2>
        <p className="text-gray-600 mb-6">
          These charts show the average goals scored, goals conceded, and points accumulated by teams based on their
          final league position over the last 4 seasons. This data can help identify performance benchmarks needed to
          achieve specific league positions.
        </p>

        <PositionAnalytics positionData={positionData || []} />
      </div>
    </div>
  )
}
