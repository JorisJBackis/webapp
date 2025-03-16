import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get players for the club
    const { data, error } = await supabase.from("players").select("*").eq("club_id", id).order("name")

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching players:", error)
    return NextResponse.json({ error: "Failed to fetch players" }, { status: 500 })
  }
}

