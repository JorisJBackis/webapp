import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
        },
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Allow public access to player profiles, OG images, email API, admin routes, home, and error pages
  const publicPaths = ["/", "/player", "/api/og", "/api/emails", "/admin", "/auth", "/error"]
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (!user && !isPublicPath) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // If user is signed in, check their approval status
  if (user && !request.nextUrl.pathname.startsWith("/auth")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("approval_status")
      .eq("id", user.id)
      .single()

    // Redirect based on approval status
    if (profile?.approval_status === "pending" && request.nextUrl.pathname !== "/auth/pending-approval") {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/pending-approval'
      return NextResponse.redirect(url)
    }

    if (profile?.approval_status === "rejected" && request.nextUrl.pathname !== "/auth/rejected") {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/rejected'
      return NextResponse.redirect(url)
    }
  }

  // If user is approved and on /auth/login or /auth/register, redirect to /dashboard
  if (user && (request.nextUrl.pathname === "/auth/login" || request.nextUrl.pathname === "/auth/register")) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}