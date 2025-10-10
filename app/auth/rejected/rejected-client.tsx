"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { XCircle, LogOut, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RejectedClientProps {
  rejectionReason?: string
}

export default function RejectedClient({ rejectionReason }: RejectedClientProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Registration Not Approved
        </h1>

        {/* Message */}
        <div className="text-center text-gray-600 mb-6 space-y-2">
          <p>
            Unfortunately, we're unable to approve your registration at this time.
          </p>
        </div>

        {/* Rejection Reason */}
        {rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-red-900 mb-2">Reason</h3>
            <p className="text-sm text-red-800">{rejectionReason}</p>
          </div>
        )}

        {/* Contact Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Mail className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                Questions or Want to Appeal?
              </h3>
              <p className="text-sm text-blue-800 mb-2">
                If you believe this was a mistake or would like more information, please contact our support team.
              </p>
              <a
                href="mailto:support@footylabs.com"
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                support@footylabs.com
              </a>
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
        </div>
      </div>
    </div>
  )
}
