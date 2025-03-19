import type React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import DashboardNav from "@/components/dashboard-nav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/login")
  }

  return (
    <div className="flex min-h-screen flex-col bg-footylabs-darkblue">
      <DashboardNav />
      <div className="flex-1 bg-background">{children}</div>
    </div>
  )
}

