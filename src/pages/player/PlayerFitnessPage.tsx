import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Plus, BarChart3, ClipboardList, ArrowLeft, ChevronDown, ChevronUp, Pencil, FileText, X, Trash2 } from "lucide-react";
import { playerAssessmentService } from "../../api/playerService/playerAssessmentService.ts";
import type { PlayerAssessmentResponse } from "../../api/playerService/playerAssessmentService.ts";
import {
  injuryService,
  INJURY_LOCATIONS,
  INJURY_STATUSES,
} from "../../api/playerService/injuryService.ts";
import type { PlayerInjuryResponse, PlayerInjuryRequest } from "../../api/playerService/injuryService.ts";
import PlayerAssessmentForm from "../../components/player/PlayerAssessmentForm";
import PlayerAssessmentComparison from "../../components/player/PlayerAssessmentComparison";

// ─── INJURY FORM (inline, not shared from PlayerInjuriesPage) ────────────────

const BODY_PARTS = [
  "Knee", "Shoulder", "Hamstring", "Lower Back", "Ankle", "Elbow", "Wrist",
  "Hip", "Quadricep", "Calf", "Groin", "Finger", "Neck", "Rib", "Other",
];
const STATUS_OPTIONS = ["UNDER_REHAB", "RECOVERING", "RECOVERED"];
const LOCATION_OPTIONS = Object.keys(INJURY_LOCATIONS);

function emptyInjuryForm(): PlayerInjuryRequest {
  return {
    bodyPart: "",
    injuryType: "",
    location: "",
    activity: "",
    injuryDate: new Date().toISOString().split("T")[0],
    doctorTreated: false,
    expectedRecoveryDate: "",
    actualRecoveryDate: "",
    status: "UNDER_REHAB",
    notes: "",
  };
}

