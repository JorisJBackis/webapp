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
  return (
      <div className="container">
        <BentoGridEditor editorMode={editorMode} initialBlocks={initialBlocks} initialLayouts={initialLayouts}/>
      </div>
  );
}
