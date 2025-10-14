import type React from "react"
import DashboardNav from "@/components/dashboard-nav"
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
// import {createClient} from "@/lib/supabase/client";
// import {redirect} from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // const supabase = await createClient();
  //
  // const { data: { user } } = await supabase.auth.getUser()
  //
  // if (!user) {
  //   redirect('/auth/login')
  // }

  return (
    <div className="flex min-h-screen flex-col bg-footylabs-darkblue">
      <DashboardNav />
      <div className="flex-1 bg-background">{children}</div>
    </div>
  )
}
