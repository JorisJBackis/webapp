import {BentoGridEditor} from "@/components/player/bento-grid-editor";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {initialBlocks, initialLayouts} from "@/components/player/init-data";

export async function generateMetadata({params}) {
  // Mock player data
  const player = {
    name: "Sviatoslav",
    description: "Editable football player profile demo",
  };

  return {
    title: `${player.name} | Player Profile`,
    description: player.description,
    openGraph: {
      title: `${player.name} | Player Profile`,
      description: player.description,
    },
  };
}

// Page component
export default async function PlayerProfile({params}) {
  const supabase = await createClient();

  const {id: playerId} = await params;

  const {
    data: {user},
  } = await supabase.auth.getUser();


  let editorMode = false;
  if (user?.id === playerId) {
    editorMode = true;
  }
  console.log(editorMode);

  // Get player profile data
  const { data: profile } = await supabase
    .from('player_profiles')
    .select('*')
    .eq('id', playerId)
    .single()

  // Get Transfermarkt player data
  let playerData = null
  if (profile?.transfermarkt_player_id) {
    const { data: tmPlayer } = await supabase
      .from('players_transfermarkt')
      .select(`
        id,
        name,
        picture_url,
        main_position,
        sofascore_players_staging (
          position
        )
      `)
      .eq('id', profile.transfermarkt_player_id)
      .single()

    if (tmPlayer) {
      playerData = {
        name: tmPlayer.name,
        picture_url: tmPlayer.picture_url,
        position: (tmPlayer.sofascore_players_staging as any)?.position || tmPlayer.main_position
      }
    }
  }

  return (
      <div className="container">
        <BentoGridEditor
          editorMode={editorMode}
          initialBlocks={initialBlocks}
          initialLayouts={initialLayouts}
          playerData={playerData}
        />
      </div>
  );
}
