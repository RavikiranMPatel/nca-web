import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { playerAssessmentService } from "../../api/playerService/playerAssessmentService.ts";
import type {
  PlayerAssessmentResponse,
  SkillEntry,
} from "../../api/playerService/playerAssessmentService.ts";

// ─── CONSTANTS ───────────────────────────────────────────

const RATING_ORDER: Record<string, number> = {
  NEEDS_WORK: 1,
  DEVELOPING: 2,
  GOOD: 3,
  EXCELLENT: 4,
};

const RATING_CONFIG: Record<
  string,
  { bg: string; text: string; border: string; dot: string; label: string }
> = {
  NEEDS_WORK: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-400",
    label: "Needs Work",
  },
  DEVELOPING: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
    dot: "bg-yellow-400",
    label: "Developing",
  },
  GOOD: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    dot: "bg-green-500",
    label: "Good",
  },
  EXCELLENT: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
    label: "Excellent",
  },
};

const OVERALL_CONFIG: Record<string, { card: string; text: string }> = {
  NEEDS_WORK: { card: "bg-red-50 border-red-200", text: "text-red-600" },
  DEVELOPING: {
    card: "bg-yellow-50 border-yellow-200",
    text: "text-yellow-600",
  },
  GOOD: { card: "bg-green-50 border-green-200", text: "text-green-600" },
  EXCELLENT: { card: "bg-blue-50 border-blue-200", text: "text-blue-600" },
};

const TABS = [
  { key: "cricket", label: "Cricket", icon: "🏏" },
  { key: "fitness", label: "Fitness", icon: "💪" },
  { key: "diet", label: "Diet", icon: "🍎" },
  { key: "mental", label: "Mental", icon: "🧠" },
];

const SKIP_KEYS = [
  "balancePriority",
  "bodyMetrics",
  "goalTracking",
  "supplements",
  "coachNotes",
  "complianceRating",
];

// ─── HELPERS ─────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function extractSkills(data: Record<string, any> | undefined, prefix: string) {
  if (!data) return [];
  const results: { key: string; label: string; entry: SkillEntry }[] = [];

  for (const [category, skills] of Object.entries(data)) {
    if (
      typeof skills !== "object" ||
      skills === null ||
      SKIP_KEYS.includes(category)
    )
      continue;
    for (const [subKey, subVal] of Object.entries(
      skills as Record<string, any>,
    )) {
      if (typeof subVal !== "object" || subVal === null) continue;
      if (subVal.rating || subVal.comment) {
        // Fitness/diet/mental — 2 levels deep
        results.push({
          key: `${prefix}.${category}.${subKey}`,
          label: subKey,
          entry: subVal as SkillEntry,
        });
      } else {
        // Cricket — 3 levels deep: batting → basics → Grip
        for (const [skillName, entry] of Object.entries(
          subVal as Record<string, any>,
        )) {
          if (
            typeof entry === "object" &&
            entry !== null &&
            ((entry as any).rating || (entry as any).comment)
          ) {
            results.push({
              key: `${prefix}.${category}.${subKey}.${skillName}`,
              label: skillName,
              entry: entry as SkillEntry,
            });
          }
        }
      }
    }
  }
  return results;
}

function getRatingLabel(r?: string) {
  return r ? (RATING_CONFIG[r]?.label ?? r.replace(/_/g, " ")) : null;
}

// ─── RATING PILL ─────────────────────────────────────────

function RatingPill({ rating }: { rating?: string }) {
  if (!rating)
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 bg-slate-50 border border-slate-100">
        Not rated
      </span>
    );
  const cfg = RATING_CONFIG[rating];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── DIFF ICON ───────────────────────────────────────────

function DiffIcon({ diff }: { diff: number }) {
  if (diff > 0)
    return (
      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
        <TrendingUp size={12} className="text-green-600" />
      </div>
    );
  if (diff < 0)
    return (
      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
        <TrendingDown size={12} className="text-red-500" />
      </div>
    );
  return (
    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
      <Minus size={12} className="text-slate-300" />
    </div>
  );
}

// ─── SKILL ROW — true side by side ───────────────────────

