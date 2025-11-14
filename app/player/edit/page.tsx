import {BentoGridEditor, EditableGrid} from "@/components/player/bento-grid-editor";

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
export default function PlayerProfile({params}) {


  return (
      <div className="container">
        <BentoGridEditor/>
      </div>
  );
}
