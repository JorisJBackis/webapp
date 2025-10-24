import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Shield, UserCheck, UserX, Clock, LogOut } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

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

  async function approveUser(formData: FormData) {
    "use server"
    const supabase = await createClient()
    const userId = formData.get("userId") as string
    const adminNotes = formData.get("adminNotes") as string

    await supabase.rpc("approve_user", {
      target_user_id: userId,
      admin_notes_text: adminNotes || null,
    })

    redirect("/admin")
  }

  async function rejectUser(formData: FormData) {
    "use server"
    const supabase = await createClient()
    const userId = formData.get("userId") as string
    const reason = formData.get("reason") as string
    const adminNotes = formData.get("adminNotes") as string

    if (!reason) {
      throw new Error("Rejection reason is required")
    }

    await supabase.rpc("reject_user", {
      target_user_id: userId,
      reason: reason,
      admin_notes_text: adminNotes || null,
    })

    redirect("/admin")
  }

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
              <p className="text-sm text-slate-600">User Approval Dashboard</p>
            </div>
          </div>
          <form action={handleSignOut}>
            <Button variant="outline" type="submit">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </form>
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

        {/* Pending Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Registrations</CardTitle>
            <CardDescription>Review and approve or reject user registrations</CardDescription>
          </CardHeader>
          <CardContent>
            {!pendingUsers || pendingUsers.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Clock className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                <p className="font-medium">No pending registrations</p>
                <p className="text-sm mt-1">All caught up! 🎉</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingUsers.map((user) => (
                  <Card key={user.id} className="border-2 border-slate-200">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* User Info */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg text-slate-900">{user.email}</h3>
                              {user.email_confirmed_at && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  ✓ Verified
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-4 text-sm text-slate-600">
                              <span>
                                Type: <span className="font-medium capitalize text-slate-900">{user.user_type}</span>
                              </span>
                              {user.club_name && (
                                <span>
                                  Club: <span className="font-medium text-slate-900">{user.club_name}</span>
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">
                              Registered: {new Date(user.registered_at).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-3 border-t border-slate-200">
                          {/* Approve Form */}
                          <form action={approveUser} className="flex-1">
                            <input type="hidden" name="userId" value={user.id} />
                            <div className="space-y-2">
                              <Label htmlFor={`approve-notes-${user.id}`} className="text-xs text-slate-600">
                                Admin Notes (Optional)
                              </Label>
                              <Textarea
                                id={`approve-notes-${user.id}`}
                                name="adminNotes"
                                placeholder="Internal notes about this approval..."
                                className="text-sm h-20 resize-none"
                              />
                              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                                <UserCheck className="h-4 w-4 mr-2" />
                                Approve User
                              </Button>
                            </div>
                          </form>

                          {/* Reject Form */}
                          <form action={rejectUser} className="flex-1">
                            <input type="hidden" name="userId" value={user.id} />
                            <div className="space-y-2">
                              <Label htmlFor={`reject-reason-${user.id}`} className="text-xs text-slate-600">
                                Rejection Reason <span className="text-red-600">*</span>
                              </Label>
                              <Textarea
                                id={`reject-reason-${user.id}`}
                                name="reason"
                                placeholder="Reason user will see..."
                                className="text-sm h-20 resize-none"
                                required
                              />
                              <details className="text-xs">
                                <summary className="cursor-pointer text-slate-600 hover:text-slate-900 mb-2">
                                  + Add internal notes
                                </summary>
                                <Textarea
                                  name="adminNotes"
                                  placeholder="Internal notes (user won't see this)..."
                                  className="text-sm h-16 resize-none"
                                />
                              </details>
                              <Button
                                type="submit"
                                variant="destructive"
                                className="w-full"
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Reject User
                              </Button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
