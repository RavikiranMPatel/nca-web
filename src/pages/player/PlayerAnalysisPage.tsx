import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Plus,
  ClipboardList,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { playerAssessmentService } from "../../api/playerService/playerAssessmentService.ts";
import type { PlayerAssessmentResponse } from "../../api/playerService/playerAssessmentService.ts";
import PlayerAssessmentForm from "../../components/player/PlayerAssessmentForm";
import PlayerAssessmentComparison from "../../components/player/PlayerAssessmentComparison";

// ─── CONSTANTS ───────────────────────────────────────────

const RATING_STYLES: Record<string, { bg: string; text: string; dot: string }> =
  {
    NEEDS_WORK: { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-500" },
    DEVELOPING: {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      dot: "bg-yellow-500",
    },
    GOOD: { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" },
    EXCELLENT: { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" },
  };

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  MONTHLY: { bg: "bg-blue-50", text: "text-blue-700" },
  WEEKLY: { bg: "bg-purple-50", text: "text-purple-700" },
  FOLLOW_UP: { bg: "bg-green-50", text: "text-green-700" },
  CUSTOM: { bg: "bg-slate-100", text: "text-slate-700" },
};

const ROLE_LABELS: Record<string, string> = {
  BATSMEN: "🏏 Batsmen",
  BOWLER: "🎯 Bowler",
  ALL_ROUNDER: "⚡ All Rounder",
  WICKET_KEEPER: "🧤 Wicket Keeper",
};

function formatRating(rating: string | undefined): string {
  if (!rating) return "";
  return rating.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── VIEWS ───────────────────────────────────────────────
type View =
  | { type: "timeline" }
  | { type: "new" }
  | { type: "edit"; assessmentPublicId: string }
  | { type: "followup" }
  | { type: "compare" };

// ─── MAIN PAGE ───────────────────────────────────────────

function PlayerAnalysisPage() {
  const { playerPublicId } = useParams<{ playerPublicId: string }>();
  const [view, setView] = useState<View>({ type: "timeline" });
  const [assessments, setAssessments] = useState<PlayerAssessmentResponse[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const role = localStorage.getItem("userRole");
  const isSuperAdmin = role === "ROLE_SUPER_ADMIN";

  useEffect(() => {
    if (playerPublicId) loadAssessments();
  }, [playerPublicId]);

  const loadAssessments = async () => {
    if (!playerPublicId) return;
    setLoading(true);
    try {
      const data = await playerAssessmentService.getAll(playerPublicId);
      setAssessments(data);
    } catch (error) {
      console.error("Failed to load assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (publicId: string) => {
    if (!playerPublicId) return;
    if (!confirm("Are you sure you want to delete this assessment?")) return;

    try {
      await playerAssessmentService.delete(playerPublicId, publicId);
      toast.success("Assessment deleted");
      loadAssessments();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete");
    }
  };

  const handleFormSuccess = () => {
    setView({ type: "timeline" });
    loadAssessments();
  };

  if (!playerPublicId) return null;

  // ─── RENDER SUB-VIEWS ─────────────────────────────────

  if (view.type === "new") {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setView({ type: "timeline" })}
          className="flex items-center gap-2 text-blue-600 font-medium text-sm hover:text-blue-700"
        >
          <ArrowLeft size={16} /> Back to Timeline
        </button>
        <PlayerAssessmentForm
          playerPublicId={playerPublicId}
          onSuccess={handleFormSuccess}
          onCancel={() => setView({ type: "timeline" })}
        />
      </div>
    );
  }

  if (view.type === "edit") {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setView({ type: "timeline" })}
          className="flex items-center gap-2 text-blue-600 font-medium text-sm hover:text-blue-700"
        >
          <ArrowLeft size={16} /> Back to Timeline
        </button>
        <PlayerAssessmentForm
          playerPublicId={playerPublicId}
          assessmentPublicId={view.assessmentPublicId}
          onSuccess={handleFormSuccess}
          onCancel={() => setView({ type: "timeline" })}
        />
      </div>
    );
  }

  if (view.type === "followup") {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setView({ type: "timeline" })}
          className="flex items-center gap-2 text-blue-600 font-medium text-sm hover:text-blue-700"
        >
          <ArrowLeft size={16} /> Back to Timeline
        </button>
        <PlayerAssessmentForm
          playerPublicId={playerPublicId}
          isFollowUp
          onSuccess={handleFormSuccess}
          onCancel={() => setView({ type: "timeline" })}
        />
      </div>
    );
  }

  if (view.type === "compare") {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setView({ type: "timeline" })}
          className="flex items-center gap-2 text-blue-600 font-medium text-sm hover:text-blue-700"
        >
          <ArrowLeft size={16} /> Back to Timeline
        </button>
        <PlayerAssessmentComparison
          playerPublicId={playerPublicId}
          assessments={assessments.filter((a) => a.status === "COMPLETED")}
        />
      </div>
    );
  }

  // ─── TIMELINE VIEW ────────────────────────────────────

  const completed = assessments.filter((a) => a.status === "COMPLETED");
  const drafts = assessments.filter((a) => a.status === "DRAFT");

  // Mini progress data
  const ratingToNum: Record<string, number> = {
    NEEDS_WORK: 1,
    DEVELOPING: 2,
    GOOD: 3,
    EXCELLENT: 4,
  };
  const progressData = completed
    .filter((a) => a.overallRating)
    .slice(0, 8)
    .reverse();

  return (
    <div className="space-y-6">
      {/* ─── HEADER & ACTIONS ─────────────────────────── */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Performance Analysis
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {assessments.length} assessment
              {assessments.length !== 1 ? "s" : ""} recorded
              {drafts.length > 0 && (
                <span className="ml-2 text-yellow-600 font-medium">
                  ({drafts.length} draft{drafts.length !== 1 ? "s" : ""})
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setView({ type: "new" })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-all shadow-sm"
            >
              <Plus size={16} /> New Assessment
            </button>

            {completed.length > 0 && (
              <button
                onClick={() => setView({ type: "followup" })}
                className="flex items-center gap-2 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-medium text-sm hover:bg-blue-50 transition-all"
              >
                <ClipboardList size={16} /> Quick Follow-up
              </button>
            )}

            {completed.length >= 2 && (
              <button
                onClick={() => setView({ type: "compare" })}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-50 transition-all"
              >
                <BarChart3 size={16} /> Compare
              </button>
            )}
          </div>
        </div>

        {/* ─── MINI PROGRESS CHART ────────────────────── */}
        {progressData.length > 1 && (
          <div className="mt-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5">
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-3">
              Progress Trend
            </p>
            <div className="flex items-end gap-1" style={{ height: 64 }}>
              {progressData.map((a, i) => {
                const val = ratingToNum[a.overallRating || ""] || 0;
                return (
                  <div
                    key={a.publicId}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full max-w-[36px] rounded-t-md transition-all"
                      style={{
                        height: val * 14,
                        backgroundColor: `rgba(255,255,255,${0.2 + val * 0.15})`,
                      }}
                    />
                    <span className="text-[9px] text-blue-200">
                      {a.assessmentDate?.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-[9px] text-blue-300">
              <span>Needs Work</span>
              <span>Excellent</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── LOADING ──────────────────────────────────── */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 mt-3">Loading assessments...</p>
        </div>
      )}

      {/* ─── EMPTY STATE ──────────────────────────────── */}
      {!loading && assessments.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            No Assessments Yet
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            Create the first assessment to start tracking this player's
            progress.
          </p>
          <button
            onClick={() => setView({ type: "new" })}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-sm"
          >
            <Plus size={18} /> Create First Assessment
          </button>
        </div>
      )}

      {/* ─── ASSESSMENT TIMELINE ──────────────────────── */}
      {!loading && assessments.length > 0 && (
        <div className="space-y-0">
          {assessments.map((assessment, idx) => {
            const isDraft = assessment.status === "DRAFT";
            const rs = assessment.overallRating
              ? RATING_STYLES[assessment.overallRating]
              : null;
            const ts =
              TYPE_STYLES[assessment.assessmentType] || TYPE_STYLES.CUSTOM;
            const isExpanded = expandedId === assessment.publicId;

            return (
              <div key={assessment.publicId} className="flex gap-3 md:gap-4">
                {/* Timeline connector */}
                <div className="flex flex-col items-center w-5 flex-shrink-0">
                  <div
                    className={`w-3 h-3 rounded-full border-2 border-white shadow flex-shrink-0 z-10 ${
                      isDraft ? "bg-yellow-500" : rs ? rs.dot : "bg-slate-300"
                    }`}
                  />
                  {idx < assessments.length - 1 && (
                    <div className="w-0.5 flex-1 bg-slate-200 min-h-[40px]" />
                  )}
                </div>

                {/* Card */}
                <div
                  className={`flex-1 mb-3 rounded-lg border transition-all ${
                    isDraft
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-white border-slate-200 shadow-sm"
                  }`}
                >
                  {/* Card Header */}
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : assessment.publicId)
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">
                            {formatDate(assessment.assessmentDate)}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                              isDraft
                                ? "bg-yellow-200 text-yellow-800"
                                : `${ts.bg} ${ts.text}`
                            }`}
                          >
                            {isDraft
                              ? "DRAFT"
                              : assessment.assessmentType.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-slate-500">
                            {ROLE_LABELS[assessment.playerRole] ||
                              assessment.playerRole}
                          </span>
                        </div>
                        {assessment.createdBy && (
                          <p className="text-xs text-slate-400 mt-1">
                            by {assessment.createdBy}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {rs && (
                          <span
                            className={`text-[11px] font-semibold px-3 py-1 rounded-lg ${rs.bg} ${rs.text}`}
                          >
                            {formatRating(assessment.overallRating)}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={16} className="text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                      {assessment.overallSummary && (
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {assessment.overallSummary}
                        </p>
                      )}

                      {assessment.ageGroup && (
                        <div className="text-xs text-slate-500">
                          Age Group:{" "}
                          <span className="font-medium text-slate-700">
                            {assessment.ageGroup}
                          </span>
                        </div>
                      )}

                      {assessment.parentAssessmentPublicId && (
                        <div className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-md inline-block">
                          📋 Follow-up of previous assessment
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setView({
                              type: "edit",
                              assessmentPublicId: assessment.publicId,
                            });
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all"
                        >
                          <Pencil size={13} />
                          {isDraft ? "Continue Editing" : "Edit"}
                        </button>

                        {isSuperAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(assessment.publicId);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PlayerAnalysisPage;
