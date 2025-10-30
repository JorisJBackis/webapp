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
import { UserCheck, UserX, Clock, RefreshCw, MessageSquare, Mail, MailWarning } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

type User = {
  id: string
  email: string
  email_confirmed_at: string | null
  club_name: string | null
  registered_at: string
  approved_at?: string | null
  rejection_reason?: string | null
  registration_note?: string | null
  admin_notes?: string | null
  approved_by_email?: string | null
  rejected_by_email?: string | null
  user_type?: string
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
  const { toast } = useToast()
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
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{user.email}</h3>
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
                  {user.club_name && <div>Club: <span className="font-medium">{user.club_name}</span></div>}
                  <div>Registered: {new Date(user.registered_at).toLocaleString()}</div>
                  {user.approved_at && (
                    <div>
                      {status === 'rejected' ? 'Rejected' : 'Approved'}: {new Date(user.approved_at).toLocaleString()}
                    </div>
                  )}
                  {user.approved_by_email && <div>By: {user.approved_by_email}</div>}
                  {user.rejected_by_email && <div>By: {user.rejected_by_email}</div>}
                </div>

                {/* Registration Note */}
                {user.registration_note && (
                  <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-blue-900 mb-1">User's Introduction:</p>
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

  return (
    <div className="flex gap-3 pt-3 border-t">
      <div className="flex-1">
        <Textarea
          value={approveNotes}
          onChange={(e) => setApproveNotes(e.target.value)}
          placeholder="Admin notes (optional)..."
          className="text-sm h-20 mb-2"
        />
        <Button
          onClick={() => onApprove(user.id, approveNotes, user.email)}
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          <UserCheck className="h-4 w-4 mr-2" />
          {isLoading ? "Approving..." : "Approve"}
        </Button>
      </div>

      <div className="flex-1">
        <Textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Rejection reason (required)..."
          className="text-sm h-20 mb-2"
        />
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
          {isLoading ? "Rejecting..." : "Reject"}
        </Button>
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
  const [reason, setReason] = useState("")

  return (
    <div className="pt-3 border-t">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Label className="text-xs mb-2 block">Change Status:</Label>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Notes about status change..."
            className="text-sm h-10"
          />
        </div>
        <Button
          onClick={() => onStatusChange(user.id, newStatus, reason, adminNotes, user.email)}
          disabled={isLoading}
          variant="outline"
          size="icon"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {newStatus === "rejected" && (
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Rejection reason (if changing to rejected)..."
          className="text-sm h-10 mt-2"
        />
      )}
    </div>
  )
}
