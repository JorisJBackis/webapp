"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BarChart, Home, LogOut, Settings, User, ShoppingCart, Search } from "lucide-react"
import { useState, useEffect } from "react"
import {ModeToggleInstant} from "@/components/mode-toggle";

export default function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [userType, setUserType] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserType = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single()
        setUserType(profile?.user_type || null)
      }
    }
    fetchUserType()
  }, [])

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background text-foreground">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Logo className="text-foreground" />
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center space-x-2">
            <Link href="/dashboard">
              <Button
                variant={pathname === "/dashboard" ? "default" : "ghost"}
                size="sm"
                className={pathname === "/dashboard" ? "bg-primary text-primary-foreground" : "text-foreground"}
              >
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/dashboard/analytics">
              <Button
                variant={pathname === "/dashboard/analytics" ? "default" : "ghost"}
                size="sm"
                className={pathname === "/dashboard/analytics" ? "bg-primary text-primary-foreground" : "text-foreground"}
              >
                <BarChart className="mr-2 h-4 w-4" />
                Insights
              </Button>
            </Link>
            {userType !== 'player' && (
              <>
                <Link href="/dashboard/marketplace">
                  <Button
                    variant={pathname.startsWith("/dashboard/marketplace") ? "default" : "ghost"}
                    size="sm"
                    className={pathname.startsWith("/dashboard/marketplace") ? "bg-primary text-primary-foreground" : "text-foreground"}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Marketplace
                  </Button>
                </Link>
                <Link href="/dashboard/scouting">
                  <Button
                    variant={pathname.startsWith("/dashboard/scouting") ? "default" : "ghost"}
                    size="sm"
                    className={pathname.startsWith("/dashboard/scouting") ? "bg-primary text-primary-foreground" : "text-foreground"}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Scouting
                  </Button>
                </Link>
              </>
            )}
          </nav>
          <ModeToggleInstant />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full text-foreground">
                <User className="h-4 w-4" />
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
