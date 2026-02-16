import { useParams } from "react-router-dom";
import PlayerMediaTab from "../../components/player/PlayerMediaTab";

function PlayerMediaPage() {
  const { playerPublicId } = useParams();

  if (!playerPublicId) return null;

  return <PlayerMediaTab playerPublicId={playerPublicId} />;
}

export default PlayerMediaPage;
