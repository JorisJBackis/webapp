import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import PlayerPublicProfile from "@/components/player/player-public-profile"
import type { Metadata } from "next"

interface PlayerPageProps {
  params: {
    id: string
  }
}
// TODO:
// export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
//   const supabase = await createClient()
//   const { id: playerId } = await params
//
//   try {
//     // Get player profile data
//     const { data: profile } = await supabase
//       .from('player_profiles')
//       .select('*')
//       .eq('id', playerId)
//       .single()
//
//     if (!profile) {
//       return {
//         title: 'Player Not Found | FootyLabs',
//       }
//     }
//
//     // Get wyscout player data if available
//     let wyscoutPlayer = null
//     if (profile.wyscout_player_id) {
//       const { data: wyscoutData } = await supabase
//         .from('players')
//         .select('*')
//         .eq('wyscout_player_id', profile.wyscout_player_id)
//         .order('updated_at', { ascending: false })
//         .limit(1)
//         .single()
//
//       wyscoutPlayer = wyscoutData
//     }
//
//     const playerName = wyscoutPlayer?.name || profile?.agent_name || "Player"
//     const playerPosition = wyscoutPlayer?.position || profile?.playing_positions?.[0] || "Player"
//     const playerTeam = wyscoutPlayer?.stats?.["Team"] || "Available"
//     const footylabsScore = wyscoutPlayer?.stats?.avg_percentile
//       ? (wyscoutPlayer.stats.avg_percentile * 10).toFixed(1)
//       : "N/A"
//
//     const title = `${playerName} - ${playerPosition} | FootyLabs`
//     const description = `${playerName} • ${playerPosition} • ${playerTeam} • FootyLabs Score: ${footylabsScore}/10`
//     const ogImageUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/og/player?id=${playerId}`
//
//     return {
//       title,
//       description,
//       openGraph: {
//         title,
//         description,
//         type: 'profile',
//         images: [
//           {
//             url: ogImageUrl,
//             width: 1200,
//             height: 630,
//             alt: `${playerName} - FootyLabs Profile`,
//           },
//         ],
//       },
//       twitter: {
//         card: 'summary_large_image',
//         title,
//         description,
//         images: [ogImageUrl],
//       },
//     }
//   } catch (error) {
//     console.error('Error generating metadata:', error)
//     return {
//       title: 'FootyLabs Player Profile',
//     }
//   }
// }

export default async function PlayerPage({ params }: PlayerPageProps) {
  const supabase = await createClient()
  const { id: playerId } = await params;

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