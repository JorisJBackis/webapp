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
import { AlertCircle, Search, Check, Mail, LogIn, KeyRound } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/logo"

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
  const [success, setSuccess] = useState(false)
  const [existingUser, setExistingUser] = useState(false)
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

  // Check if email exists before attempting registration
  const checkEmailExists = async (email: string) => {
    try {
      // First, try to sign in with a deliberately wrong password to check if the email exists
      // This is a workaround since Supabase doesn't provide a direct way to check if an email exists
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: "check_if_email_exists_" + Math.random().toString(36),
      })

      // If the error message indicates the user exists but password is wrong, the email exists
      if (
        error &&
        (error.message.includes("Invalid login credentials") || error.message.includes("Invalid email or password"))
      ) {
        return true
      }

      return false
    } catch (error) {
      console.error("Error checking if email exists:", error)
      return false
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setExistingUser(false)

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
      // First check if the email already exists
      const emailExists = await checkEmailExists(email)

      if (emailExists) {
        setExistingUser(true)
        setLoading(false)
        return
      }

      // If email doesn't exist, proceed with sign up
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

      // Double-check for existing user errors
      if (authError) {
        if (
          authError.message.includes("already registered") ||
          authError.message.includes("already exists") ||
          authError.message.includes("already taken") ||
          authError.message.includes("User already registered")
        ) {
          setExistingUser(true)
          setLoading(false)
          return
        }
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

      // Show success message
      setSuccess(true)

      // Redirect to verification page after a short delay
      setTimeout(() => {
        router.push("/auth/verification")
      }, 2000)
    } catch (error: any) {
      console.error("Registration error:", error)
      setError(error.message || "An error occurred during registration")
      setLoading(false)
    }
  }

  const filteredClubs =
    search === "" ? clubs : clubs.filter((club) => club.name.toLowerCase().includes(search.toLowerCase()))

  // If user already exists, show the existing user message
  if (existingUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-footylabs-darkblue px-4 py-12">
        <div className="mb-8">
          <Logo className="text-white" />
        </div>
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-amber-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-footylabs-blue">Account Already Exists</CardTitle>
            <CardDescription className="text-center">
              An account with email <span className="font-medium">{email}</span> is already registered
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              You can log in with your existing account or reset your password if you've forgotten it.
            </p>
            <div className="flex flex-col space-y-3">
              <Button
                className="w-full bg-footylabs-blue hover:bg-footylabs-blue/90 flex items-center justify-center"
                onClick={() => router.push("/auth/login")}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Log in to your account
              </Button>
              <Button
                variant="outline"
                className="w-full flex items-center justify-center"
                onClick={() => router.push("/auth/reset-password")}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Reset your password
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button
              variant="link"
              className="text-sm text-muted-foreground"
              onClick={() => {
                setExistingUser(false)
                setEmail("")
                setPassword("")
                setConfirmPassword("")
                setSelectedClub(null)
              }}
            >
              Try with a different email
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // If registration was successful, show confirmation message
  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-footylabs-darkblue px-4 py-12">
        <div className="mb-8">
          <Logo className="text-white" />
        </div>
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <Mail className="h-12 w-12 text-footylabs-blue" />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-footylabs-blue">Confirm Your Email</CardTitle>
            <CardDescription className="text-center">
              We've sent a verification link to <span className="font-medium">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Please check your email inbox and click on the verification link to complete your account setup. You'll be
              redirected to the verification page in a moment...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-footylabs-darkblue px-4 py-12">
      <div className="mb-8">
        <Logo className="text-white" />
      </div>
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-footylabs-blue">Create an account</CardTitle>
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

            <Button type="submit" className="w-full bg-footylabs-blue hover:bg-footylabs-blue/90" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-sm text-muted-foreground mt-2">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-footylabs-blue underline-offset-4 hover:underline">
              Login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

