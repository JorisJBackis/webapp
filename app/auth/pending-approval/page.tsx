import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import PendingApprovalClient from "./pending-approval-client"

export default async function PendingApprovalPage() {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, clubs(name)")
    .eq("id", session.user.id)
    .single()

  // If approved, redirect to dashboard
  if (profile?.approval_status === "approved") {
    redirect("/dashboard")
  }

  return (
    <PendingApprovalClient
      email={session.user.email || ""}
      userType={profile?.user_type}
      clubName={profile?.clubs?.name}
      createdAt={profile?.created_at || ""}
    />
  )
}
