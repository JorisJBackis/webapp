import { createClient } from "@/lib/supabase/server"

export async function fetchPerformanceData(clubId: number) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("performance_data") // Replace with your actual table name if different
      .select("*")
      .eq("club_id", clubId)
      .order("month")

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error("Error fetching performance data:", error)
    throw new Error("Failed to fetch performance data")
  }
}

export async function fetchClubPlayers(clubId: number) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("club_id", clubId)
      .order("name")

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error("Error fetching players:", error)
    throw new Error("Failed to fetch player data")
  }
}

export async function fetchTeamComparison(clubId: number) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("team_comparison") // Replace with your actual table name if different
      .select("*")
      .eq("club_id", clubId)

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error("Error fetching team comparison:", error)
    throw new Error("Failed to fetch team comparison data")
  }
}

