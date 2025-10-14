import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Update the middleware to allow access to public pages
    // Allow public access to player profiles, verification page, home, admin routes, and email API
    const publicPaths = ["/", "/auth", "/player", "/api/og", "/api/emails", "/admin"]
    const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path))

    // If user is not signed in and the current path is not public, redirect to /auth/login
    if (!session && !isPublicPath) {
      return NextResponse.redirect(new URL("/auth/login", req.url))
    }

    // If user is signed in, check their approval status
    if (session) {
      // Don't check approval status for auth pages (they need to see pending/rejected pages)
      if (!req.nextUrl.pathname.startsWith("/auth")) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("approval_status")
          .eq("id", session.user.id)
          .single()

        // Redirect based on approval status
        if (profile?.approval_status === "pending" && req.nextUrl.pathname !== "/auth/pending-approval") {
          return NextResponse.redirect(new URL("/auth/pending-approval", req.url))
        }

        if (profile?.approval_status === "rejected" && req.nextUrl.pathname !== "/auth/rejected") {
          return NextResponse.redirect(new URL("/auth/rejected", req.url))
        }
      }

      // If user is approved and on /auth/login or /auth/register, redirect to /dashboard
      if (req.nextUrl.pathname === "/auth/login" || req.nextUrl.pathname === "/auth/register") {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
    }

    // Allow access to verification page and callback regardless of auth status
    if (req.nextUrl.pathname === "/auth/verification" || req.nextUrl.pathname === "/auth/callback") {
      return res
    }

    return res
  } catch (error) {
    // If there's an auth error (like refresh_token_already_used), clear the session
    // and redirect to login
    if (error.name === "AuthApiError" && error.status === 400) {
      // Clear auth cookies
      const response = NextResponse.redirect(new URL("/auth/login", req.url))
      response.cookies.delete("sb-access-token")
      response.cookies.delete("sb-refresh-token")
      return response
    }

    // For other errors, just continue
    return res
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
