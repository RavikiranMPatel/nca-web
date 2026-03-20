import { usePresence } from "../hooks/usePresence";
import { Users } from "lucide-react";

type Props = {
  entity: string;
  id: string | undefined;
};

function PresenceBanner({ entity, id }: Props) {
  const { otherUsers } = usePresence(entity, id);

  if (otherUsers.length === 0) return null;

  const names = otherUsers.join(", ");
  const isPlural = otherUsers.length > 1;

  return (
    <div
      className="flex items-start gap-3 bg-amber-50 border border-amber-300
                    text-amber-800 rounded-xl px-4 py-3 text-sm mb-4"
    >
      <Users size={16} className="mt-0.5 flex-shrink-0 text-amber-500" />
      <div>
        <p className="font-semibold">
          {isPlural ? `${otherUsers.length} others are` : `${names} is`}{" "}
          currently viewing this page
        </p>
        <p className="text-amber-700 text-xs mt-0.5">
          {isPlural ? `${names} are` : `${names} is`} also here — coordinate
          before saving to avoid conflicts.
        </p>
      </div>
    </div>
  );
}

export default PresenceBanner;
