import { useState } from "react";
import { FieldSVG, ZONES } from "./WagonWheelModal";

interface Shot {
  zone: string;
  runs: number;
  batsmanPublicId: string;
  batsmanName: string;
  battingStyle?: string;
}

interface WagonWheelDisplayProps {
  shots: Shot[];
  batters: { publicId: string; name: string; battingStyle?: string }[];
}

export default function WagonWheelDisplay({ shots, batters }: WagonWheelDisplayProps) {
  const [selectedBatter, setSelectedBatter] = useState<string | null>(
    batters.length > 0 ? batters[0].publicId : null
  );

  const filteredShots = selectedBatter
    ? shots.filter(s => s.batsmanPublicId === selectedBatter)
    : shots;

  const selectedBatterInfo = batters.find(b => b.publicId === selectedBatter);
  const isLHB = selectedBatterInfo?.battingStyle?.toLowerCase().includes("left") ?? false;

  if (shots.length === 0) return null;

  // Stats breakdown
  const fours = filteredShots.filter(s => s.runs === 4).length;
  const sixes = filteredShots.filter(s => s.runs === 6).length;
  const singles = filteredShots.filter(s => s.runs === 1 || s.runs === 3).length;
  const twos = filteredShots.filter(s => s.runs === 2).length;

  return (
    <div className="space-y-3">
      {/* Batter filter */}
      {batters.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedBatter(null)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all active:scale-95 ${
              !selectedBatter
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            }`}
          >
            All
          </button>
          {batters.map(b => (
            <button
              key={b.publicId}
              onClick={() => setSelectedBatter(b.publicId)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all active:scale-95 ${
                selectedBatter === b.publicId
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              }`}
            >
              {b.name.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {/* Field */}
      <div className="bg-gray-900 dark:bg-gray-900 rounded-2xl p-4 flex flex-col items-center">
        <FieldSVG
          isLHB={isLHB}
          interactive={false}
          shots={filteredShots}
        />

        {/* Legend */}
        <div className="flex gap-4 mt-3">
          {[
            { color: "bg-white", label: `1s/3s (${singles})` },
            { color: "bg-blue-500", label: `2s (${twos})` },
            { color: "bg-green-500", label: `4s (${fours})` },
            { color: "bg-purple-500", label: `6s (${sixes})` },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-3 h-0.5 ${color} rounded-full`} />
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Zone breakdown */}
      {filteredShots.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Shot breakdown by zone
            </p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {Object.entries(
              filteredShots.reduce((acc, s) => {
                acc[s.zone] = (acc[s.zone] ?? 0) + s.runs;
                return acc;
              }, {} as Record<string, number>)
            )
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([zone, runs]) => (
                <div key={zone} className="flex justify-between items-center px-3 py-2">
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    {ZONES.find(z => z.id === zone)?.label ?? zone}
                  </span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {runs} runs
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
