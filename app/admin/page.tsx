import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Shield, UserCheck, UserX, Clock, LogOut, Link2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserManagementTabs } from "@/components/admin/user-management-tabs"
import Link from "next/link"

export default async function AdminDashboard() {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/admin/login")
  }

  // Check if user is admin
  const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: session.user.id })

  if (!isAdmin) {
    redirect("/admin/login")
  }

  // Get pending users
  const { data: pendingUsers } = await supabase
    .from("pending_user_approvals")
    .select("*")
    .order("registered_at", { ascending: false })

  // Get approved users
  const { data: approvedUsers } = await supabase
    .from("approved_users")
    .select("*")
    .order("approved_at", { ascending: false })

  // Get rejected users
  const { data: rejectedUsers } = await supabase
    .from("rejected_users")
    .select("*")
    .order("rejected_at", { ascending: false })

  // Get stats
  const { count: pendingCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("approval_status", "pending")

  const { count: approvedCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("approval_status", "approved")

  const { count: rejectedCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("approval_status", "rejected")


  async function handleSignOut() {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/admin/login")
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="h-7 w-7 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">FootyLabs Admin</h1>
              <p className="text-sm text-slate-600">User Management Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/player-matching">
              <Button variant="outline">
                <Link2 className="h-4 w-4 mr-2" />
                Player Matching
              </Button>
            </Link>
            <form action={handleSignOut}>
              <Button variant="outline" type="submit">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="text-3xl font-bold">{pendingCount || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <UserCheck className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-3xl font-bold">{approvedCount || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <UserX className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-3xl font-bold">{rejectedCount || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Management Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <UserManagementTabs
              pendingUsers={pendingUsers || []}
              approvedUsers={approvedUsers || []}
              rejectedUsers={rejectedUsers || []}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
