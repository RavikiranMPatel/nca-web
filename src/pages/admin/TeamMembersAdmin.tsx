import { useState, useEffect, useRef, useCallback } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  X,
  Users,
  GripVertical,
  Loader2,
} from "lucide-react";
import { getImageUrl } from "../../utils/imageUrl";

// ── Types ─────────────────────────────────────────────────────────────────────

type TeamMember = {
  id: string;
  publicId: string;
  name: string;
  role: string;
  bio: string;
  photoUrl: string;
  displayOrder: number;
  active: boolean;
};

type FormState = {
  name: string;
  role: string;
  bio: string;
  photoUrl: string;
  displayOrder: number;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  role: "",
  bio: "",
  photoUrl: "",
  displayOrder: 0,
  active: true,
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function TeamMembersAdmin() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPublicId, setEditingPublicId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Cropper states
  const [showCropper, setShowCropper] = useState(false);
  const [tempPhotoUrl, setTempPhotoUrl] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = async () => {
    try {
      const res = await api.get("/admin/cms/team");
      setMembers(res.data);
    } catch {
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ── Form helpers ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingPublicId(null);
    setForm({ ...EMPTY_FORM, displayOrder: members.length + 1 });
    setShowForm(true);
  };

  const openEdit = (m: TeamMember) => {
    setEditingPublicId(m.publicId);
    setForm({
      name: m.name,
      role: m.role,
      bio: m.bio || "",
      photoUrl: m.photoUrl || "",
      displayOrder: m.displayOrder,
      active: m.active,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPublicId(null);
    setForm(EMPTY_FORM);
  };

  const set =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  // ── Photo select → open cropper ───────────────────────────────────────────
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setTempPhotoUrl(reader.result as string);
      setShowCropper(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // ── Apply crop → upload ───────────────────────────────────────────────────
  const applyCrop = async () => {
    if (!croppedAreaPixels || !tempPhotoUrl) return;

    const image = new Image();
    image.src = tempPhotoUrl;
    await new Promise((res) => (image.onload = res));

    const canvas = document.createElement("canvas");
    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;
    canvas
      .getContext("2d")!
      .drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
      );

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const fd = new FormData();
        fd.append(
          "file",
          new File([blob], "photo.jpg", { type: "image/jpeg" }),
        );
        setUploading(true);
        try {
          const res = await api.post("/admin/cms/upload-image", fd);
          setForm((f) => ({ ...f, photoUrl: res.data.url }));
          toast.success("Photo uploaded");
        } catch {
          toast.error("Upload failed");
        } finally {
          setUploading(false);
          setShowCropper(false);
          setTempPhotoUrl("");
        }
      },
      "image/jpeg",
      0.95,
    );
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.role.trim()) {
      toast.error("Name and role are required");
      return;
    }
    setSaving(true);
    try {
      if (editingPublicId) {
        await api.put(`/admin/cms/team/${editingPublicId}`, form);
        toast.success("Member updated");
      } else {
        await api.post("/admin/cms/team", form);
        toast.success("Member added");
      }
      closeForm();
      load();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────
  const handleToggle = async (publicId: string) => {
    try {
      await api.patch(`/admin/cms/team/${publicId}/toggle`);
      load();
    } catch {
      toast.error("Failed to update");
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (publicId: string) => {
    try {
      await api.delete(`/admin/cms/team/${publicId}`);
      toast.success("Member deleted");
      setDeleteConfirm(null);
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users size={20} className="text-blue-600" />
            Team Members
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage coaches and staff shown on your website
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          Add Member
        </button>
      </div>

      {/* Empty state */}
      {members.length === 0 && !showForm && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No team members yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Add your coaches and staff to showcase on the website
          </p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Add First Member
          </button>
        </div>
      )}

      {/* Member cards */}
      {members.length > 0 && (
        <div className="space-y-3 mb-6">
          {members.map((m) => (
            <div
              key={m.publicId}
              className={`flex items-center gap-4 bg-white border rounded-xl p-4 transition ${
                m.active ? "border-gray-200" : "border-gray-100 opacity-60"
              }`}
            >
              <GripVertical
                size={16}
                className="text-gray-300 shrink-0 cursor-grab"
              />

              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 shrink-0">
                {m.photoUrl ? (
                  <img
                    src={getImageUrl(m.photoUrl) || ""}
                    alt={m.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-semibold text-lg">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800 truncate">
                    {m.name}
                  </p>
                  {!m.active && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="text-sm text-blue-600 font-medium">{m.role}</p>
                {m.bio && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {m.bio}
                  </p>
                )}
              </div>

              <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-1 rounded font-mono shrink-0">
                #{m.displayOrder}
              </span>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleToggle(m.publicId)}
                  title={m.active ? "Hide from website" : "Show on website"}
                  className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                >
                  {m.active ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button
                  onClick={() => openEdit(m)}
                  className="p-2 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(m.publicId)}
                  className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add/Edit Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingPublicId ? "Edit Member" : "Add Team Member"}
              </h3>
              <button
                onClick={closeForm}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Photo upload */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 shrink-0 border-2 border-dashed border-gray-200">
                  {form.photoUrl ? (
                    <img
                      src={getImageUrl(form.photoUrl) || ""}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Users size={28} />
                    </div>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    {uploading ? "Uploading..." : "Upload Photo"}
                  </button>
                  <p className="text-xs text-gray-400 mt-1">
                    JPG, PNG — max 5MB
                  </p>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Rahul Sharma"
                  value={form.name}
                  onChange={set("name")}
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Head Coach, Batting Coach, Fielding Coach"
                  value={form.role}
                  onChange={set("role")}
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="Short description about this team member..."
                  value={form.bio}
                  onChange={set("bio")}
                />
              </div>

              {/* Display Order + Active */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.displayOrder}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        displayOrder: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, active: e.target.checked }))
                      }
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Visible on website
                    </span>
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-[2] bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : editingPublicId ? (
                    "Update Member"
                  ) : (
                    "Add Member"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Delete Member?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently remove the team member from your website.
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cropper Modal ── */}
      {showCropper && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-800">Crop Photo</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Drag to reposition, scroll to zoom
              </p>
            </div>
            <div className="relative h-72 bg-gray-900">
              <Cropper
                image={tempPhotoUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="p-4 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500 font-medium">
                    Zoom
                  </span>
                  <span className="text-xs text-gray-400">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCropper(false);
                    setTempPhotoUrl("");
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={applyCrop}
                  disabled={uploading}
                  className="flex-[2] bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Apply & Upload"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div> // ← root div closes here
  );
}
