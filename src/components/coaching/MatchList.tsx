import { useState } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { MatchPerformanceResponse } from "../../api/playerService/coachingService";

const RESULT_STYLES: Record<string, string> = {
  WON: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
  DRAW: "bg-yellow-100 text-yellow-700",
  NO_RESULT: "bg-slate-100 text-slate-600",
};

const MATCH_TYPE_STYLES: Record<string, string> = {
  TOURNAMENT: "bg-purple-100 text-purple-700",
  LEAGUE: "bg-blue-100 text-blue-700",
  PRACTICE_MATCH: "bg-teal-100 text-teal-700",
  FRIENDLY: "bg-orange-100 text-orange-700",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type Props = {
  matches: MatchPerformanceResponse[];
  loading: boolean;
  isSuperAdmin: boolean;
  playerPublicId: string;
  onNew: () => void;
  onEdit: (publicId: string) => void;
  onDelete: (publicId: string) => void;
};

export default function MatchList({
  matches,
  loading,
  isSuperAdmin,
  onNew,
  onEdit,
  onDelete,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900">Match Performances</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {matches.length} match{matches.length !== 1 ? "es" : ""} recorded
          </p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm"
        >
          <Plus size={15} /> Add Match
        </button>
      </div>

      {loading && (
        <div className="text-center py-10">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {!loading && matches.length === 0 && (
        <div className="bg-white rounded-lg shadow p-10 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <p className="font-semibold text-slate-700">No matches logged yet</p>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Record match performances to track progress.
          </p>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700"
          >
            <Plus size={16} /> Add First Match
          </button>
        </div>
      )}

      {!loading && matches.length > 0 && (
        <div className="space-y-3">
          {matches.map((match) => {
            const isExpanded = expandedId === match.publicId;
            const batting = match.battingStats as any;
            const bowling = match.bowlingStats as any;
            const fielding = match.fieldingStats as any;

            return (
              <div
                key={match.publicId}
                className="bg-white rounded-lg border border-slate-200 shadow-sm"
              >
                {/* Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : match.publicId)
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">
                          {formatDate(match.matchDate)}
                        </span>
                        {match.result && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${RESULT_STYLES[match.result]}`}
                          >
                            {match.result}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${MATCH_TYPE_STYLES[match.matchType] || "bg-slate-100 text-slate-600"}`}
                        >
                          {match.matchType.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {match.oppositionTeam && (
                          <span className="text-xs text-slate-500">
                            vs {match.oppositionTeam}
                          </span>
                        )}
                        {match.venue && (
                          <span className="text-xs text-slate-400">
                            📍 {match.venue}
                          </span>
                        )}
                      </div>
                      {/* Quick stats pills */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {batting?.runs != null && (
                          <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            🏏 {batting.runs}R{" "}
                            {batting.balls ? `(${batting.balls}B)` : ""}
                          </span>
                        )}
                        {bowling?.wickets != null && (
                          <span className="text-[10px] font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                            🎯 {bowling.wickets}W / {bowling.runsConceded}R
                          </span>
                        )}
                        {fielding?.catches != null && fielding.catches > 0 && (
                          <span className="text-[10px] font-semibold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">
                            🥊 {fielding.catches}C
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp
                        size={16}
                        className="text-slate-400 flex-shrink-0"
                      />
                    ) : (
                      <ChevronDown
                        size={16}
                        className="text-slate-400 flex-shrink-0"
                      />
                    )}
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                    {/* Stats grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {batting && Object.keys(batting).length > 0 && (
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2">
                            Batting
                          </p>
                          {Object.entries(batting).map(
                            ([k, v]) =>
                              v != null && (
                                <div
                                  key={k}
                                  className="flex justify-between text-xs"
                                >
                                  <span className="text-blue-600 capitalize">
                                    {k.replace(/([A-Z])/g, " $1")}
                                  </span>
                                  <span className="font-semibold text-blue-800">
                                    {String(v)}
                                  </span>
                                </div>
                              ),
                          )}
                        </div>
                      )}
                      {bowling && Object.keys(bowling).length > 0 && (
                        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                          <p className="text-[10px] font-bold text-green-400 uppercase tracking-wider mb-2">
                            Bowling
                          </p>
                          {Object.entries(bowling).map(
                            ([k, v]) =>
                              v != null && (
                                <div
                                  key={k}
                                  className="flex justify-between text-xs"
                                >
                                  <span className="text-green-600 capitalize">
                                    {k.replace(/([A-Z])/g, " $1")}
                                  </span>
                                  <span className="font-semibold text-green-800">
                                    {String(v)}
                                  </span>
                                </div>
                              ),
                          )}
                        </div>
                      )}
                      {fielding && Object.keys(fielding).length > 0 && (
                        <div className="bg-teal-50 rounded-lg p-3 border border-teal-100">
                          <p className="text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-2">
                            Fielding
                          </p>
                          {Object.entries(fielding).map(
                            ([k, v]) =>
                              v != null && (
                                <div
                                  key={k}
                                  className="flex justify-between text-xs"
                                >
                                  <span className="text-teal-600 capitalize">
                                    {k.replace(/([A-Z])/g, " $1")}
                                  </span>
                                  <span className="font-semibold text-teal-800">
                                    {String(v)}
                                  </span>
                                </div>
                              ),
                          )}
                        </div>
                      )}
                    </div>

                    {match.playerReflection && (
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Player Reflection
                        </p>
                        <p className="text-sm text-slate-600">
                          {match.playerReflection}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(match.publicId);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      {isSuperAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(match.publicId);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