function SkillRow({
  label,
  left,
  right,
  diff,
  isLast,
}: {
  label: string;
  left?: SkillEntry;
  right?: SkillEntry;
  diff: number;
  isLast: boolean;
}) {
  const rowBg = diff > 0 ? "bg-green-50/40" : diff < 0 ? "bg-red-50/30" : "";

  return (
    <div className={`${rowBg} ${!isLast ? "border-b border-slate-100" : ""}`}>
      {/* Skill label + diff icon */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <DiffIcon diff={diff} />
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      </div>

      {/* Side-by-side: Before | After */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 pb-3">
        <div className="px-4">
          <RatingPill rating={left?.rating} />
          {left?.comment?.trim() && (
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed italic">
              "{left.comment}"
            </p>
          )}
        </div>
        <div className="px-4">
          <RatingPill rating={right?.rating} />
          {right?.comment?.trim() && (
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed italic">
              "{right.comment}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SECTION HEADER ──────────────────────────────────────

function SectionHeader({
  type,
  count,
}: {
  type: "improved" | "declined" | "nochange";
  count: number;
}) {
  const configs = {
    improved: {
      bg: "bg-green-50 border-green-100",
      icon: <TrendingUp size={11} className="text-green-600" />,
      text: "text-green-700",
      label: "Improved",
    },
    declined: {
      bg: "bg-red-50 border-red-100",
      icon: <TrendingDown size={11} className="text-red-500" />,
      text: "text-red-600",
      label: "Declined",
    },
    nochange: {
      bg: "bg-slate-50 border-slate-100",
      icon: <Minus size={11} className="text-slate-400" />,
      text: "text-slate-500",
      label: "No Change",
    },
  };
  const cfg = configs[type];
  return (
    <div className={`flex items-center gap-2 px-4 py-2 border-y ${cfg.bg}`}>
      {cfg.icon}
      <span
        className={`text-[10px] font-bold uppercase tracking-wider ${cfg.text}`}
      >
        {cfg.label} — {count} skill{count !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────

type Props = {
  playerPublicId: string;
  assessments: PlayerAssessmentResponse[];
};

export default function PlayerAssessmentComparison({
  playerPublicId,
  assessments,
}: Props) {
  const [leftId, setLeftId] = useState(assessments[1]?.publicId || "");
  const [rightId, setRightId] = useState(assessments[0]?.publicId || "");
  const [leftData, setLeftData] = useState<PlayerAssessmentResponse | null>(
    null,
  );
  const [rightData, setRightData] = useState<PlayerAssessmentResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("cricket");

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
    } catch {
      toast.error("Failed to load assessments");
    } finally {
      setLoading(false);
    }
  };

  const getRows = (tab: string) => {
    if (!leftData || !rightData) return [];
    const keyMap: Record<string, string> = {
      cricket: "cricketSkills",
      fitness: "fitness",
      diet: "diet",
      mental: "mental",
    };
    const ls = extractSkills((leftData as any)[keyMap[tab]], tab);
    const rs = extractSkills((rightData as any)[keyMap[tab]], tab);
    const allKeys = new Map<string, string>();
    ls.forEach((s) => allKeys.set(s.key, s.label));
    rs.forEach((s) => allKeys.set(s.key, s.label));
    const lm = new Map(ls.map((s) => [s.key, s.entry]));
    const rm = new Map(rs.map((s) => [s.key, s.entry]));
    return Array.from(allKeys.entries()).map(([key, label]) => {
      const l = lm.get(key);
      const r = rm.get(key);
      return {
        key,
        label,
        left: l,
        right: r,
        diff:
          (RATING_ORDER[r?.rating || ""] || 0) -
          (RATING_ORDER[l?.rating || ""] || 0),
      };
    });
  };

  const rows = getRows(activeTab);
  const improved = rows.filter((r) => r.diff > 0);
  const declined = rows.filter((r) => r.diff < 0);
  const noChange = rows.filter((r) => r.diff === 0);
  const total = rows.length;

  const lCfg = leftData?.overallRating
    ? OVERALL_CONFIG[leftData.overallRating]
    : null;
  const rCfg = rightData?.overallRating
    ? OVERALL_CONFIG[rightData.overallRating]
    : null;

  return (
    <div className="space-y-4">
      {/* ── SELECTOR ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-base font-bold text-slate-800 mb-4">
          📊 Compare Assessments
        </h2>
        <div className="grid grid-cols-[1fr_36px_1fr] items-end gap-2">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Earlier
            </p>
            <select
              value={leftId}
              onChange={(e) => setLeftId(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            >
              {assessments.map((a) => (
                <option key={a.publicId} value={a.publicId}>
                  {formatDate(a.assessmentDate)} ·{" "}
                  {a.assessmentType.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-center pb-1">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <ArrowRight size={15} className="text-slate-400" />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Later
            </p>
            <select
              value={rightId}
              onChange={(e) => setRightId(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            >
              {assessments.map((a) => (
                <option key={a.publicId} value={a.publicId}>
                  {formatDate(a.assessmentDate)} ·{" "}
                  {a.assessmentType.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {!loading && leftData && rightData && (
        <>
          {/* ── OVERALL RATING CARDS ─────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { data: leftData, label: "Earlier", cfg: lCfg },
              { data: rightData, label: "Later", cfg: rCfg },
            ].map(({ data, label, cfg }) => (
              <div
                key={label}
                className={`rounded-xl border-2 p-4 text-center ${cfg ? cfg.card : "bg-slate-50 border-slate-200"}`}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  {label}
                </p>
                <p className="text-xs text-slate-500 mb-2">
                  {formatDate(data.assessmentDate)}
                </p>
                <p
                  className={`text-xl font-black ${cfg ? cfg.text : "text-slate-400"}`}
                >
                  {data.overallRating
                    ? getRatingLabel(data.overallRating)?.toUpperCase()
                    : "NOT RATED"}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {data.assessmentType.replace(/_/g, " ")}
                </p>
              </div>
            ))}
          </div>

          {/* ── PROGRESS BAR ─────────────────────────── */}
          {total > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                {total} skills compared
              </p>
              <div className="flex rounded-full overflow-hidden h-2 mb-3 bg-slate-100">
                {improved.length > 0 && (
                  <div
                    className="bg-green-500 h-full"
                    style={{ width: `${(improved.length / total) * 100}%` }}
                  />
                )}
                {noChange.length > 0 && (
                  <div
                    className="bg-slate-300 h-full"
                    style={{ width: `${(noChange.length / total) * 100}%` }}
                  />
                )}
                {declined.length > 0 && (
                  <div
                    className="bg-red-400 h-full"
                    style={{ width: `${(declined.length / total) * 100}%` }}
                  />
                )}
              </div>
              <div className="flex gap-4">
                {[
                  {
                    color: "bg-green-500",
                    textColor: "text-green-600",
                    count: improved.length,
                    label: "Improved",
                  },
                  {
                    color: "bg-slate-300",
                    textColor: "text-slate-500",
                    count: noChange.length,
                    label: "Same",
                  },
                  {
                    color: "bg-red-400",
                    textColor: "text-red-500",
                    count: declined.length,
                    label: "Declined",
                  },
                ].map(({ color, textColor, count, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className={`text-sm font-bold ${textColor}`}>
                      {count}
                    </span>
                    <span className="text-xs text-slate-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TABS ─────────────────────────────────── */}
          <div className="flex gap-1 bg-white rounded-xl border border-slate-200 shadow-sm p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ── COMPARISON TABLE ─────────────────────── */}
          {rows.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <p className="text-slate-400 text-sm">
                No rated skills in this category yet.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Sticky date columns header */}
              <div className="grid grid-cols-2 divide-x divide-slate-200 bg-slate-50 border-b-2 border-slate-200">
                <div className="px-4 py-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Before
                  </p>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">
                    {formatDate(leftData.assessmentDate)}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    After
                  </p>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">
                    {formatDate(rightData.assessmentDate)}
                  </p>
                </div>
              </div>

              {improved.length > 0 && (
                <>
                  <SectionHeader type="improved" count={improved.length} />
                  {improved.map((row, i) => (
                    <SkillRow
                      key={row.key}
                      {...row}
                      isLast={i === improved.length - 1}
                    />
                  ))}
                </>
              )}
              {declined.length > 0 && (
                <>
                  <SectionHeader type="declined" count={declined.length} />
                  {declined.map((row, i) => (
                    <SkillRow
                      key={row.key}
                      {...row}
                      isLast={i === declined.length - 1}
                    />
                  ))}
                </>
              )}
              {noChange.length > 0 && (
                <>
                  <SectionHeader type="nochange" count={noChange.length} />
                  {noChange.map((row, i) => (
                    <SkillRow
                      key={row.key}
                      {...row}
                      isLast={i === noChange.length - 1}
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── COACH NOTES SIDE BY SIDE ─────────────── */}
          {(leftData.overallSummary || rightData.overallSummary) && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Coach Notes Comparison
                </p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                {[
                  { data: leftData, label: "Before" },
                  { data: rightData, label: "After" },
                ].map(({ data, label }) => (
                  <div key={label} className="p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      {label} · {formatDate(data.assessmentDate)}
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {data.overallSummary || (
                        <span className="text-slate-300 italic">No notes</span>
                      )}
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
