import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()

  // Check if user is admin
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: session.user.id })
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { userId, reason, adminNotes } = await request.json()

  if (!reason) {
    return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 })
  }

  const { error } = await supabase.rpc("reject_user", {
    target_user_id: userId,
    reason: reason,
    admin_notes_text: adminNotes || null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
