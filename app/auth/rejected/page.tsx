import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import RejectedClient from "./rejected-client"

export default async function RejectedPage() {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/login")
  }

  // Get user profile with rejection reason
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single()

  // If approved, redirect to dashboard
  if (profile?.approval_status === "approved") {
    redirect("/dashboard")
  }

  return <RejectedClient rejectionReason={profile?.rejection_reason || undefined} />
}
