"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserCheck, UserX, Clock, RefreshCw, MessageSquare, Mail, MailWarning, AlertCircle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

// Helper function to format user type for display
function formatUserType(userType: string | null): string {
  if (!userType) return ""

  // Convert underscores to spaces and capitalize first letter of each word
  return userType
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

// Helper function to get user's display name based on type
function getUserDisplayName(user: User): string | null {
  if (user.user_type === 'player' && user.player_name) {
    return user.player_name
  }
  if ((user.user_type === 'club' || user.user_type === 'club_staff') && user.club_name) {
    return user.club_name
  }
  return null
}

type User = {
  id: string
  email: string
  email_confirmed_at: string | null
  club_name: string | null
  player_name: string | null
  user_type: string | null
  registered_at: string
  approved_at?: string | null
  rejection_reason?: string | null
  registration_note?: string | null
  admin_notes?: string | null
  approved_by_email?: string | null
  rejected_by_email?: string | null
  wyscout_player_id?: number | null
  transfermarkt_link?: string | null
}

type Props = {
  pendingUsers: User[]
  approvedUsers: User[]
  rejectedUsers: User[]
}

export function UserManagementTabs({
  pendingUsers: initialPending,
  approvedUsers: initialApproved,
  rejectedUsers: initialRejected,
}: Props) {
  const [pendingUsers, setPendingUsers] = useState(initialPending)
  const [approvedUsers, setApprovedUsers] = useState(initialApproved)
  const [rejectedUsers, setRejectedUsers] = useState(initialRejected)

  return (
    <Tabs defaultValue="pending" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="pending" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Pending ({pendingUsers.length})
        </TabsTrigger>
        <TabsTrigger value="approved" className="flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          Approved ({approvedUsers.length})
        </TabsTrigger>
        <TabsTrigger value="rejected" className="flex items-center gap-2">
          <UserX className="h-4 w-4" />
          Rejected ({rejectedUsers.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pending">
        <UserList
          users={pendingUsers}
          status="pending"
          onUserUpdate={(userId, newStatus) => {
            setPendingUsers(prev => prev.filter(u => u.id !== userId))
            const user = pendingUsers.find(u => u.id === userId)
            if (!user) return

            if (newStatus === 'approved') {
              setApprovedUsers(prev => [...prev, { ...user, approved_at: new Date().toISOString() }])
            } else if (newStatus === 'rejected') {
              setRejectedUsers(prev => [...prev, { ...user, approved_at: new Date().toISOString() }])
            }
          }}
        />
      </TabsContent>

      <TabsContent value="approved">
        <UserList
          users={approvedUsers}
          status="approved"
          onUserUpdate={(userId, newStatus) => {
            setApprovedUsers(prev => prev.filter(u => u.id !== userId))
            const user = approvedUsers.find(u => u.id === userId)
            if (!user) return

            if (newStatus === 'pending') {
              setPendingUsers(prev => [...prev, user])
            } else if (newStatus === 'rejected') {
              setRejectedUsers(prev => [...prev, user])
            }
          }}
        />
      </TabsContent>

      <TabsContent value="rejected">
        <UserList
          users={rejectedUsers}
          status="rejected"
          onUserUpdate={(userId, newStatus) => {
            setRejectedUsers(prev => prev.filter(u => u.id !== userId))
            const user = rejectedUsers.find(u => u.id === userId)
            if (!user) return

            if (newStatus === 'pending') {
              setPendingUsers(prev => [...prev, user])
            } else if (newStatus === 'approved') {
              setApprovedUsers(prev => [...prev, user])
            }
          }}
        />
      </TabsContent>
    </Tabs>
  )
}

function UserList({
  users,
  status,
  onUserUpdate,
}: {
  users: User[]
  status: string
  onUserUpdate: (userId: string, newStatus: string) => void
}) {
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null)
  const router = useRouter()

  const handleApprove = async (userId: string, adminNotes: string, email: string) => {
    setLoadingUserId(userId)
    try {
      const response = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, adminNotes }),
      })

      if (!response.ok) throw new Error('Failed to approve user')

      onUserUpdate(userId, 'approved')
      toast({
        title: "✅ User Approved",
        description: `${email} has been approved and can now access the platform.`,
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingUserId(null)
    }
  }

  const handleReject = async (userId: string, reason: string, adminNotes: string, email: string) => {
    setLoadingUserId(userId)
    try {
      const response = await fetch('/api/admin/reject-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason, adminNotes }),
      })

      if (!response.ok) throw new Error('Failed to reject user')

      onUserUpdate(userId, 'rejected')
      toast({
        title: "❌ User Rejected",
        description: `${email} has been rejected and notified.`,
        variant: "destructive",
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingUserId(null)
    }
  }

  const handleStatusChange = async (userId: string, newStatus: string, reason: string, adminNotes: string, email: string) => {
    setLoadingUserId(userId)
    try {
      const response = await fetch('/api/admin/change-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newStatus, reason, adminNotes }),
      })

      if (!response.ok) throw new Error('Failed to change status')

      onUserUpdate(userId, newStatus)
      toast({
        title: "🔄 Status Changed",
        description: `${email} status changed to ${newStatus}.`,
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingUserId(null)
    }
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="font-medium">No {status} users</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <Card key={user.id} className="border-2">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* User Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg">{user.email}</h3>

                  {/* User Type Badge */}
                  {user.user_type && (
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold ${
                        user.user_type === 'club' || user.user_type === 'club_staff'
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : user.user_type === 'player'
                          ? 'bg-purple-50 text-purple-700 border-purple-300'
                          : 'bg-orange-50 text-orange-700 border-orange-300'
                      }`}
                    >
                      {formatUserType(user.user_type)}
                    </Badge>
                  )}

                  {user.email_confirmed_at ? (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      <Mail className="h-3 w-3 mr-1" />
                      Email Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                      <MailWarning className="h-3 w-3 mr-1" />
                      Email Not Verified
                    </Badge>
                  )}
                  <Badge className="capitalize">{status}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                  {getUserDisplayName(user) && (
                    <div>
                      {user.user_type === 'player' ? 'Player' : user.user_type === 'agent' ? 'Agent' : 'Club'}:{' '}
                      <span className="font-medium">{getUserDisplayName(user)}</span>
                    </div>
                  )}
                  <div>Registered: {new Date(user.registered_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  {user.approved_at && (
                    <div>
                      {status === 'rejected' ? 'Rejected' : 'Approved'}: {new Date(user.approved_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  {user.approved_by_email && <div>By: {user.approved_by_email}</div>}
                  {user.rejected_by_email && <div>By: {user.rejected_by_email}</div>}
                </div>

                {/* Player Data Missing Warning */}
                {user.user_type === 'player' && !user.wyscout_player_id && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border-l-4 border-amber-500 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900 mb-2">⚠️ Player Data Missing - Action Required</p>
                        <p className="text-xs text-amber-800 mb-3">This player's stats need to be added to the database as soon as possible.</p>
                        {user.transfermarkt_link && (
                          <div className="bg-white/60 backdrop-blur-sm p-3 rounded-md border border-amber-200">
                            <div className="flex items-center gap-2 mb-1.5">
                              <svg className="h-4 w-4 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                              </svg>
                              <span className="text-xs font-medium text-amber-900">Transfermarkt Profile</span>
                            </div>
                            <a
                              href={user.transfermarkt_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline break-all inline-flex items-center gap-1 group"
                            >
                              {user.transfermarkt_link}
                              <svg className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Registration Note */}
                {user.registration_note && (
                  <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-blue-900 mb-1">User's Sign Up Note:</p>
                        <p className="text-sm text-blue-800">{user.registration_note}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                {user.rejection_reason && (
                  <div className="bg-red-50 p-3 rounded-md border border-red-200">
                    <p className="text-xs font-medium text-red-900 mb-1">Rejection Reason:</p>
                    <p className="text-sm text-red-800">{user.rejection_reason}</p>
                  </div>
                )}

                {/* Admin Notes */}
                {user.admin_notes && (
                  <div className="bg-slate-100 p-3 rounded-md">
                    <p className="text-xs font-medium text-slate-700 mb-1">Admin Notes:</p>
                    <p className="text-sm text-slate-600">{user.admin_notes}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {status === "pending" && (
                <PendingUserActions
                  user={user}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isLoading={loadingUserId === user.id}
                />
              )}

              {status !== "pending" && (
                <ApprovedRejectedActions
                  user={user}
                  currentStatus={status}
                  onStatusChange={handleStatusChange}
                  isLoading={loadingUserId === user.id}
                />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function PendingUserActions({
  user,
  onApprove,
  onReject,
  isLoading,
}: {
  user: User
  onApprove: (userId: string, adminNotes: string, email: string) => void
  onReject: (userId: string, reason: string, adminNotes: string, email: string) => void
  isLoading: boolean
}) {
  const [approveNotes, setApproveNotes] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [rejectNotes, setRejectNotes] = useState("")
  const [showRejectNotes, setShowRejectNotes] = useState(false)

  return (
    <div className="grid grid-cols-2 gap-4 pt-3 border-t">
      {/* Approve Section */}
      <div className="flex flex-col">
        <Textarea
          value={approveNotes}
          onChange={(e) => setApproveNotes(e.target.value)}
          placeholder="Admin Notes (Optional)"
          className="text-sm mb-3 h-20 resize-none"
        />
        <Button
          onClick={() => onApprove(user.id, approveNotes, user.email)}
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          <UserCheck className="h-4 w-4 mr-2" />
          {isLoading ? "Approving..." : "Approve User"}
        </Button>
      </div>

      {/* Reject Section */}
      <div className="flex flex-col">
        <Textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Rejection Reason *"
          className="text-sm mb-3 h-20 resize-none"
        />
        {showRejectNotes && (
          <Textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Admin Notes (Optional)"
            className="text-sm mb-3 h-20 resize-none"
          />
        )}
        <Button
          onClick={() => {
            if (!rejectReason.trim()) {
              alert("Rejection reason is required")
              return
            }
            onReject(user.id, rejectReason, rejectNotes, user.email)
          }}
          disabled={isLoading}
          variant="destructive"
          className="w-full"
        >
          <UserX className="h-4 w-4 mr-2" />
          {isLoading ? "Rejecting..." : "Reject User"}
        </Button>
        {!showRejectNotes && (
          <button
            type="button"
            onClick={() => setShowRejectNotes(true)}
            className="text-xs text-slate-500 hover:text-slate-700 mt-2 flex items-center justify-center gap-1"
          >
            + Add internal notes
          </button>
        )}
      </div>
    </div>
  )
}

function ApprovedRejectedActions({
  user,
  currentStatus,
  onStatusChange,
  isLoading,
}: {
  user: User
  currentStatus: string
  onStatusChange: (userId: string, newStatus: string, reason: string, adminNotes: string, email: string) => void
  isLoading: boolean
}) {
  const [newStatus, setNewStatus] = useState(currentStatus)
  const [adminNotes, setAdminNotes] = useState("")

  const hasStatusChanged = newStatus !== currentStatus

  // Get button color based on selected status
  const getButtonClassName = () => {
    if (!hasStatusChanged) return "w-full mt-2"

    switch (newStatus) {
      case "approved":
        return "w-full mt-2 bg-green-600 hover:bg-green-700 text-white"
      case "rejected":
        return "w-full mt-2 bg-red-600 hover:bg-red-700 text-white"
      case "pending":
        return "w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white"
      default:
        return "w-full mt-2"
    }
  }

  return (
    <div className="pt-3 border-t">
      <div className="flex gap-3">
        <div className="w-1/2">
          <Label className="text-xs mb-1.5 block text-slate-600">Change Status</Label>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => onStatusChange(user.id, newStatus, "", adminNotes, user.email)}
            disabled={isLoading || !hasStatusChanged}
            className={getButtonClassName()}
            variant={hasStatusChanged ? "default" : "outline"}
            size="sm"
          >
            <RefreshCw className="h-3 w-3 mr-1.5" />
            {isLoading ? "Updating..." : hasStatusChanged ? `Confirm Status Change to ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}` : "Select a different status to change"}
          </Button>
        </div>
        <div className="flex-1">
          <Label className="text-xs mb-1.5 block text-slate-600">Admin Notes (Optional)</Label>
          <Textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Internal notes about this change..."
            className="text-sm h-[76px] resize-none"
          />
        </div>
      </div>
    </div>
  )
}
