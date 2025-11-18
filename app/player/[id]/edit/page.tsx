import {BentoGridEditor} from "@/components/player/bento-grid-editor";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";

export async function generateMetadata({params}) {
  // Mock player data
  const player = {
    name: "John Doe",
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

  if (!user) {
    redirect('/auth/login');
  }

  let editorMode = false;
  if (user.id === playerId) {
    editorMode = true;
  }

  return (
      <div className="container">
        <BentoGridEditor editorMode={editorMode}/>
      </div>
  );
}
