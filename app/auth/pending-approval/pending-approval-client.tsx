"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PendingApprovalClientProps {
  email: string
  userType: string | null
  clubName?: string
  createdAt: string
}

export default function PendingApprovalClient({
  email,
  userType,
  clubName,
  createdAt,
}: PendingApprovalClientProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Account Pending Approval
        </h1>

        {/* Message */}
        <div className="text-center text-gray-600 mb-6 space-y-2">
          <p>
            Thank you for registering with FootyLabs!
          </p>
          <p>
            Your account is currently under review by our team. We'll send you an email at <span className="font-semibold">{email}</span> once your account has been approved.
          </p>
          <p className="text-sm mt-4">
            This usually takes 1-2 business days.
          </p>
        </div>

        {/* User Info Card */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Registration Details</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium">{email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">User Type:</span>
              <span className="font-medium capitalize">{userType || "N/A"}</span>
            </div>
            {clubName && (
              <div className="flex justify-between">
                <span className="text-gray-600">Club:</span>
                <span className="font-medium">{clubName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Registered:</span>
              <span className="font-medium">
                {new Date(createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>

          <p className="text-xs text-center text-gray-500">
            Need help? Contact us at{" "}
            <a href="mailto:support@footylabs.com" className="text-blue-600 hover:underline">
              support@footylabs.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
