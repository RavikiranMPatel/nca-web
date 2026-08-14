import { useState, useEffect } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, UserCheck, UserX } from "lucide-react";

type MedicalStaff = {
  publicId: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  active: boolean;
};

type FormState = {
  name: string;
  role: string;
  phone: string;
  email: string;
  active: boolean;
};

const EMPTY_FORM: FormState = { name: "", role: "PHYSIO", phone: "", email: "", active: true };

const ROLE_LABELS: Record<string, string> = {
  DOCTOR: "Doctor",
  PHYSIO: "Physiotherapist",
  OTHER: "Other",
};

export default function MedicalStaffAdmin() {
  const [members, setMembers] = useState<MedicalStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await api.get("/admin/medical-staff");
      setMembers(res.data);
    } catch {
      toast.error("Failed to load medical staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (m: MedicalStaff) => {
    setEditingId(m.publicId);
    setForm({ name: m.name, role: m.role, phone: m.phone || "", email: m.email || "", active: m.active });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/admin/medical-staff/${editingId}`, form);
        toast.success("Updated");
      } else {
        await api.post("/admin/medical-staff", form);
        toast.success("Added");
      }
      closeForm();
      load();
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (m: MedicalStaff) => {
    try {
      await api.patch(`/admin/medical-staff/${m.publicId}/toggle`);
      load();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const remove = async (publicId: string) => {
    try {
      await api.delete(`/admin/medical-staff/${publicId}`);
      toast.success("Deleted");
      setDeleteConfirm(null);
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  if (loading) return <div className="py-6 text-center text-sm text-gray-400">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Medical Staff</h2>
          <p className="text-xs text-gray-500 mt-0.5">Doctors and physios assignable to injury records</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          <Plus size={14} />
          Add Staff
        </button>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No medical staff added yet.</p>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
          {members.map((m) => (
            <div key={m.publicId} className={`flex items-center gap-3 px-4 py-3 bg-white ${!m.active ? "opacity-50" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900 truncate">{m.name}</span>
                  <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                    {ROLE_LABELS[m.role] ?? m.role}
                  </span>
                  {!m.active && <span className="text-xs text-gray-400">Inactive</span>}
                </div>
                {(m.phone || m.email) && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {[m.phone, m.email].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggle(m)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
                  title={m.active ? "Deactivate" : "Activate"}
                >
                  {m.active ? <UserCheck size={15} /> : <UserX size={15} />}
                </button>
                <button
                  onClick={() => openEdit(m)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(m.publicId)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {editingId ? "Edit Medical Staff" : "Add Medical Staff"}
            </h3>
            <form onSubmit={save} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Dr. Ravi Kumar"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="DOCTOR">Doctor</option>
                  <option value="PHYSIO">Physiotherapist</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="doctor@example.com"
                />
              </div>
              {editingId && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                    className="rounded"
                  />
                  Active
                </label>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 border border-gray-300 text-gray-700 bg-gray-50 text-sm py-2 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete medical staff?</h3>
            <p className="text-sm text-gray-500 mb-4">
              This will remove them from the roster. Existing injury records linked to this person will retain
              the reference.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-300 text-gray-700 bg-gray-50 text-sm py-2 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => remove(deleteConfirm)}
                className="flex-1 bg-red-600 text-white text-sm py-2 rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
