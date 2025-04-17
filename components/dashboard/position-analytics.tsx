"use client"

import { useState, useEffect } from "react"
import { Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from "recharts"

interface PositionData {
  position: number
  stats:
    | string
    | {
        "Goals Scored (Įv +)": number
        "Goals Conceded (Įv -)": number
        Points: number
      }
}

interface ChartData {
  position: number
  goalsScored: number
  goalsConceded: number
  points: number
}

interface PositionAnalyticsProps {
  positionData: PositionData[]
}

export default function PositionAnalytics({ positionData }: PositionAnalyticsProps) {
  const [chartData, setChartData] = useState<ChartData[]>([])

  useEffect(() => {
    if (positionData && positionData.length > 0) {
      try {
        const processedData = positionData.map((item) => {
          let stats: any

          if (typeof item.stats === "string") {
            try {
              stats = JSON.parse(item.stats)
            } catch (e) {
              console.error("Error parsing stats JSON:", e)
              stats = {}
            }
          } else {
            stats = item.stats
          }

          return {
            position: item.position,
            goalsScored: Number.parseFloat(stats["Goals Scored (Įv +)"]?.toString() || "0"),
            goalsConceded: Number.parseFloat(stats["Goals Conceded (Įv -)"]?.toString() || "0"),
            points: Number.parseFloat(stats["Points"]?.toString() || "0"),
          }
        })

        setChartData(processedData)
      } catch (error) {
        console.error("Error processing position data:", error)
      }
    }
  }, [positionData])

  if (chartData.length === 0) {
    return <div className="text-center py-8">Loading data or no data available...</div>
  }

  return (
    <div className="space-y-8">
      {/* Main combined chart */}
      <div className="h-96">
        <h3 className="text-lg font-medium mb-2">Performance Metrics by League Position</h3>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="position"
              label={{
                value: "League Position",
                position: "insideBottom",
                offset: -5, // Augmente l’espace entre la légende et le label de l’axe X
              }}
            />
            <YAxis yAxisId="left" label={{ value: "Goals", angle: -90, position: "insideLeft" }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, "dataMax + 10"]}
              label={{ value: "Points", angle: 90, position: "insideRight" }}
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === "points") return [`${value} points`, "Points"]
                if (name === "goalsScored") return [`${value} goals`, "Goals Scored"]
                if (name === "goalsConceded") return [`${value} goals`, "Goals Conceded"]
                return [value, name]
              }}
              labelFormatter={(label) => `Position: ${label}`}
            />
            <Legend />
            <Bar yAxisId="right" dataKey="points" fill="#3182CE" opacity={0.7} barSize={30} name="Points" />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="goalsScored"
              stroke="#38A169"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 8 }}
              name="Goals Scored"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="goalsConceded"
              stroke="#E53E3E"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 8 }}
              name="Goals Conceded"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
