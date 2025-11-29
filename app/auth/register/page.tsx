"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Search, Check, Mail, LogIn, KeyRound } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/logo"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import PlayerSelectionModal from "@/components/player-selection-modal"

type Player = {
  id: number  // transfermarkt player ID
  name: string
  club_id: number | null
  position: string  // main_position from transfermarkt
  club_name?: string  // club name for display
  age?: number
}

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
  const [role, setRole] = useState<string>("");
  const [isClubSelectionDisabled, setIsClubSelectionDisabled] = useState<boolean>(true);
  const [messageType, setMessageType] = useState<'error' | 'info'>('error');
  const supabase = createClient()

  // Club selection state
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedClub, setSelectedClub] = useState<Club | null>(null)
  const [clubs, setClubs] = useState<Club[]>([])
  const [loadingClubs, setLoadingClubs] = useState(true)

  // Player selection state
  const [playerModalOpen, setPlayerModalOpen] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [playerNotFound, setPlayerNotFound] = useState(false)
  const [playerName, setPlayerName] = useState("")
  const [transfermarktLink, setTransfermarktLink] = useState("")
  const [registrationNote, setRegistrationNote] = useState("")

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        if (!supabase) return;
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


  useEffect(() => {
    if (role === "club") {
      setIsClubSelectionDisabled(false); // Enable club selection
      setSelectedPlayer(null); // Clear player selection
    } else if (role === "player") {
      setIsClubSelectionDisabled(true);  // Disable club selection for players
      setSelectedClub(null);           // Clear club selection
    } else {
      setIsClubSelectionDisabled(true);  // Disable for 'agent'
      setSelectedClub(null);           // Clear any previously selected club
      setSelectedPlayer(null);         // Clear player selection
    }
  }, [role]); //

  // Check if email exists before attempting registration
  const checkEmailExists = async (email: string) => {
    try {
      if (!supabase) return;
      // Use the signInWithOtp method instead, which is more reliable for checking email existence
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false, // This ensures we only check if the user exists
        },
      })

      // If the error message indicates the user doesn't exist, return false
      if (error && error.message.includes("User not found")) {
        return false
      }

      // If there's no error or a different error, the user likely exists
      // For other errors, we'll assume the user doesn't exist to allow registration to proceed
      return !error
    } catch (error) {
      console.error("Error checking if email exists:", error)
      // If there's an exception, assume the user doesn't exist to allow registration
      return false
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setExistingUser(false)

    // Agent registration is now enabled
    // Removed the "coming soon" block for agents

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (role === 'club' && !selectedClub) {
      setError("Please select your club")
      setLoading(false)
      return
    }

    if (role === 'player' && !selectedPlayer && !playerNotFound) {
      setError("Please find and select your player profile or indicate if you're not in the player list yet")
      setLoading(false)
      return
    }

    if (role === 'player' && playerNotFound && !transfermarktLink) {
      setError("Please provide your Transfermarkt profile link")
      setLoading(false)
      return
    }

    if (!registrationNote.trim()) {
      setError("Please tell us about yourself - this field is required")
      setLoading(false)
      return
    }

    try {
      // First check if the email already exists
      const emailExists = await checkEmailExists(email)

      if (emailExists) {
        console.log("Email exists check returned true for:", email)
        setExistingUser(true)
        setLoading(false)
        return
      }

      // If email doesn't exist, proceed with sign up
      const signUpData = role === 'club'
        ? {
            club_id: selectedClub?.id,
            user_type: 'club_staff',
            registration_note: registrationNote || null
          }
        : role === 'agent'
          ? {
              user_type: 'agent',
              registration_note: registrationNote
            }
          : playerNotFound
            ? {
                user_type: 'player',
                player_not_in_database: true,
                transfermarkt_link: transfermarktLink,
                registration_note: registrationNote
              }
            : {
                transfermarkt_player_id: selectedPlayer?.id,  // NEW: Transfermarkt player ID
                user_type: 'player',
                player_name: selectedPlayer?.name,
                player_position: selectedPlayer?.position,
                registration_note: registrationNote
              };
      if (!supabase) return;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: signUpData,
        },
      })

      // Add a fallback check for the authError to catch any "already registered" errors
      if (authError) {
        console.error("Auth error during signup:", authError)

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
        // Trigger handles all profile and player_profiles creation automatically
        console.log("User created successfully. Trigger has handled profile creation.")
        console.log("User type:", role)
        if (role === 'player') {
          if (playerNotFound) {
            console.log("Player not in database - Transfermarkt link:", transfermarktLink)
          } else if (selectedPlayer) {
            console.log("Player in database:", selectedPlayer.name)
          }
        } else if (role === 'club') {
          console.log("Club:", selectedClub?.name)
        } else if (role === 'agent') {
          console.log("Agent registration completed")
        }

        // Notify admins of new registration
        try {
          await fetch('/api/emails/notify-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userEmail: email,
              userType: role === 'club' ? 'club_staff' : role,
              clubName: selectedClub?.name || null,
              registeredAt: new Date().toISOString(),
            }),
          })
          console.log("Admin notification sent")
        } catch (notifyError) {
          console.error("Failed to notify admins:", notifyError)
          // Don't block registration if notification fails
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
        <div className="mb-8">
          <Logo />
        </div>
        <Card className="w-full max-w-md shadow-lg bg-card">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-amber-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-primary">Account Already Exists</CardTitle>
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
                className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center"
                onClick={() => router.push("/auth/login")}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Log in to your account
              </Button>
              <Button
                variant="outline"
                className="w-full flex items-center justify-center border-[#3144C3] text-primary"
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
        <div className="mb-8">
          <Logo />
        </div>
        <Card className="w-full max-w-md shadow-lg bg-card">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <Mail className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-primary">Confirm Your Email</CardTitle>
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <Card className="w-full max-w-md shadow-lg bg-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-primary">Create an account</CardTitle>
          <CardDescription>Enter your email, create a password, and select your club to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
                <Alert variant={messageType === 'error' ? 'destructive' : 'default'} className={messageType === 'info' ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-800' : ''}>
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

            {/* Step 1: Select Your Role */}
            <div className="space-y-2">
              <Label htmlFor="role">Account Type</Label>
              <Select onValueChange={setRole} value={role}>
                <SelectTrigger id="role" className="w-full">
                  <SelectValue placeholder="Select your role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="club">Club</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="player">Player</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Club Selection (Only show when role is "club") */}
            {role === "club" && (
              <div className="space-y-2">
                <Label htmlFor="club">
                  Your Club
                </Label>
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
                      {loadingClubs
                          ? "Loading clubs..."
                          : selectedClub
                              ? (
                                  <div className="flex items-center">
                                    <Avatar className="h-6 w-6 mr-2">
                                      <AvatarImage src={selectedClub.logo_url || ""} alt={selectedClub.name} />
                                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                        {selectedClub.name.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    {selectedClub.name}
                                  </div>
                              )
                              : "Select your club..."}
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
                                  className="flex items-center"
                              >
                                <Avatar className="h-6 w-6 mr-2">
                                  <AvatarImage src={club.logo_url || ""} alt={club.name} />
                                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                    {club.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                {club.name}
                                <Check
                                    className={cn(
                                        "ml-auto h-4 w-4",
                                        selectedClub?.id === club.id ? "opacity-100" : "opacity-0",
                                    )}
                                />
                              </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Player Selection (Conditional) */}
            {role === "player" && (
              <div className="space-y-2">
                <Label htmlFor="player">
                  Find Your Player Profile
                </Label>
                <Button
                  id="player"
                  variant="outline"
                  className="w-full justify-between"
                  disabled={playerNotFound}
                  onClick={() => setPlayerModalOpen(true)}
                  type="button"
                >
                  {selectedPlayer ? (
                    <div className="flex items-center">
                      <div className="h-6 w-6 mr-2 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">
                        {selectedPlayer.name.charAt(0)}
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium">{selectedPlayer.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {selectedPlayer.position} • {selectedPlayer.club_name}
                          {selectedPlayer.age && ` • ${selectedPlayer.age}y`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    "Search for your player profile..."
                  )}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Can't find yourself? Your profile may not be in our player list yet.
                  </p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="player-not-found"
                      checked={playerNotFound}
                      onChange={(e) => {
                        setPlayerNotFound(e.target.checked)
                        if (e.target.checked) {
                          setSelectedPlayer(null)
                        }
                      }}
                      className="h-4 w-4 text-primary focus:ring-[#3144C3] border-gray-300 rounded"
                    />
                    <Label htmlFor="player-not-found" className="text-sm font-medium">
                      I'm not in the player list
                    </Label>
                  </div>
                </div>

                {playerNotFound && (
                  <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      FootyLabs will be notified of your registration and will add your data within 5 working days.
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="transfermarkt-link" className="text-sm">Transfermarkt Profile Link *</Label>
                      <Input
                        id="transfermarkt-link"
                        type="url"
                        placeholder="https://www.transfermarkt.com/..."
                        value={transfermarktLink}
                        onChange={(e) => setTransfermarktLink(e.target.value)}
                        required={playerNotFound}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Registration Note */}
            <div className="space-y-2">
              <Label htmlFor="registration-note">
                Tell us about yourself *
              </Label>
              <span className="text-xs text-muted-foreground block mt-2 mb-2">
                Help admins verify your account by introducing yourself, your role, and why you're joining FootyLabs
              </span>
              <Textarea
                id="registration-note"
                placeholder="e.g., I'm the sporting director at [Club Name], looking to use FootyLabs for scouting and recruitment..."
                value={registrationNote}
                onChange={(e) => setRegistrationNote(e.target.value)}
                rows={4}
                className="resize-none"
                required
              />
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-sm text-muted-foreground mt-2">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-foreground underline-offset-4 hover:underline">
              Login
            </Link>
          </div>
        </CardFooter>
      </Card>

      {/* Player Selection Modal */}
      <PlayerSelectionModal
        isOpen={playerModalOpen}
        onClose={() => setPlayerModalOpen(false)}
        onPlayerSelected={(player: any) => {
          setSelectedPlayer({
            id: player.id,
            name: player.name,
            position: player.main_position || 'Unknown',
            club_id: player.club_id,
            club_name: player.club_name,
            age: player.age
          })
        }}
        selectedPlayerId={selectedPlayer?.id}
      />
    </div>
  )
}
