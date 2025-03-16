"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Search, Check } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type Club = {
  id: number
  name: string
  logo_url: string | null
}

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Club selection state
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedClub, setSelectedClub] = useState<Club | null>(null)
  const [clubs, setClubs] = useState<Club[]>([])
  const [loadingClubs, setLoadingClubs] = useState(true)

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        setLoadingClubs(true)
        const { data, error } = await supabase.from("clubs").select("id, name, logo_url").order("name")

        if (error) {
          throw error
        }

        setClubs(data || [])
      } catch (error: any) {
        console.error("Error fetching clubs:", error)
        setError("Failed to load clubs. Please try again.")
      } finally {
        setLoadingClubs(false)
      }
    }

    fetchClubs()
  }, [supabase])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (!selectedClub) {
      setError("Please select your club")
      setLoading(false)
      return
    }

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            club_id: selectedClub.id,
          },
        },
      })

      if (authError) {
        throw authError
      }

      if (authData.user) {
        // Create or update the profile with the selected club
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: authData.user.id,
          club_id: selectedClub.id,
          updated_at: new Date().toISOString(),
        })

        if (profileError) {
          console.error("Error updating profile:", profileError)
          // Continue anyway as the auth was successful
        }
      }

      // Redirect to dashboard or a confirmation page
      router.push("/auth/verification")
    } catch (error: any) {
      setError(error.message || "An error occurred during registration")
    } finally {
      setLoading(false)
    }
  }

  const filteredClubs =
    search === "" ? clubs : clubs.filter((club) => club.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>Enter your email, create a password, and select your club to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {/* Club Selection */}
            <div className="space-y-2">
              <Label htmlFor="club">Your Club</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="club"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    disabled={loadingClubs}
                  >
                    {loadingClubs ? "Loading clubs..." : selectedClub ? selectedClub.name : "Select your club..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search clubs..." value={search} onValueChange={setSearch} />
                    <CommandList>
                      <CommandEmpty>No clubs found.</CommandEmpty>
                      <CommandGroup>
                        {filteredClubs.map((club) => (
                          <CommandItem
                            key={club.id}
                            value={club.name}
                            onSelect={() => {
                              setSelectedClub(club)
                              setOpen(false)
                            }}
                          >
                            <Check
                              className={cn("mr-2 h-4 w-4", selectedClub?.id === club.id ? "opacity-100" : "opacity-0")}
                            />
                            {club.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-sm text-muted-foreground mt-2">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary underline-offset-4 hover:underline">
              Login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

