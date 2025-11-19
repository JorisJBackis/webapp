import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import PlayerPublicProfile from "@/components/player/player-public-profile"
import type { Metadata } from "next"
import {BentoGridEditor} from "@/components/player/bento-grid-editor";
import {initialBlocks, initialLayouts} from "@/components/player/init-data";


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

    return (
        <div className="container">
          <BentoGridEditor editorMode={false} initialBlocks={initialBlocks} initialLayouts={initialLayouts}/>
        </div>
    )
  } catch (error) {
    console.error('Error fetching player data:', error)
    notFound()
  }
}