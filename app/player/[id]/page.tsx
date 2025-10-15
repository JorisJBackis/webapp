import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import PlayerPublicProfile from "@/components/player/player-public-profile"

interface PlayerPageProps {
  params: {
    id: string
  }
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const supabase = await createClient()
  const playerId = params.id

  try {
    // Get player profile data
    const { data: profile } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('id', playerId)
      .single()

    if (!profile) {
      notFound()
    }

    // Get user data
    const { data: userData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', playerId)
      .single()

    // Get wyscout player data if available
    let wyscoutPlayer = null
    if (profile.wyscout_player_id) {
      const { data: wyscoutData } = await supabase
        .from('players')
        .select('*')
        .eq('wyscout_player_id', profile.wyscout_player_id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()
      
      wyscoutPlayer = wyscoutData
    }

    return (
      <PlayerPublicProfile 
        profile={profile}
        userData={userData}
        wyscoutPlayer={wyscoutPlayer}
      />
    )
  } catch (error) {
    console.error('Error fetching player data:', error)
    notFound()
  }
}