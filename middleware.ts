import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Update the middleware to allow access to the verification page
  // If user is not signed in and the current path is not / or /auth/*, redirect to /auth/login
  if (!session && !req.nextUrl.pathname.startsWith("/auth") && req.nextUrl.pathname !== "/") {
    return NextResponse.redirect(new URL("/auth/login", req.url))
  }

  // If user is signed in and the current path is /auth/login or /auth/register, redirect to /dashboard
  if (session && (req.nextUrl.pathname === "/auth/login" || req.nextUrl.pathname === "/auth/register")) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Allow access to verification page and callback regardless of auth status
  if (req.nextUrl.pathname === "/auth/verification" || req.nextUrl.pathname === "/auth/callback") {
    return res
  }

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

