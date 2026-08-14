import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Plus, ChevronDown, ChevronUp, Pencil, FileText, X } from "lucide-react";
import {
  injuryService,
  INJURY_LOCATIONS,
  INJURY_STATUSES,
  REHAB_COMPLIANCE_OPTIONS,
} from "../../api/playerService/injuryService.ts";
import type { PlayerInjuryResponse, PlayerInjuryRequest, MedicalStaffOption } from "../../api/playerService/injuryService.ts";

const BODY_PARTS = [
  "Knee", "Shoulder", "Hamstring", "Lower Back", "Ankle", "Elbow", "Wrist",
  "Hip", "Quadricep", "Calf", "Groin", "Finger", "Neck", "Rib", "Other",
];

const STATUS_OPTIONS = ["UNDER_REHAB", "RECOVERING", "RECOVERED"];
const LOCATION_OPTIONS = Object.keys(INJURY_LOCATIONS);

function StatusPill({ status }: { status: string }) {
  const s = INJURY_STATUSES[status] || { label: status, color: "text-slate-700", bg: "bg-slate-100" };
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>;
}

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const emptyForm = (): PlayerInjuryRequest => ({
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
  medicalStaffId: "",
  physioSessionsCount: undefined,
  rehabCompliance: "",
});

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
  const [form, setForm] = useState<PlayerInjuryRequest>(() => {
    if (editRecord) {
      return {
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
        medicalStaffId: editRecord.medicalStaffId || "",
        physioSessionsCount: editRecord.physioSessionsCount,
        rehabCompliance: editRecord.rehabCompliance || "",
      };
    }
    return emptyForm();
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [staffOptions, setStaffOptions] = useState<MedicalStaffOption[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    injuryService.listMedicalStaff().then(setStaffOptions).catch(() => {});
  }, []);

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
        medicalStaffId: form.medicalStaffId || undefined,
        rehabCompliance: form.rehabCompliance || undefined,
      };
      if (editRecord) {
        await injuryService.update(playerPublicId, editRecord.publicId, clean);
        toast.success("Injury record updated");
      } else {
        await injuryService.create(playerPublicId, clean);
        toast.success("Injury record created");
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
        {/* Body part */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Body Part <span className="text-red-500">*</span></label>
          <select value={form.bodyPart} onChange={(e) => set("bodyPart", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select…</option>
            {BODY_PARTS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Injury type */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Injury Type</label>
          <input value={form.injuryType || ""} onChange={(e) => set("injuryType", e.target.value)}
            placeholder="e.g. Sprain, Fracture, Tear"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Where it happened</label>
          <select value={form.location || ""} onChange={(e) => set("location", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select…</option>
            {LOCATION_OPTIONS.map((l) => <option key={l} value={l}>{INJURY_LOCATIONS[l]}</option>)}
          </select>
        </div>

        {/* Activity */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Activity</label>
          <input value={form.activity || ""} onChange={(e) => set("activity", e.target.value)}
            placeholder="e.g. Batting, Fielding drill"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* Injury date */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Injury Date <span className="text-red-500">*</span></label>
          <input type="date" value={form.injuryDate} onChange={(e) => set("injuryDate", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
          <select value={form.status || "UNDER_REHAB"} onChange={(e) => set("status", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{INJURY_STATUSES[s]?.label || s}</option>)}
          </select>
        </div>

        {/* Expected recovery */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Expected Recovery Date</label>
          <input type="date" value={form.expectedRecoveryDate || ""} onChange={(e) => set("expectedRecoveryDate", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* Actual recovery */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Actual Recovery Date</label>
          <input type="date" value={form.actualRecoveryDate || ""} onChange={(e) => set("actualRecoveryDate", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Medical staff selector */}
      {staffOptions.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Assigned Medical Staff</label>
          <select value={form.medicalStaffId || ""} onChange={(e) => set("medicalStaffId", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">None (ad-hoc)</option>
            {staffOptions.map((s) => (
              <option key={s.publicId} value={s.publicId}>{s.name} — {s.role}</option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-0.5">Selecting a staff member marks this as doctor/physio treated.</p>
        </div>
      )}

      {/* Doctor treated (shown only when no roster staff selected) */}
      {!form.medicalStaffId && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.doctorTreated || false} onChange={(e) => set("doctorTreated", e.target.checked)}
            className="accent-blue-600 w-4 h-4" />
          <span className="text-slate-700">Doctor treated</span>
        </label>
      )}

      {/* Rehab tracking */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Physio Sessions (count)</label>
          <input type="number" min={0} value={form.physioSessionsCount ?? ""}
            onChange={(e) => set("physioSessionsCount", e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="0"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Rehab Compliance</label>
          <select value={form.rehabCompliance || ""} onChange={(e) => set("rehabCompliance", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Not set</option>
            {REHAB_COMPLIANCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
        <textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)}
          rows={2} placeholder="Recovery plan, doctor observations..."
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
      </div>

      {/* Doctor report upload (only for existing records) */}
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

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Saving…" : editRecord ? "Update" : "Save Injury"}
        </button>
      </div>
    </div>
  );
}

function PlayerInjuriesPage() {
  const { playerPublicId } = useParams<{ playerPublicId: string }>();
  const [injuries, setInjuries] = useState<PlayerInjuryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<PlayerInjuryResponse | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (playerPublicId) load();
  }, [playerPublicId]);

  const load = async () => {
    if (!playerPublicId) return;
    setLoading(true);
    try {
      setInjuries(await injuryService.list(playerPublicId));
    } catch {
      toast.error("Failed to load injuries");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEditRecord(undefined);
    load();
  };

  if (!playerPublicId) return null;

  if (showForm || editRecord) {
    return (
      <div className="space-y-4">
        <button onClick={() => { setShowForm(false); setEditRecord(undefined); }}
          className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-700">
          <X size={14} /> Cancel
        </button>
        <InjuryForm
          playerPublicId={playerPublicId}
          editRecord={editRecord}
          onSuccess={handleSuccess}
          onCancel={() => { setShowForm(false); setEditRecord(undefined); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-slate-900">Injury History</h2>
            <p className="text-xs text-slate-500 mt-0.5">{injuries.length} record{injuries.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm">
            <Plus size={15} /> Add Injury
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-10">
          <div className="inline-block w-7 h-7 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && injuries.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <div className="text-4xl mb-3">🩹</div>
          <h3 className="font-semibold text-slate-700 mb-1">No Injuries Recorded</h3>
          <p className="text-sm text-slate-500 mb-4">Track injuries, recovery progress, and doctor reports here.</p>
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
            Record First Injury
          </button>
        </div>
      )}

      {/* List */}
      {!loading && injuries.length > 0 && (
        <div className="space-y-2">
          {injuries.map((inj) => {
            const s = INJURY_STATUSES[inj.status] || { label: inj.status, color: "text-slate-700", bg: "bg-slate-100" };
            const isExpanded = expandedId === inj.publicId;
            return (
              <div key={inj.publicId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-3 cursor-pointer flex items-start justify-between gap-2"
                  onClick={() => setExpandedId(isExpanded ? null : inj.publicId)}>
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
                  <div className="flex items-center gap-1 flex-shrink-0">
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
                      <button onClick={() => setEditRecord(inj)}
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
    </div>
  );
}

export default PlayerInjuriesPage;
