import { createClient } from "@/lib/supabase/server"

export async function getUserProfile() {
  const supabase = await createClient()

  // Get the current user

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get the user's profile with club information
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      id,
      club_id,
      user_type,
      created_at,
      updated_at,
      clubs (
        id,
        name,
        logo_url
      )
    `)
    .eq("id", user.id)
    .single()

  if (error) {
    console.error("Error fetching user profile:", error)
    return null
  }

  return {
    user,
    profile,
  }
}
