import type { LucideIcon } from "lucide-react";


type Props = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: "blue" | "green" | "orange" | "red";
};

const colorMap = {
  blue: "text-blue-600",
  green: "text-green-600",
  orange: "text-orange-600",
  red: "text-red-600",
};

function StatCard({
  label,
  value,
  icon: Icon,
  color = "blue",
}: Props) {
  return (
    <div className="bg-white p-5 rounded-lg shadow hover:shadow-lg transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>

        <Icon className={`h-8 w-8 ${colorMap[color]}`} />
      </div>
    </div>
  );
}

export default StatCard;