function InjuryForm({
  playerPublicId,
  editRecord,
  onSuccess,
  onCancel,
}: {
  playerPublicId: string;
  editRecord?: PlayerInjuryResponse;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<PlayerInjuryRequest>(() =>
    editRecord
      ? {
          bodyPart: editRecord.bodyPart,
          injuryType: editRecord.injuryType || "",
          location: editRecord.location || "",
          activity: editRecord.activity || "",
          injuryDate: editRecord.injuryDate,
          doctorTreated: editRecord.doctorTreated,
          expectedRecoveryDate: editRecord.expectedRecoveryDate || "",
          actualRecoveryDate: editRecord.actualRecoveryDate || "",
          status: editRecord.status,
          notes: editRecord.notes || "",
        }
      : emptyInjuryForm()
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof PlayerInjuryRequest, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.bodyPart || !form.injuryDate) {
      toast.error("Body part and injury date are required");
      return;
    }
    setSaving(true);
    try {
      const clean: PlayerInjuryRequest = {
        ...form,
        injuryType: form.injuryType || undefined,
        location: form.location || undefined,
        activity: form.activity || undefined,
        expectedRecoveryDate: form.expectedRecoveryDate || undefined,
        actualRecoveryDate: form.actualRecoveryDate || undefined,
        notes: form.notes || undefined,
      };
      if (editRecord) {
        await injuryService.update(playerPublicId, editRecord.publicId, clean);
        toast.success("Injury updated");
      } else {
        await injuryService.create(playerPublicId, clean);
        toast.success("Injury recorded");
      }
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!editRecord) return;
    setUploading(true);
    try {
      await injuryService.uploadDoctorReport(playerPublicId, editRecord.publicId, file);
      toast.success("Doctor report uploaded");
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      <h3 className="font-bold text-sm text-slate-900">{editRecord ? "Edit Injury Record" : "New Injury Record"}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Body Part <span className="text-red-500">*</span></label>
          <select value={form.bodyPart} onChange={(e) => set("bodyPart", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select…</option>
            {BODY_PARTS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Injury Type</label>
          <input value={form.injuryType || ""} onChange={(e) => set("injuryType", e.target.value)}
            placeholder="e.g. Sprain, Fracture, Tear"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Where it happened</label>
          <select value={form.location || ""} onChange={(e) => set("location", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select…</option>
            {LOCATION_OPTIONS.map((l) => <option key={l} value={l}>{INJURY_LOCATIONS[l]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Activity</label>
          <input value={form.activity || ""} onChange={(e) => set("activity", e.target.value)}
            placeholder="e.g. Batting, Fielding drill"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Injury Date <span className="text-red-500">*</span></label>
          <input type="date" value={form.injuryDate} onChange={(e) => set("injuryDate", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
          <select value={form.status || "UNDER_REHAB"} onChange={(e) => set("status", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{INJURY_STATUSES[s]?.label || s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Expected Recovery</label>
          <input type="date" value={form.expectedRecoveryDate || ""} onChange={(e) => set("expectedRecoveryDate", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Actual Recovery Date</label>
          <input type="date" value={form.actualRecoveryDate || ""} onChange={(e) => set("actualRecoveryDate", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={form.doctorTreated || false} onChange={(e) => set("doctorTreated", e.target.checked)}
          className="accent-blue-600 w-4 h-4" />
        <span className="text-slate-700">Doctor treated</span>
      </label>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
        <textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)}
          rows={2} placeholder="Recovery plan, doctor observations..."
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
      </div>

      {editRecord && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Doctor Report (PDF or image)</label>
          {editRecord.doctorReportUrl && (
            <a href={editRecord.doctorReportUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-2">
              <FileText size={12} /> View current report
            </a>
          )}
          <input type="file" ref={fileRef} accept="image/*,application/pdf" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <FileText size={13} /> {uploading ? "Uploading…" : "Upload Report"}
          </button>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">Cancel</button>
        <button onClick={handleSubmit} disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Saving…" : editRecord ? "Update" : "Save Injury"}
        </button>
      </div>
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function mode(arr: string[]): string | null {
  if (!arr.length) return null;
  const freq: Record<string, number> = {};
  arr.forEach((v) => { freq[v] = (freq[v] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

// ─── COMPUTED INJURY STATS ────────────────────────────────────────────────────

function InjuryStatsBar({ injuries }: { injuries: PlayerInjuryResponse[] }) {
  const active = injuries.filter((i) => i.status !== "RECOVERED");
  const recovered = injuries.filter(
    (i) => i.status === "RECOVERED" && i.actualRecoveryDate && i.injuryDate,
  );
  const avgRecovery =
    recovered.length > 0
      ? Math.round(
          recovered.reduce((sum, i) => sum + daysBetween(i.injuryDate, i.actualRecoveryDate!), 0) /
            recovered.length,
        )
      : null;
  const topPart = mode(injuries.map((i) => i.bodyPart));

  const cards = [
    { label: "Total Injuries", value: injuries.length, color: "text-slate-900", bg: "bg-white" },
    { label: "Active", value: active.length, color: "text-red-600", bg: "bg-red-50" },
    { label: "Recovered", value: injuries.length - active.length, color: "text-green-700", bg: "bg-green-50" },
    {
      label: "Avg Recovery",
      value: avgRecovery != null ? `${avgRecovery}d` : "—",
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      label: "Most Affected",
      value: topPart || "—",
      color: "text-orange-700",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {cards.map((c) => (
        <div key={c.label} className={`${c.bg} rounded-xl border border-slate-200 p-3 shadow-sm`}>
          <p className="text-[10px] font-medium text-slate-500 mb-1">{c.label}</p>
          <p className={`text-lg font-bold truncate ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── ASSESSMENT RATING DISPLAY ────────────────────────────────────────────────

const RATING_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  NEEDS_WORK: { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-500" },
  DEVELOPING: { bg: "bg-yellow-100", text: "text-yellow-800", dot: "bg-yellow-500" },
  GOOD: { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" },
  EXCELLENT: { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" },
};

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  MONTHLY: { bg: "bg-blue-50", text: "text-blue-700" },
  WEEKLY: { bg: "bg-purple-50", text: "text-purple-700" },
  FOLLOW_UP: { bg: "bg-green-50", text: "text-green-700" },
  CUSTOM: { bg: "bg-slate-100", text: "text-slate-700" },
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

type View =
  | { type: "overview" }
  | { type: "new-assessment" }
  | { type: "edit-assessment"; publicId: string }
  | { type: "followup" }
  | { type: "compare" }
  | { type: "new-injury" }
  | { type: "edit-injury"; record: PlayerInjuryResponse };

function PlayerFitnessPage() {
  const { playerPublicId } = useParams<{ playerPublicId: string }>();
  const [view, setView] = useState<View>({ type: "overview" });
  const [assessments, setAssessments] = useState<PlayerAssessmentResponse[]>([]);
  const [injuries, setInjuries] = useState<PlayerInjuryResponse[]>([]);
  const [loadingA, setLoadingA] = useState(true);
  const [loadingI, setLoadingI] = useState(true);
  const [expandedAssId, setExpandedAssId] = useState<string | null>(null);
  const [expandedInjId, setExpandedInjId] = useState<string | null>(null);

  const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
  const isSuperAdmin = role === "ROLE_SUPER_ADMIN";

  useEffect(() => {
    if (playerPublicId) {
      loadAssessments();
      loadInjuries();
    }
  }, [playerPublicId]);

  const loadAssessments = async () => {
    if (!playerPublicId) return;
    setLoadingA(true);
    try {
      setAssessments(await playerAssessmentService.getAll(playerPublicId));
    } catch {
      // silent — not critical
    } finally {
      setLoadingA(false);
    }
  };

  const loadInjuries = async () => {
    if (!playerPublicId) return;
    setLoadingI(true);
    try {
      setInjuries(await injuryService.list(playerPublicId));
    } catch {
      toast.error("Failed to load injuries");
    } finally {
      setLoadingI(false);
    }
  };

  const handleAssessmentSuccess = () => {
    setView({ type: "overview" });
    loadAssessments();
  };

  const handleInjurySuccess = () => {
    setView({ type: "overview" });
    loadInjuries();
  };

  if (!playerPublicId) return null;

  const completed = assessments.filter((a) => a.status === "COMPLETED");

  // ─── SUB-VIEWS ────────────────────────────────────────────────────────────

  if (view.type === "new-assessment" || view.type === "edit-assessment" || view.type === "followup") {
    return (
      <div className="space-y-4">
        <button onClick={() => setView({ type: "overview" })}
          className="flex items-center gap-2 text-blue-600 font-medium text-sm hover:text-blue-700">
          <ArrowLeft size={16} /> Back
        </button>
        <PlayerAssessmentForm
          playerPublicId={playerPublicId}
          assessmentPublicId={view.type === "edit-assessment" ? view.publicId : undefined}
          isFollowUp={view.type === "followup"}
          initialTab="fitness"
          onSuccess={handleAssessmentSuccess}
          onCancel={() => setView({ type: "overview" })}
        />
      </div>
    );
  }

  if (view.type === "compare") {
    return (
      <div className="space-y-4">
        <button onClick={() => setView({ type: "overview" })}
          className="flex items-center gap-2 text-blue-600 font-medium text-sm hover:text-blue-700">
          <ArrowLeft size={16} /> Back
        </button>
        <PlayerAssessmentComparison
          playerPublicId={playerPublicId}
          assessments={completed}
          categories={["fitness", "diet"]}
        />
      </div>
    );
  }

  if (view.type === "new-injury" || view.type === "edit-injury") {
    return (
      <div className="space-y-4">
        <button onClick={() => setView({ type: "overview" })}
          className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-700">
          <X size={14} /> Cancel
        </button>
        <InjuryForm
          playerPublicId={playerPublicId}
          editRecord={view.type === "edit-injury" ? view.record : undefined}
          onSuccess={handleInjurySuccess}
          onCancel={() => setView({ type: "overview" })}
        />
      </div>
    );
  }

  // ─── OVERVIEW ─────────────────────────────────────────────────────────────

  const loading = loadingA || loadingI;

  return (
    <div className="space-y-5 pb-6">
      {loading && (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          {/* ── INJURY & RECOVERY STATS ─────────────────────── */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide px-0.5">
              🩹 Injury & Recovery
            </h2>
            <InjuryStatsBar injuries={injuries} />

            {/* Active injuries callout */}
            {injuries.filter((i) => i.status !== "RECOVERED").length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <span className="text-red-500 text-lg flex-shrink-0">⚠️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-red-700 mb-1">Currently Active</p>
                  <div className="flex flex-wrap gap-2">
                    {injuries
                      .filter((i) => i.status !== "RECOVERED")
                      .map((i) => {
                        const s = INJURY_STATUSES[i.status] || { label: i.status, color: "text-slate-700", bg: "bg-slate-100" };
                        return (
                          <span key={i.publicId} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
                            {i.bodyPart} — {s.label}
                          </span>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* Add Injury button */}
            <div className="flex justify-end">
              <button onClick={() => setView({ type: "new-injury" })}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 shadow-sm">
                <Plus size={14} /> Record Injury
              </button>
            </div>
          </div>

          {/* ── INJURY LOG ──────────────────────────────────── */}
          {injuries.length > 0 && (
            <div className="space-y-2">
              {injuries.map((inj) => {
                const s = INJURY_STATUSES[inj.status] || { label: inj.status, color: "text-slate-700", bg: "bg-slate-100" };
                const isExpanded = expandedInjId === inj.publicId;
                return (
                  <div key={inj.publicId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-3 cursor-pointer flex items-start justify-between gap-2"
                      onClick={() => setExpandedInjId(isExpanded ? null : inj.publicId)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">{inj.bodyPart}</span>
                          {inj.injuryType && <span className="text-xs text-slate-500">— {inj.injuryType}</span>}
                          {inj.recurrenceCount > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                              {inj.recurrenceCount + 1}nd time
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
                          <span className="text-xs text-slate-400">{formatDate(inj.injuryDate)}</span>
                          {inj.location && <span className="text-xs text-slate-400">{INJURY_LOCATIONS[inj.location] || inj.location}</span>}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isExpanded ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-slate-100 px-3 py-3 space-y-2">
                        {inj.activity && <p className="text-xs text-slate-600"><span className="font-semibold">Activity:</span> {inj.activity}</p>}
                        {inj.expectedRecoveryDate && (
                          <p className="text-xs text-slate-600"><span className="font-semibold">Expected recovery:</span> {formatDate(inj.expectedRecoveryDate)}</p>
                        )}
                        {inj.actualRecoveryDate && (
                          <p className="text-xs text-slate-600"><span className="font-semibold">Recovered on:</span> {formatDate(inj.actualRecoveryDate)}</p>
                        )}
                        {inj.doctorTreated && <p className="text-xs text-green-700 font-medium">✓ Doctor treated</p>}
                        {inj.notes && <p className="text-xs text-slate-600 italic">{inj.notes}</p>}
                        {inj.doctorReportUrl && (
                          <a href={inj.doctorReportUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <FileText size={12} /> Doctor Report
                          </a>
                        )}
                        <div className="pt-1">
                          <button onClick={() => setView({ type: "edit-injury", record: inj })}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
                            <Pencil size={12} /> Edit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {injuries.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <div className="text-3xl mb-2">🩹</div>
              <p className="text-sm text-slate-500 mb-3">No injuries recorded yet</p>
              <button onClick={() => setView({ type: "new-injury" })}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700">
                Record First Injury
              </button>
            </div>
          )}

          {/* ── FITNESS ASSESSMENT ──────────────────────────── */}
          <div className="border-t border-slate-200 pt-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">💪 Fitness Assessment</h2>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setView({ type: "new-assessment" })}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm flex-shrink-0">
                  <Plus size={14} /> New Assessment
                </button>
                {completed.length > 0 && (
                  <button onClick={() => setView({ type: "followup" })}
                    className="flex items-center gap-1.5 px-3 py-2 border-2 border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 flex-shrink-0">
                    <ClipboardList size={14} /> Follow-up
                  </button>
                )}
                {completed.length >= 2 && (
                  <button onClick={() => setView({ type: "compare" })}
                    className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex-shrink-0">
                    <BarChart3 size={14} /> Compare Fitness
                  </button>
                )}
              </div>
            </div>

            {assessments.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <div className="text-3xl mb-2">📋</div>
                <p className="text-sm text-slate-500 mb-3">No assessments yet — create one to start tracking fitness.</p>
                <button onClick={() => setView({ type: "new-assessment" })}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                  Create First Assessment
                </button>
              </div>
            )}

            {/* Assessment timeline */}
            {assessments.length > 0 && (
              <div className="space-y-0">
                {assessments.map((assessment, idx) => {
                  const isDraft = assessment.status === "DRAFT";
                  const rs = assessment.overallRating ? RATING_STYLES[assessment.overallRating] : null;
                  const ts = TYPE_STYLES[assessment.assessmentType] || TYPE_STYLES.CUSTOM;
                  const isExpanded = expandedAssId === assessment.publicId;

                  return (
                    <div key={assessment.publicId} className="flex gap-3">
                      <div className="flex flex-col items-center w-5 flex-shrink-0">
                        <div className={`w-3 h-3 rounded-full border-2 border-white shadow flex-shrink-0 z-10 ${
                          isDraft ? "bg-yellow-500" : rs ? rs.dot : "bg-slate-300"
                        }`} />
                        {idx < assessments.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 min-h-[40px]" />}
                      </div>

                      <div className={`flex-1 mb-3 rounded-xl border transition-all ${
                        isDraft ? "bg-yellow-50 border-yellow-200" : "bg-white border-slate-200 shadow-sm"
                      }`}>
                        <div className="p-3 md:p-4 cursor-pointer"
                          onClick={() => setExpandedAssId(isExpanded ? null : assessment.publicId)}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-slate-900">
                                  {new Date(assessment.assessmentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                  isDraft ? "bg-yellow-200 text-yellow-800" : `${ts.bg} ${ts.text}`
                                }`}>
                                  {isDraft ? "DRAFT" : assessment.assessmentType.replace(/_/g, " ")}
                                </span>
                              </div>
                              {assessment.createdBy && (
                                <p className="text-xs text-slate-400 mt-0.5">by {assessment.createdBy}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {rs && (
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${rs.bg} ${rs.text}`}>
                                  {assessment.overallRating?.replace(/_/g, " ")}
                                </span>
                              )}
                              {isExpanded ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-3 md:px-4 pb-3 md:pb-4 border-t border-slate-100 pt-3 space-y-3">
                            {assessment.overallSummary && (
                              <p className="text-sm text-slate-600 leading-relaxed">{assessment.overallSummary}</p>
                            )}
                            <div className="flex gap-2 pt-1 flex-wrap">
                              <button onClick={(e) => { e.stopPropagation(); setView({ type: "edit-assessment", publicId: assessment.publicId }); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
                                <Pencil size={13} /> {isDraft ? "Continue Editing" : "Edit"}
                              </button>
                              {isSuperAdmin && (
                                <button onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!confirm("Delete this assessment?")) return;
                                  try {
                                    await playerAssessmentService.delete(playerPublicId, assessment.publicId);
                                    toast.success("Assessment deleted");
                                    loadAssessments();
                                  } catch {
                                    toast.error("Failed to delete");
                                  }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
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
        </>
      )}
    </div>
  );
}

export default PlayerFitnessPage;
