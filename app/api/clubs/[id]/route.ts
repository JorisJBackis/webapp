import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get club details
    const { data: club, error: clubError } = await supabase.from("clubs").select("*").eq("id", id).single()

    if (clubError) {
      throw clubError
    }

    // Get club stats (this would be replaced with your actual data structure)
    // For now, we'll return mock data
    const stats = {
      matches: {
        played: 18,
        won: 12,
        drawn: 3,
        lost: 3,
      },
      goals: {
        scored: 41,
        conceded: 15,
      },
      form: ["W", "W", "D", "L", "W"],
    }

    return NextResponse.json({
      club,
      stats,
    })
  } catch (error) {
    console.error("Error fetching club:", error)
    return NextResponse.json({ error: "Failed to fetch club data" }, { status: 500 })
  }
}

