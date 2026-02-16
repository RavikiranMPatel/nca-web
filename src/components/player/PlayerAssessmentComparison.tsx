import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { playerAssessmentService } from "../../api/playerService/playerAssessmentService.ts";
import type {
  PlayerAssessmentResponse,
  SkillEntry,
} from "../../api/playerService/playerAssessmentService.ts";

// ─── HELPERS ─────────────────────────────────────────────

const RATING_ORDER: Record<string, number> = {
  NEEDS_WORK: 1,
  DEVELOPING: 2,
  GOOD: 3,
  EXCELLENT: 4,
};

const RATING_STYLES: Record<string, { bg: string; text: string }> = {
  NEEDS_WORK: { bg: "bg-red-100", text: "text-red-700" },
  DEVELOPING: { bg: "bg-yellow-100", text: "text-yellow-700" },
  GOOD: { bg: "bg-green-100", text: "text-green-700" },
  EXCELLENT: { bg: "bg-blue-100", text: "text-blue-700" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRating(r?: string): string {
  if (!r) return "—";
  const words = r.replace(/_/g, " ").split(" ");
  return words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
}

/**
 * Extract all skill entries from a JSONB tab object for comparison
 */
function extractSkills(
  data: Record<string, any> | undefined,
  prefix: string,
): { key: string; label: string; entry: SkillEntry }[] {
  if (!data) return [];
  const results: { key: string; label: string; entry: SkillEntry }[] = [];

  for (const [category, skills] of Object.entries(data)) {
    if (typeof skills !== "object" || skills === null) continue;
    if (
      category === "balancePriority" ||
      category === "bodyMetrics" ||
      category === "goalTracking" ||
      category === "supplements" ||
      category === "coachNotes" ||
      category === "complianceRating"
    )
      continue;

    for (const [skillName, entry] of Object.entries(
      skills as Record<string, any>,
    )) {
      if (
        typeof entry === "object" &&
        entry !== null &&
        (entry.rating || entry.comment)
      ) {
        results.push({
          key: `${prefix}.${category}.${skillName}`,
          label: skillName,
          entry: entry as SkillEntry,
        });
      }
    }
  }
  return results;
}

// ─── COMPONENT ───────────────────────────────────────────

type Props = {
  playerPublicId: string;
  assessments: PlayerAssessmentResponse[]; // lightweight list (no JSONB)
};

function PlayerAssessmentComparison({ playerPublicId, assessments }: Props) {
  const [leftId, setLeftId] = useState(assessments[1]?.publicId || "");
  const [rightId, setRightId] = useState(assessments[0]?.publicId || "");
  const [leftData, setLeftData] = useState<PlayerAssessmentResponse | null>(
    null,
  );
  const [rightData, setRightData] = useState<PlayerAssessmentResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [activeCompareTab, setActiveCompareTab] = useState("cricket");

  useEffect(() => {
    if (leftId && rightId) loadBoth();
  }, [leftId, rightId]);

  const loadBoth = async () => {
    setLoading(true);
    try {
      const [left, right] = await Promise.all([
        playerAssessmentService.getById(playerPublicId, leftId),
        playerAssessmentService.getById(playerPublicId, rightId),
      ]);
      setLeftData(left);
      setRightData(right);
    } catch (error) {
      toast.error("Failed to load assessments for comparison");
    } finally {
      setLoading(false);
    }
  };

  // Build comparison rows
  const getCompareRows = (tab: string) => {
    if (!leftData || !rightData) return [];

    const tabKeyMap: Record<string, string> = {
      cricket: "cricketSkills",
      fitness: "fitness",
      diet: "diet",
      mental: "mental",
    };
    const key = tabKeyMap[tab];

    const leftSkills = extractSkills((leftData as any)[key], tab);
    const rightSkills = extractSkills((rightData as any)[key], tab);

    // Merge all unique skill keys
    const allKeys = new Map<string, string>();
    leftSkills.forEach((s) => allKeys.set(s.key, s.label));
    rightSkills.forEach((s) => allKeys.set(s.key, s.label));

    const leftMap = new Map(leftSkills.map((s) => [s.key, s.entry]));
    const rightMap = new Map(rightSkills.map((s) => [s.key, s.entry]));

    return Array.from(allKeys.entries()).map(([key, label]) => {
      const l = leftMap.get(key);
      const r = rightMap.get(key);
      const lNum = RATING_ORDER[l?.rating || ""] || 0;
      const rNum = RATING_ORDER[r?.rating || ""] || 0;
      const diff = rNum - lNum;

      return { key, label, left: l, right: r, diff };
    });
  };

  const rows = getCompareRows(activeCompareTab);
  const improved = rows.filter((r) => r.diff > 0).length;
  const declined = rows.filter((r) => r.diff < 0).length;
  const unchanged = rows.filter((r) => r.diff === 0).length;

  const compareTabs = [
    { key: "cricket", label: "Cricket", icon: "🏏" },
    { key: "fitness", label: "Fitness", icon: "💪" },
    { key: "diet", label: "Diet", icon: "🍎" },
    { key: "mental", label: "Mental", icon: "🧠" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ─── HEADER ─────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
          📊 Compare Assessments
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mb-4">
          Side-by-side comparison
        </p>

        {/* Date Selectors - stack on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
          <div className="flex-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Earlier
            </label>
            <select
              value={leftId}
              onChange={(e) => setLeftId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {assessments.map((a) => (
                <option key={a.publicId} value={a.publicId}>
                  {formatDate(a.assessmentDate)} (
                  {a.assessmentType.replace(/_/g, " ")})
                </option>
              ))}
            </select>
          </div>
          <div className="hidden sm:block pb-2 text-slate-400 text-lg">→</div>
          <div className="flex-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Later
            </label>
            <select
              value={rightId}
              onChange={(e) => setRightId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {assessments.map((a) => (
                <option key={a.publicId} value={a.publicId}>
                  {formatDate(a.assessmentDate)} (
                  {a.assessmentType.replace(/_/g, " ")})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {!loading && leftData && rightData && (
        <>
          {/* ─── OVERALL RATING CARDS ─────────────────── */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {[leftData, rightData].map((a, i) => {
              const rs = a.overallRating
                ? RATING_STYLES[a.overallRating]
                : null;
              return (
                <div
                  key={i}
                  className={`rounded-lg p-3 sm:p-4 text-center border ${
                    rs
                      ? `${rs.bg} border-transparent`
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">
                    {formatDate(a.assessmentDate)}
                  </p>
                  <p
                    className={`text-sm sm:text-lg font-bold ${
                      rs ? rs.text : "text-slate-400"
                    }`}
                  >
                    {a.overallRating
                      ? a.overallRating.replace(/_/g, " ")
                      : "Not Rated"}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ─── COMPARE TABS ─────────────────────────── */}
          <div className="flex gap-1 bg-white rounded-lg shadow p-1">
            {compareTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveCompareTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-md text-xs font-semibold transition-all ${
                  activeCompareTab === tab.key
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ─── SKILL-BY-SKILL COMPARISON ────────────── */}
          {rows.length > 0 ? (
            <div className="space-y-2 sm:space-y-0">
              {/* Desktop Table Header - hidden on mobile */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_100px_28px_100px] gap-0 px-4 py-3 bg-white rounded-t-lg shadow border-b border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Skill
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase text-center">
                  Before
                </span>
                <span />
                <span className="text-[10px] font-bold text-slate-500 uppercase text-center">
                  After
                </span>
              </div>

              {rows.map((row, i) => {
                const lrs = row.left?.rating
                  ? RATING_STYLES[row.left.rating]
                  : null;
                const rrs = row.right?.rating
                  ? RATING_STYLES[row.right.rating]
                  : null;
                const diffColor =
                  row.diff > 0
                    ? "text-green-600"
                    : row.diff < 0
                      ? "text-red-500"
                      : "text-slate-300";
                const diffIcon = row.diff > 0 ? "↑" : row.diff < 0 ? "↓" : "=";

                const hasLeftComment =
                  row.left?.comment && row.left.comment.trim();
                const hasRightComment =
                  row.right?.comment && row.right.comment.trim();
                const hasComments = hasLeftComment || hasRightComment;

                return (
                  <div key={row.key}>
                    {/* ─── MOBILE CARD LAYOUT (< sm) ────── */}
                    <div className="sm:hidden bg-white rounded-lg shadow-sm border border-slate-100 p-3 mb-2">
                      {/* Skill Name + Trend */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-800">
                          {row.label}
                        </span>
                        <span className={`text-sm font-bold ${diffColor}`}>
                          {diffIcon}
                        </span>
                      </div>

                      {/* Before / After Row */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Before */}
                        <div className="bg-slate-50 rounded-md p-2">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase mb-1">
                            Before
                          </p>
                          {lrs ? (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md inline-block ${lrs.bg} ${lrs.text}`}
                            >
                              {formatRating(row.left?.rating)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-300">
                              —
                            </span>
                          )}
                          {hasLeftComment && (
                            <p className="text-[11px] text-slate-600 mt-1.5 leading-tight break-words bg-white rounded px-1.5 py-1 border border-slate-100">
                              {row.left!.comment}
                            </p>
                          )}
                        </div>

                        {/* After */}
                        <div className="bg-slate-50 rounded-md p-2">
                          <p className="text-[9px] font-semibold text-slate-400 uppercase mb-1">
                            After
                          </p>
                          {rrs ? (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md inline-block ${rrs.bg} ${rrs.text}`}
                            >
                              {formatRating(row.right?.rating)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-300">
                              —
                            </span>
                          )}
                          {hasRightComment && (
                            <p className="text-[11px] text-slate-600 mt-1.5 leading-tight break-words bg-white rounded px-1.5 py-1 border border-slate-100">
                              {row.right!.comment}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ─── DESKTOP TABLE ROW (>= sm) ────── */}
                    <div
                      className={`hidden sm:block bg-white ${
                        i === rows.length - 1
                          ? "rounded-b-lg shadow"
                          : "shadow-sm"
                      }`}
                    >
                      {/* Rating row */}
                      <div
                        className={`grid grid-cols-[1fr_100px_28px_100px] gap-0 px-4 py-3 items-center ${
                          !hasComments && i < rows.length - 1
                            ? "border-b border-slate-100"
                            : ""
                        }`}
                      >
                        <span className="text-sm font-medium text-slate-700 truncate pr-2">
                          {row.label}
                        </span>
                        <span className="text-center">
                          {lrs ? (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${lrs.bg} ${lrs.text}`}
                            >
                              {formatRating(row.left?.rating)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-300">
                              —
                            </span>
                          )}
                        </span>
                        <span
                          className={`text-center text-sm font-bold ${diffColor}`}
                        >
                          {diffIcon}
                        </span>
                        <span className="text-center">
                          {rrs ? (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${rrs.bg} ${rrs.text}`}
                            >
                              {formatRating(row.right?.rating)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-300">
                              —
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Comment comparison row (desktop) */}
                      {hasComments && (
                        <div
                          className={`grid grid-cols-2 gap-3 px-4 pb-3 ${
                            i < rows.length - 1
                              ? "border-b border-slate-100"
                              : ""
                          }`}
                        >
                          <div>
                            {hasLeftComment ? (
                              <p className="text-[11px] text-slate-600 bg-slate-50 rounded-md px-2.5 py-1.5 leading-snug">
                                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">
                                  Coach Note
                                </span>
                                {row.left!.comment}
                              </p>
                            ) : (
                              <div />
                            )}
                          </div>
                          <div>
                            {hasRightComment ? (
                              <p className="text-[11px] text-slate-600 bg-slate-50 rounded-md px-2.5 py-1.5 leading-snug">
                                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">
                                  Coach Note
                                </span>
                                {row.right!.comment}
                              </p>
                            ) : (
                              <div />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-sm text-slate-500">
                No rated skills found in this tab to compare.
              </p>
            </div>
          )}

          {/* ─── IMPROVEMENT SUMMARY ─────────────────── */}
          {rows.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-bold text-green-800 mb-3">
                📈 Improvement Summary
              </p>
              <div className="flex gap-4 sm:gap-6 flex-wrap">
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-green-600">
                    {improved}
                  </p>
                  <p className="text-[10px] text-slate-600">Improved</p>
                </div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-slate-400">
                    {unchanged}
                  </p>
                  <p className="text-[10px] text-slate-600">No Change</p>
                </div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-red-500">
                    {declined}
                  </p>
                  <p className="text-[10px] text-slate-600">Declined</p>
                </div>
              </div>
            </div>
          )}

          {/* ─── COACH NOTES COMPARISON ──────────────── */}
          {(leftData.overallSummary || rightData.overallSummary) && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Coach Notes Comparison
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {[leftData, rightData].map((a, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg shadow-sm p-3 sm:p-4 border border-slate-100"
                  >
                    <p className="text-[10px] font-semibold text-slate-400 mb-2">
                      {formatDate(a.assessmentDate)}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {a.overallSummary || "No notes"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PlayerAssessmentComparison;
