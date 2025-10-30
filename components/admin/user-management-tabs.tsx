"use client"

import { useState, useTransition } from "react"
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
  onApprove: (formData: FormData) => Promise<void>
  onReject: (formData: FormData) => Promise<void>
  onChangeStatus: (formData: FormData) => Promise<void>
}

export function UserManagementTabs({
  pendingUsers,
  approvedUsers,
  rejectedUsers,
  onApprove,
  onReject,
  onChangeStatus,
}: Props) {
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
          onApprove={onApprove}
          onReject={onReject}
          onChangeStatus={onChangeStatus}
        />
      </TabsContent>

      <TabsContent value="approved">
        <UserList
          users={approvedUsers}
          status="approved"
          onApprove={onApprove}
          onReject={onReject}
          onChangeStatus={onChangeStatus}
        />
      </TabsContent>

      <TabsContent value="rejected">
        <UserList
          users={rejectedUsers}
          status="rejected"
          onApprove={onApprove}
          onReject={onReject}
          onChangeStatus={onChangeStatus}
        />
      </TabsContent>
    </Tabs>
  )
}

function UserList({
  users,
  status,
  onApprove,
  onReject,
  onChangeStatus,
}: {
  users: User[]
  status: string
  onApprove: (formData: FormData) => Promise<void>
  onReject: (formData: FormData) => Promise<void>
  onChangeStatus: (formData: FormData) => Promise<void>
}) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const handleApprove = async (formData: FormData) => {
    const email = users.find(u => u.id === formData.get("userId"))?.email
    startTransition(async () => {
      await onApprove(formData)
      toast({
        title: "✅ User Approved",
        description: `${email} has been approved and can now access the platform.`,
      })
    })
  }

  const handleReject = async (formData: FormData) => {
    const email = users.find(u => u.id === formData.get("userId"))?.email
    startTransition(async () => {
      await onReject(formData)
      toast({
        title: "❌ User Rejected",
        description: `${email} has been rejected and notified.`,
        variant: "destructive",
      })
    })
  }

  const handleStatusChange = async (formData: FormData) => {
    const email = users.find(u => u.id === formData.get("userId"))?.email
    const newStatus = formData.get("newStatus") as string
    startTransition(async () => {
      await onChangeStatus(formData)
      toast({
        title: "🔄 Status Changed",
        description: `${email} status changed to ${newStatus}.`,
      })
    })
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
                <div className="flex gap-3 pt-3 border-t">
                  <form action={handleApprove} className="flex-1">
                    <input type="hidden" name="userId" value={user.id} />
                    <Textarea
                      name="adminNotes"
                      placeholder="Admin notes (optional)..."
                      className="text-sm h-20 mb-2"
                    />
                    <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isPending}>
                      <UserCheck className="h-4 w-4 mr-2" />
                      {isPending ? "Approving..." : "Approve"}
                    </Button>
                  </form>

                  <form action={handleReject} className="flex-1">
                    <input type="hidden" name="userId" value={user.id} />
                    <Textarea
                      name="reason"
                      placeholder="Rejection reason (required)..."
                      className="text-sm h-20 mb-2"
                      required
                    />
                    <Button type="submit" variant="destructive" className="w-full" disabled={isPending}>
                      <UserX className="h-4 w-4 mr-2" />
                      {isPending ? "Rejecting..." : "Reject"}
                    </Button>
                  </form>
                </div>
              )}

              {status !== "pending" && (
                <form action={handleStatusChange} className="pt-3 border-t">
                  <input type="hidden" name="userId" value={user.id} />
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Label className="text-xs mb-2 block">Change Status:</Label>
                      <Select name="newStatus" defaultValue={status}>
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
                        name="adminNotes"
                        placeholder="Notes about status change..."
                        className="text-sm h-10"
                      />
                    </div>
                    <Button type="submit" variant="outline" size="icon" disabled={isPending}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  {status === "rejected" && (
                    <Textarea
                      name="reason"
                      placeholder="Rejection reason (if changing back to rejected)..."
                      className="text-sm h-10 mt-2"
                    />
                  )}
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
