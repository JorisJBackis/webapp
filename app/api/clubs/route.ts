import { NextResponse } from "next/server"
import {createClient} from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.from("clubs").select("id, name, logo_url").order("name")

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching clubs:", error)
    return NextResponse.json({ error: "Failed to fetch clubs" }, { status: 500 })
  }
}
