import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get player details
    const { data, error } = await supabase.from("players").select("*, clubs(*)").eq("id", id).single()

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching player:", error)
    return NextResponse.json({ error: "Failed to fetch player data" }, { status: 500 })
  }
}

