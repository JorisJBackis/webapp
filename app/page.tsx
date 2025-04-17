"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          if (error.name === "AuthApiError" && error.status === 400) {
            // If there's a token reuse error, sign out and redirect to login
            await supabase.auth.signOut()
            router.push("/auth/login")
            return
          }
          console.error("Auth error:", error)
        }

        // If user is authenticated, redirect to dashboard
        if (data.session) {
          router.push("/dashboard")
        } else {
          // Otherwise redirect to login
          router.push("/auth/login")
        }
      } catch (err) {
        console.error("Error checking session:", err)
        router.push("/auth/login")
      }
    }

    checkSession()
  }, [router, supabase])

  // Show a simple loading state while checking auth
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Loading...</h1>
        <p className="text-muted-foreground">Please wait while we prepare your experience</p>
      </div>
    </div>
  )
}
