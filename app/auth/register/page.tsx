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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

type Player = {
  id: number
  name: string
  club_id: number | null
  position: string
  wyscout_player_id?: number
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
  const [playerOpen, setPlayerOpen] = useState(false)
  const [playerSearch, setPlayerSearch] = useState("")
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [playerNotFound, setPlayerNotFound] = useState(false)
  const [playerName, setPlayerName] = useState("")
  const [playerPosition, setPlayerPosition] = useState("")
  const [playerClub, setPlayerClub] = useState("")
  const [playerDOB, setPlayerDOB] = useState("")
  const [playerNationality, setPlayerNationality] = useState("")

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

  useEffect(() => {
    const fetchPlayers = async () => {
      if (role !== "player") return
      
      try {
        setLoadingPlayers(true)
        // Use the same RPC function as scouting to get unique/latest players
        const { data, error } = await supabase.rpc('get_scouting_players', {
          p_requesting_club_id: 1, // Dummy club ID for registration
          p_limit: 1000 // Higher limit for registration search
        })

        if (error) {
          throw error
        }

        // Transform the data to match our Player type
        const transformedPlayers = data?.map(player => ({
          id: player.player_id,
          name: player.name,
          position: player.player_pos,
          club_id: player.club_id,
          wyscout_player_id: player.wyscout_player_id
        })) || []

        setPlayers(transformedPlayers)
      } catch (error: any) {
        console.error("Error fetching players:", error)
        setError("Failed to load players. Please try again.")
      } finally {
        setLoadingPlayers(false)
      }
    }

    fetchPlayers()
  }, [supabase, role])

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

    if (role === 'agent') {
      setError(`Registration for ${role}s is coming soon! Please check back later.`);
      setMessageType('info'); // Set the message type to 'info'
      setLoading(false);
      return;
    }

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

    if (role === 'player' && playerNotFound && (!playerName || !playerPosition)) {
      setError("Please provide your name and position")
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
        ? { club_id: selectedClub?.id, user_type: 'club_staff' }
        : playerNotFound
          ? {
              user_type: 'player',
              player_not_in_database: true,
              player_name: playerName,
              player_position: playerPosition,
              player_club: playerClub,
              player_dob: playerDOB,
              player_nationality: playerNationality
            }
          : {
              wyscout_player_id: selectedPlayer?.wyscout_player_id || selectedPlayer?.id,
              user_type: 'player',
              player_name: selectedPlayer?.name,
              player_position: selectedPlayer?.position
            };

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
        if (role === 'club' && selectedClub) {
          // Create club staff profile
          const { error: profileError } = await supabase.from("profiles").upsert({
            id: authData.user.id,
            club_id: selectedClub.id,
            user_type: 'club_staff',
            updated_at: new Date().toISOString(),
          })

          if (profileError) {
            console.error("Error updating club profile:", profileError)
          }
        } else if (role === 'player') {
          if (playerNotFound) {
            // Player not in database - create data request
            console.log("Creating data request for player:", playerName)

            // Create player profile
            const { error: profileError } = await supabase.from("profiles").upsert({
              id: authData.user.id,
              club_id: null,
              user_type: 'player',
              updated_at: new Date().toISOString(),
            })

            if (profileError) {
              console.error("Error creating player profile:", profileError)
            }

            // Create data request
            const { error: dataRequestError } = await supabase.from("player_data_requests").insert({
              user_id: authData.user.id,
              player_name: playerName,
              email: email,
              current_club: playerClub || null,
              position: playerPosition,
              nationality: playerNationality || null,
              date_of_birth: playerDOB || null,
              additional_info: `Registration request from player not in database`,
              status: 'pending'
            })

            if (dataRequestError) {
              console.error("Error creating data request:", dataRequestError)
            } else {
              console.log("Data request created successfully for:", playerName)
            }

            // Create player_profiles entry with null wyscout_player_id
            const { error: playerProfileError } = await supabase.from("player_profiles").insert({
              id: authData.user.id,
              wyscout_player_id: null, // No Wyscout ID yet
              looking_status: 'open_to_offers',
            })

            if (playerProfileError) {
              console.error("ERROR creating player_profiles entry:", playerProfileError)
            }
          } else if (selectedPlayer) {
            console.log("Creating player profile for:", selectedPlayer.name)
            console.log("Selected player wyscout_player_id:", selectedPlayer.wyscout_player_id)

            // Create player profile (though trigger should handle this)
            const { error: profileError } = await supabase.from("profiles").upsert({
              id: authData.user.id,
              club_id: null, // Players don't belong to a specific club in profiles
              user_type: 'player',
              updated_at: new Date().toISOString(),
            })

            if (profileError) {
              console.error("Error creating player profile:", profileError)
            } else {
              console.log("Player profile created/updated successfully")
            }

            // Create player_profiles entry
            console.log("About to create player_profiles entry...")
            const { error: playerProfileError } = await supabase.from("player_profiles").insert({
              id: authData.user.id,
              wyscout_player_id: selectedPlayer.wyscout_player_id, // Link to stable Wyscout ID
              looking_status: 'open_to_offers',
            })

            if (playerProfileError) {
              console.error("ERROR creating player_profiles entry:", playerProfileError)
              console.error("Selected player data:", selectedPlayer)
            } else {
              console.log("SUCCESS: Created player_profiles entry for:", selectedPlayer.name)
            }
          }
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

  const filteredPlayers =
    playerSearch === "" ? players : players.filter((player) => 
      player.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
      player.position.toLowerCase().includes(playerSearch.toLowerCase())
    )

  // If user already exists, show the existing user message
  if (existingUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12">
        <div className="mb-8">
          <Logo />
        </div>
        <Card className="w-full max-w-md border-0 shadow-lg bg-gray-50">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-amber-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-[#3144C3]">Account Already Exists</CardTitle>
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
                className="w-full bg-[#3144C3] hover:bg-[#3144C3]/90 flex items-center justify-center"
                onClick={() => router.push("/auth/login")}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Log in to your account
              </Button>
              <Button
                variant="outline"
                className="w-full flex items-center justify-center border-[#3144C3] text-[#3144C3]"
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12">
        <div className="mb-8">
          <Logo />
        </div>
        <Card className="w-full max-w-md border-0 shadow-lg bg-gray-50">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <Mail className="h-12 w-12 text-[#3144C3]" />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-[#3144C3]">Confirm Your Email</CardTitle>
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <Card className="w-full max-w-md border-0 shadow-lg bg-gray-50">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-[#3144C3]">Create an account</CardTitle>
          <CardDescription>Enter your email, create a password, and select your club to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
                <Alert variant={messageType === 'error' ? 'destructive' : 'default'} className={messageType === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' : ''}>
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

            {/* Step 2: Club Selection (Conditional) */}
            <div className="space-y-2">
              <Label htmlFor="club" className={isClubSelectionDisabled ? 'text-muted-foreground' : ''}>
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
                      // <<< APPLY THE DISABLED STATE HERE >>>
                      disabled={isClubSelectionDisabled || loadingClubs}
                  >
                    {loadingClubs
                        ? "Loading clubs..."
                        : selectedClub
                            ? (
                                <div className="flex items-center">
                                  <Avatar className="h-6 w-6 mr-2">
                                    <AvatarImage src={selectedClub.logo_url || ""} alt={selectedClub.name} />
                                    <AvatarFallback className="bg-[#3144C3] text-white text-xs">
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
                                <AvatarFallback className="bg-[#3144C3] text-white text-xs">
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

            {/* Player Selection (Conditional) */}
            {role === "player" && (
              <div className="space-y-2">
                <Label htmlFor="player">
                  Find Your Player Profile
                </Label>
                <Popover open={playerOpen} onOpenChange={setPlayerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                        id="player"
                        variant="outline"
                        role="combobox"
                        aria-expanded={playerOpen}
                        className="w-full justify-between"
                        disabled={loadingPlayers || playerNotFound}
                    >
                      {loadingPlayers
                          ? "Loading players..."
                          : selectedPlayer
                              ? (
                                  <div className="flex items-center">
                                    <div className="h-6 w-6 mr-2 bg-[#3144C3] rounded-full flex items-center justify-center text-white text-xs font-bold">
                                      {selectedPlayer.name.charAt(0)}
                                    </div>
                                    <div className="flex flex-col items-start">
                                      <span className="text-sm font-medium">{selectedPlayer.name}</span>
                                      <span className="text-xs text-muted-foreground">{selectedPlayer.position}</span>
                                    </div>
                                  </div>
                              )
                              : "Search for your player profile..."}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Search by name or position..." value={playerSearch} onValueChange={setPlayerSearch} />
                      <CommandList>
                        <CommandEmpty>No players found. Try a different search term.</CommandEmpty>
                        <CommandGroup>
                          {filteredPlayers.slice(0, 50).map((player) => (
                              <CommandItem
                                  key={player.id}
                                  value={`${player.name} ${player.position}`}
                                  onSelect={() => {
                                    setSelectedPlayer(player)
                                    setPlayerOpen(false)
                                  }}
                                  className="flex items-center"
                              >
                                <div className="h-6 w-6 mr-2 bg-[#3144C3] rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {player.name.charAt(0)}
                                </div>
                                <div className="flex flex-col items-start">
                                  <span className="text-sm font-medium">{player.name}</span>
                                  <span className="text-xs text-muted-foreground">{player.position}</span>
                                </div>
                                <Check
                                    className={cn(
                                        "ml-auto h-4 w-4",
                                        selectedPlayer?.id === player.id ? "opacity-100" : "opacity-0",
                                    )}
                                />
                              </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
                      className="h-4 w-4 text-[#3144C3] focus:ring-[#3144C3] border-gray-300 rounded"
                    />
                    <Label htmlFor="player-not-found" className="text-sm font-medium">
                      I'm not in the player list
                    </Label>
                  </div>
                </div>

                {playerNotFound && (
                  <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm font-medium text-blue-900">
                      FootyLabs will be notified of your registration and will add your data within 5 working days.
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="player-name" className="text-sm">Full Name *</Label>
                        <Input
                          id="player-name"
                          type="text"
                          placeholder="Your full name"
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          required={playerNotFound}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="player-position" className="text-sm">Position *</Label>
                        <Input
                          id="player-position"
                          type="text"
                          placeholder="e.g. Center Forward, Left Winger"
                          value={playerPosition}
                          onChange={(e) => setPlayerPosition(e.target.value)}
                          required={playerNotFound}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="player-club" className="text-sm">Current Club</Label>
                        <Input
                          id="player-club"
                          type="text"
                          placeholder="Your current club (optional)"
                          value={playerClub}
                          onChange={(e) => setPlayerClub(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="player-dob" className="text-sm">Date of Birth</Label>
                        <Input
                          id="player-dob"
                          type="date"
                          value={playerDOB}
                          onChange={(e) => setPlayerDOB(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="player-nationality" className="text-sm">Nationality</Label>
                        <Input
                          id="player-nationality"
                          type="text"
                          placeholder="Your nationality (optional)"
                          value={playerNationality}
                          onChange={(e) => setPlayerNationality(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full bg-[#3144C3] hover:bg-[#3144C3]/90" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-sm text-muted-foreground mt-2">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-[#3144C3] underline-offset-4 hover:underline">
              Login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
