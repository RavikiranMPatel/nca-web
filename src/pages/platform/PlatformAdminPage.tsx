import { useEffect, useState, useCallback } from "react";
import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// ── Types ─────────────────────────────────────────────────────────────────────

type AcademyListItem = {
  id: string;
  publicId: string;
  name: string;
  code: string;
  slug: string | null;
  city: string | null;
  active: boolean;
  createdAt: string | null;
  playerCount: number;
};

type CreateResult = {
  academyId: string;
  academyPublicId: string;
  academyName: string;
  code: string;
  slug: string;
  branchId: string;
  branchPublicId: string;
  branchName: string;
  adminPublicId: string;
  adminEmail: string;
  tempPassword: string;
};

type PlatformStats = {
  totalAcademies: number;
  activeAcademies: number;
  inactiveAcademies: number;
  totalPlayers: number;
  newAcademiesThisWeek: number;
  newAcademiesThisMonth: number;
  academies: AcademyListItem[];
};

type AuditLogEntry = {
  id: string;
  academyId: string | null;
  academyName: string;
  action: "CREATED" | "DEACTIVATED" | "REACTIVATED" | "EXPORTED" | "DOMAIN_SET" | "PAYMENT_RECORDED";
  performedBy: string;
  reason: string | null;
  createdAt: string;
};

type AcademyBillingDto = {
  academyId: string;
  academyPublicId: string;
  academyName: string;
  code: string;
  ownerName: string | null;
  active: boolean;
  monthlyAmount: number;
  billingContactPhone: string | null;
  billingContactEmail: string | null;
  nextDueDate: string;      // "YYYY-MM-DD"
  lastPaidDate: string | null;
  status: "CURRENT" | "DUE_SOON" | "OVERDUE";
  daysUntilDue: number;
};

type PaymentRecord = {
  id: string;
  academyId: string;
  amount: number;
  paidDate: string;
  recordedBy: string;
  notes: string | null;
  createdAt: string;
};

type StorageUsage = {
  academyId: string;
  academyPublicId: string;
  academyName: string;
  code: string;
  totalBytes: number;
  lastCalculatedAt: string;
};

type View = "login" | "list" | "dashboard" | "create" | "success" | "audit";

// ── Utility ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const BLANK_FORM = {
  academyName: "",
  code: "",
  slug: "",
  branchName: "",
  adminName: "",
  adminEmail: "",
  city: "",
  ownerName: "",
  phone: "",
  customDomain: "",
  monthlyAmount: "",
};

// ── Main component ────────────────────────────────────────────────────────────

export default function PlatformAdminPage() {
  const [view, setView] = useState<View>(() =>
    localStorage.getItem("platform_token") ? "list" : "login"
  );
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("platform_token")
  );
  const [academies, setAcademies]   = useState<AcademyListItem[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [form, setForm]             = useState({ ...BLANK_FORM });
  const [codeStatus, setCodeStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [creating, setCreating]     = useState(false);
  const [result, setResult]         = useState<CreateResult | null>(null);
  const [copied, setCopied]         = useState<string | null>(null);

  const [stats, setStats]           = useState<PlatformStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [billing, setBilling]           = useState<AcademyBillingDto[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);

  const [auditLog, setAuditLog]         = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch]   = useState("");

  const [exporting, setExporting] = useState<string | null>(null);

  const [deactivateModal, setDeactivateModal] = useState<{
    open: boolean; academy: AcademyListItem | null; reason: string;
  }>({ open: false, academy: null, reason: "" });

  const [markPaidModal, setMarkPaidModal] = useState<{
    open: boolean; billing: AcademyBillingDto | null; notes: string;
  }>({ open: false, billing: null, notes: "" });

  const [historyModal, setHistoryModal] = useState<{
    open: boolean; academyName: string; publicId: string; records: PaymentRecord[]; loading: boolean;
  }>({ open: false, academyName: "", publicId: "", records: [], loading: false });

  const [storage, setStorage]           = useState<StorageUsage[]>([]);
  const [storageLoading, setStorageLoading] = useState(false);
  const [recalculating, setRecalculating]   = useState(false);

  const authHeader = () => ({ Authorization: `Bearer ${token}` });

  const logout = (expired = false) => {
    localStorage.removeItem("platform_token");
    setToken(null); setView("login");
    setAcademies([]); setStats(null); setBilling([]); setAuditLog([]); setStorage([]);
    if (expired) setError("Your session has expired. Please log in again.");
  };

  const handleAuthError = (err: any) => {
    if (err?.response?.status === 401) { logout(true); return true; }
    return false;
  };

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchAcademies = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get("/platform/academies", { headers: authHeader() });
      setAcademies(res.data);
    } catch (err: any) {
      if (!handleAuthError(err)) setError("Failed to load academies");
    } finally { setLoading(false); }
  }, [token]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setStatsLoading(true);
    try {
      const res = await api.get("/platform/academies/stats", { headers: authHeader() });
      setStats(res.data);
    } catch (err: any) {
      if (!handleAuthError(err)) setError("Failed to load stats");
    } finally { setStatsLoading(false); }
  }, [token]);

  const fetchBilling = useCallback(async () => {
    if (!token) return;
    setBillingLoading(true);
    try {
      const res = await api.get("/platform/academies/billing", { headers: authHeader() });
      setBilling(res.data);
    } catch (err: any) {
      if (!handleAuthError(err)) setError("Failed to load billing");
    } finally { setBillingLoading(false); }
  }, [token]);

  const fetchStorage = useCallback(async () => {
    if (!token) return;
    setStorageLoading(true);
    try {
      const res = await api.get("/platform/academies/storage", { headers: authHeader() });
      setStorage(res.data);
    } catch (err: any) {
      if (!handleAuthError(err)) setError("Failed to load storage usage");
    } finally { setStorageLoading(false); }
  }, [token]);

  const triggerRecalculate = async () => {
    setRecalculating(true);
    try {
      await api.post("/platform/academies/storage/recalculate", {}, { headers: authHeader() });
      await fetchStorage();
    } catch (err: any) {
      if (!handleAuthError(err)) setError("Recalculation failed");
    } finally { setRecalculating(false); }
  };

  const fetchAuditLog = useCallback(async () => {
    if (!token) return;
    setAuditLoading(true);
    try {
      const res = await api.get("/platform/academies/audit-log", { headers: authHeader() });
      setAuditLog(res.data);
    } catch (err: any) {
      if (!handleAuthError(err)) setError("Failed to load audit log");
    } finally { setAuditLoading(false); }
  }, [token]);

  useEffect(() => { if (token) fetchAcademies(); }, [token, fetchAcademies]);
  useEffect(() => {
    if (view === "dashboard" && token) { fetchStats(); fetchBilling(); fetchStorage(); }
  }, [view, token]);
  useEffect(() => { if (view === "audit" && token) fetchAuditLog(); }, [view, token]);

  // Debounced code check
  useEffect(() => {
    if (!form.code || form.code.length < 2) { setCodeStatus("idle"); return; }
    if (!/^[A-Z0-9]+$/i.test(form.code)) { setCodeStatus("idle"); return; }
    setCodeStatus("checking");
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/platform/academies/check-code?code=${form.code}`, { headers: authHeader() });
        setCodeStatus(res.data.available ? "ok" : "taken");
      } catch { setCodeStatus("idle"); }
    }, 400);
    return () => clearTimeout(t);
  }, [form.code, token]);

  // ── Billing map keyed by publicId ──────────────────────────────────────────

  const billingByPublicId = new Map<string, AcademyBillingDto>(
    billing.map((b) => [b.academyPublicId, b])
  );

  // Dashboard rows sorted: OVERDUE first, DUE_SOON, CURRENT, no-billing last
  const statusOrder: Record<string, number> = { OVERDUE: 0, DUE_SOON: 1, CURRENT: 2 };
  const dashboardRows = [...(stats?.academies ?? [])].sort((a, b) => {
    const ba = billingByPublicId.get(a.publicId);
    const bb = billingByPublicId.get(b.publicId);
    const oa = ba ? (statusOrder[ba.status] ?? 3) : 3;
    const ob = bb ? (statusOrder[bb.status] ?? 3) : 3;
    if (oa !== ob) return oa - ob;
    if (ba && bb) return ba.daysUntilDue - bb.daysUntilDue;
    return 0;
  });

  const storageByPublicId = new Map<string, StorageUsage>(
    storage.map((s) => [s.academyPublicId, s])
  );

  const topConsumerIds = new Set(
    [...storageByPublicId.values()]
      .filter((s) => s.totalBytes > 0)
      .sort((a, b) => b.totalBytes - a.totalBytes)
      .slice(0, 3)
      .map((s) => s.academyPublicId)
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      if (res.data.role !== "ROLE_PLATFORM_ADMIN") { setError("Not a platform admin account"); return; }
      localStorage.setItem("platform_token", res.data.accessToken);
      setToken(res.data.accessToken); setView("list");
    } catch { setError("Invalid credentials"); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codeStatus === "taken") { setError("That code is already in use"); return; }
    if (!/^[A-Z0-9]{2,10}$/i.test(form.code)) {
      setError("Code must be 2-10 alphanumeric characters"); return;
    }
    if (!form.phone.trim()) { setError("Owner phone is required for billing/WhatsApp contact"); return; }
    const amt = parseFloat(form.monthlyAmount);
    if (!form.monthlyAmount || isNaN(amt) || amt < 0) {
      setError("A valid monthly fee is required"); return;
    }
    setError(""); setCreating(true);
    try {
      const payload = {
        academyName:   form.academyName.trim(),
        code:          form.code.toUpperCase().trim(),
        slug:          form.slug.trim() || slugify(form.academyName),
        branchName:    form.branchName.trim(),
        adminName:     form.adminName.trim(),
        adminEmail:    form.adminEmail.trim().toLowerCase(),
        city:          form.city.trim() || undefined,
        ownerName:     form.ownerName.trim() || undefined,
        phone:         form.phone.trim(),
        customDomain:  form.customDomain.trim() || undefined,
        monthlyAmount: amt,
      };
      const res = await api.post("/platform/academies", payload, { headers: authHeader() });
      setResult(res.data); setView("success"); setForm({ ...BLANK_FORM }); setCodeStatus("idle");
      fetchAcademies();
    } catch (err: any) {
      if (!handleAuthError(err)) setError(err?.response?.data?.message || "Failed to create academy");
    } finally { setCreating(false); }
  };

  const activate = async (a: AcademyListItem) => {
    try {
      await api.patch(`/platform/academies/${a.publicId}/activate`, {}, { headers: authHeader() });
      fetchAcademies(); if (view === "dashboard") { fetchStats(); fetchBilling(); }
      if (view === "audit") fetchAuditLog();
    } catch (err: any) { if (!handleAuthError(err)) setError("Failed to activate academy"); }
  };

  const openDeactivate = (a: AcademyListItem) =>
    setDeactivateModal({ open: true, academy: a, reason: "" });

  const confirmDeactivate = async () => {
    const a = deactivateModal.academy; if (!a) return;
    try {
      await api.patch(`/platform/academies/${a.publicId}/deactivate`,
        { reason: deactivateModal.reason.trim() || null }, { headers: authHeader() });
      setDeactivateModal({ open: false, academy: null, reason: "" });
      fetchAcademies(); if (view === "dashboard") { fetchStats(); fetchBilling(); }
      if (view === "audit") fetchAuditLog();
    } catch (err: any) {
      setDeactivateModal({ open: false, academy: null, reason: "" });
      if (!handleAuthError(err)) setError("Failed to deactivate academy");
    }
  };

  const setDomain = async (publicId: string, domain: string) => {
    try {
      await api.patch(`/platform/academies/${publicId}/domain`, { customDomain: domain }, { headers: authHeader() });
      fetchAcademies(); if (view === "audit") fetchAuditLog();
    } catch (err: any) { if (!handleAuthError(err)) setError("Failed to update domain"); }
  };

  const exportAcademy = async (a: AcademyListItem | AcademyBillingDto) => {
    const publicId = "publicId" in a ? a.publicId : a.academyPublicId;
    const code = a.code;
    setExporting(publicId);
    try {
      const res = await api.get(`/platform/academies/${publicId}/export`, {
        headers: authHeader(), responseType: "blob",
      });
      const url  = window.URL.createObjectURL(new Blob([res.data], { type: "application/zip" }));
      const link = document.createElement("a");
      link.href = url; link.download = `export-${code.toLowerCase()}.zip`; link.click();
      window.URL.revokeObjectURL(url);
      if (view === "audit") fetchAuditLog();
    } catch (err: any) { if (!handleAuthError(err)) setError("Export failed."); }
    finally { setExporting(null); }
  };

  const openMarkPaid = (b: AcademyBillingDto) =>
    setMarkPaidModal({ open: true, billing: b, notes: "" });

  const confirmMarkPaid = async () => {
    const b = markPaidModal.billing; if (!b) return;
    try {
      await api.post(`/platform/academies/${b.academyPublicId}/billing/mark-paid`,
        { notes: markPaidModal.notes.trim() || null }, { headers: authHeader() });
      setMarkPaidModal({ open: false, billing: null, notes: "" });
      fetchBilling(); if (view === "audit") fetchAuditLog();
    } catch (err: any) {
      setMarkPaidModal({ open: false, billing: null, notes: "" });
      if (!handleAuthError(err)) setError("Failed to record payment");
    }
  };

  const openHistory = async (b: AcademyBillingDto) => {
    setHistoryModal({ open: true, academyName: b.academyName, publicId: b.academyPublicId, records: [], loading: true });
    try {
      const res = await api.get(`/platform/academies/${b.academyPublicId}/billing/history`, { headers: authHeader() });
      setHistoryModal((m) => ({ ...m, records: res.data, loading: false }));
    } catch (err: any) {
      setHistoryModal((m) => ({ ...m, loading: false }));
      if (!handleAuthError(err)) setError("Failed to load payment history");
    }
  };

  const openWhatsApp = (b: AcademyBillingDto) => {
    if (!b.billingContactPhone) { setError("No phone number on record for this academy"); return; }
    const phone = b.billingContactPhone.replace(/[^0-9+]/g, "");
    const dueStr = new Date(b.nextDueDate + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    });
    const name = b.ownerName || b.academyName;
    const msg = `Hi ${name}, this is a reminder that your CricMaidan platform subscription of ₹${b.monthlyAmount.toLocaleString("en-IN")} was due on ${dueStr}. Please process the payment at your earliest convenience and let us know once done. Thank you!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  const openEmail = (b: AcademyBillingDto) => {
    if (!b.billingContactEmail) { setError("No email on record for this academy"); return; }
    const dueStr = new Date(b.nextDueDate + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    });
    const subject = encodeURIComponent(`CricMaidan Subscription Reminder — ${b.academyName}`);
    const body = encodeURIComponent(
      `Hi ${b.ownerName || b.academyName},\n\nThis is a friendly reminder that your CricMaidan platform subscription of ₹${b.monthlyAmount.toLocaleString("en-IN")} was due on ${dueStr}.\n\nPlease process the payment and reply to this email once done.\n\nThank you!`
    );
    window.open(`mailto:${b.billingContactEmail}?subject=${subject}&body=${body}`, "_blank");
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(null), 2000);
  };

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const filtered = academies.filter(
    (a) => !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.code || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.slug || "").includes(search.toLowerCase())
  );

  const filteredAudit = auditLog.filter(
    (e) => !auditSearch ||
      e.academyName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      e.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      e.performedBy.toLowerCase().includes(auditSearch.toLowerCase())
  );

  // ── LOGIN ────────────────────────────────────────────────────────────────
  if (view === "login") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-lg">CM</span>
            </div>
            <h1 className="text-lg font-semibold">CricMaidan Platform</h1>
            <p className="text-sm text-gray-400 mt-1">Platform admin login</p>
          </div>
          {error && (
            <div className={`border rounded-xl px-4 py-3 text-sm mb-4
              ${error.includes("expired")
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-red-50 border-red-200 text-red-700"}`}>
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" placeholder="Email" value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            <input type="password" placeholder="Password" value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            <button type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition">
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── SUCCESS ──────────────────────────────────────────────────────────────
  if (view === "success" && result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Academy created</div>
              <div className="text-sm text-gray-400">{result.academyName}</div>
            </div>
          </div>
          <div className="space-y-3 mb-6">
            <InfoRow label="Academy code" value={result.code} onCopy={() => copy(result.code, "code")} copied={copied === "code"} />
            <InfoRow label="Slug" value={result.slug} onCopy={() => copy(result.slug, "slug")} copied={copied === "slug"} />
            <InfoRow label="Branch" value={result.branchName} />
            <InfoRow label="Admin email" value={result.adminEmail} onCopy={() => copy(result.adminEmail, "email")} copied={copied === "email"} />
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Temp password <span className="text-red-500">(shown once — share securely)</span></div>
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <code className="flex-1 font-mono text-sm text-amber-900 select-all">{result.tempPassword}</code>
                <button onClick={() => copy(result.tempPassword, "pw")}
                  className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition flex-shrink-0">
                  {copied === "pw" ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">The admin must change this on first login.</p>
            </div>
          </div>
          <button onClick={() => setView("list")}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition">
            Back to academy list
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN LAYOUT ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Modals ── */}

      {/* Deactivate */}
      {deactivateModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-1">Deactivate academy?</h3>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-gray-700">{deactivateModal.academy?.name}</span> will
              be deactivated immediately.
            </p>
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Reason <span className="text-gray-400 font-normal">(optional, stored in audit log)</span>
              </label>
              <textarea value={deactivateModal.reason}
                onChange={(e) => setDeactivateModal((m) => ({ ...m, reason: e.target.value }))}
                placeholder="e.g. Trial expired, non-payment, at customer's request…"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                rows={3} autoFocus />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeactivateModal({ open: false, academy: null, reason: "" })}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={confirmDeactivate}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition">
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid */}
      {markPaidModal.open && markPaidModal.billing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-1">Mark as paid</h3>
            <p className="text-sm text-gray-500 mb-1">
              <span className="font-medium text-gray-700">{markPaidModal.billing.academyName}</span>
            </p>
            <p className="text-sm text-gray-700 mb-4">
              Recording payment of <span className="font-semibold">₹{markPaidModal.billing.monthlyAmount.toLocaleString("en-IN")}</span>.
              Next due date will advance to{" "}
              <span className="font-medium">
                {new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </span>.
            </p>
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input type="text" value={markPaidModal.notes}
                onChange={(e) => setMarkPaidModal((m) => ({ ...m, notes: e.target.value }))}
                placeholder="e.g. UPI transfer, bank ref #123…"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                autoFocus />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMarkPaidModal({ open: false, billing: null, notes: "" })}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={confirmMarkPaid}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition">
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment History */}
      {historyModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Payment history</h3>
                <p className="text-xs text-gray-400">{historyModal.academyName}</p>
              </div>
              <button onClick={() => setHistoryModal((m) => ({ ...m, open: false }))}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {historyModal.loading ? (
                <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>
              ) : historyModal.records.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No payments recorded yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-gray-100">
                      <th className="py-2 text-left text-xs font-semibold text-gray-500">Date</th>
                      <th className="py-2 text-right text-xs font-semibold text-gray-500">Amount</th>
                      <th className="py-2 text-left text-xs font-semibold text-gray-500 pl-4">Recorded by</th>
                      <th className="py-2 text-left text-xs font-semibold text-gray-500 pl-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyModal.records.map((r) => (
                      <tr key={r.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 text-gray-700 text-xs">
                          {new Date(r.paidDate + "T00:00:00").toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-gray-800">
                          ₹{r.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 text-gray-500 text-xs pl-4">{r.recordedBy}</td>
                        <td className="py-2.5 text-gray-400 text-xs pl-4">{r.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">CM</span>
            </div>
            <div className="font-semibold text-sm">CricMaidan Platform</div>
          </div>
          <div className="hidden sm:flex gap-1">
            {(["list", "dashboard", "audit"] as const).map((v) => (
              <button key={v}
                onClick={() => { setView(v); setError(""); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize
                  ${view === v ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}>
                {v === "list" ? "Academies" : v === "audit" ? "Audit Log" : "Dashboard"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {view !== "create" && (
            <button onClick={() => { setView("create"); setError(""); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
              + Add academy
            </button>
          )}
          <button onClick={() => logout()}
            className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition text-red-600">
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-3 underline text-red-500 text-xs">dismiss</button>
          </div>
        )}

        {/* ── LIST ── */}
        {view === "list" && (
          <>
            <div className="flex gap-3 mb-4">
              <input type="text" placeholder="Search by name, code or slug..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={fetchAcademies}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition">
                Refresh
              </button>
            </div>
            {loading ? (
              <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">No academies found.</div>
                ) : (
                  filtered.map((a, i) => (
                    <AcademyRow key={a.id} academy={a} last={i === filtered.length - 1}
                      onActivate={() => activate(a)}
                      onDeactivate={() => openDeactivate(a)}
                      onSetDomain={(d) => setDomain(a.publicId, d)}
                      onExport={() => exportAcademy(a)}
                      exporting={exporting === a.publicId} />
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* ── DASHBOARD ── */}
        {view === "dashboard" && (
          <>
            {(statsLoading || billingLoading || storageLoading) ? (
              <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
            ) : stats ? (
              <>
                {/* Stat cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                  <StatCard label="Total academies"  value={stats.totalAcademies}        color="blue" />
                  <StatCard label="Active"            value={stats.activeAcademies}       color="green" />
                  <StatCard label="Inactive"          value={stats.inactiveAcademies}     color="gray" />
                  <StatCard label="Total players"     value={stats.totalPlayers}          color="indigo" />
                  <StatCard label="New this week"     value={stats.newAcademiesThisWeek}  color="amber" />
                  <StatCard label="New this month"    value={stats.newAcademiesThisMonth} color="purple" />
                </div>

                {/* Billing + academy table */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Academies &amp; Billing</span>
                    <div className="flex items-center gap-3">
                      <button onClick={triggerRecalculate} disabled={recalculating}
                        className="text-xs text-gray-400 hover:text-indigo-600 transition disabled:opacity-50">
                        {recalculating ? "Recalculating…" : "Recalculate storage"}
                      </button>
                      <button onClick={() => { fetchStats(); fetchBilling(); fetchStorage(); }}
                        className="text-xs text-gray-400 hover:text-blue-600 transition">
                        Refresh
                      </button>
                    </div>
                  </div>
                  {dashboardRows.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">No academies yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Academy</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Code</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Monthly</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Next Due</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Billing</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Players</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Storage</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Active</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardRows.map((a, i) => {
                            const b = billingByPublicId.get(a.publicId);
                            return (
                              <tr key={a.id}
                                className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"} hover:bg-blue-50/30 transition`}>
                                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                                  <div>{a.name}</div>
                                  {a.city && <div className="text-xs text-gray-400">{a.city}</div>}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.code}</td>
                                <td className="px-4 py-3 text-right font-medium text-gray-800 whitespace-nowrap">
                                  {b ? `₹${b.monthlyAmount.toLocaleString("en-IN")}` : "—"}
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                                  {b ? new Date(b.nextDueDate + "T00:00:00").toLocaleDateString("en-IN", {
                                    day: "numeric", month: "short", year: "numeric",
                                  }) : "—"}
                                </td>
                                <td className="px-4 py-3">
                                  {b ? (
                                    <div>
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BILLING_STATUS_COLORS[b.status]}`}>
                                        {b.status === "CURRENT" ? "Current" :
                                         b.status === "DUE_SOON" ? `Due in ${b.daysUntilDue}d` :
                                         `Overdue ${Math.abs(b.daysUntilDue)}d`}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-300">no billing</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right font-medium">{a.playerCount}</td>
                                <td className="px-4 py-3 text-right">
                                  {(() => {
                                    const su = storageByPublicId.get(a.publicId);
                                    if (!su) return <span className="text-xs text-gray-300">—</span>;
                                    const isTop = topConsumerIds.has(a.publicId);
                                    return (
                                      <div>
                                        <span className={`text-xs font-semibold ${isTop ? "text-amber-600" : "text-gray-700"}`}>
                                          {formatBytes(su.totalBytes)}
                                        </span>
                                        <div className="text-xs text-gray-300 mt-0.5">
                                          {new Date(su.lastCalculatedAt).toLocaleDateString("en-IN", {
                                            day: "numeric", month: "short",
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                                    ${a.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                    {a.active ? "active" : "inactive"}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1 flex-wrap">
                                    {b && (
                                      <>
                                        <button onClick={() => openMarkPaid(b)}
                                          className="px-2.5 py-1 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs hover:bg-green-100 transition whitespace-nowrap">
                                          Mark Paid
                                        </button>
                                        {b.billingContactPhone && (
                                          <button onClick={() => openWhatsApp(b)}
                                            className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs hover:bg-emerald-100 transition whitespace-nowrap">
                                            WhatsApp
                                          </button>
                                        )}
                                        {b.billingContactEmail && (
                                          <button onClick={() => openEmail(b)}
                                            className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs hover:bg-blue-100 transition whitespace-nowrap">
                                            Email
                                          </button>
                                        )}
                                        <button onClick={() => openHistory(b)}
                                          className="px-2.5 py-1 border border-gray-200 text-gray-500 rounded-lg text-xs hover:bg-gray-50 transition whitespace-nowrap">
                                          History
                                        </button>
                                      </>
                                    )}
                                    <button onClick={() => exportAcademy(a)} disabled={exporting === a.publicId}
                                      className="px-2.5 py-1 border border-gray-200 rounded-lg text-xs hover:bg-gray-50 transition disabled:opacity-50 whitespace-nowrap">
                                      {exporting === a.publicId ? "…" : "Export"}
                                    </button>
                                    <button onClick={() => a.active ? openDeactivate(a) : activate(a)}
                                      className={`px-2.5 py-1 border rounded-lg text-xs transition whitespace-nowrap
                                        ${a.active ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}>
                                      {a.active ? "Deactivate" : "Activate"}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <button onClick={() => { fetchStats(); fetchBilling(); fetchStorage(); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
                  Load dashboard
                </button>
              </div>
            )}
          </>
        )}

        {/* ── AUDIT LOG ── */}
        {view === "audit" && (
          <>
            <div className="flex gap-3 mb-4">
              <input type="text" placeholder="Filter by academy, action, or performed by…"
                value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)}
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={fetchAuditLog}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition">
                Refresh
              </button>
            </div>
            {auditLoading ? (
              <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {filteredAudit.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    {auditLog.length === 0 ? "No audit events yet." : "No events match the filter."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Time</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Action</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Academy</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Performed by</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Reason / Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAudit.map((entry, i) => (
                          <tr key={entry.id} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                            <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                              {new Date(entry.createdAt).toLocaleString("en-IN", {
                                day: "numeric", month: "short", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${AUDIT_COLORS[entry.action] || "bg-gray-100 text-gray-600"}`}>
                                {entry.action}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-800">{entry.academyName}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{entry.performedBy}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{entry.reason || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── CREATE ── */}
        {view === "create" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">Add new academy</h2>
              <button onClick={() => { setView("list"); setError(""); setForm({ ...BLANK_FORM }); setCodeStatus("idle"); }}
                className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-5">
              {/* Academy info */}
              <fieldset>
                <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Academy</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Academy name *</label>
                    <input required value={form.academyName}
                      onChange={(e) => {
                        const name = e.target.value;
                        setForm((f) => ({
                          ...f, academyName: name,
                          code: f.code || name.split(" ").map((w) => w[0] || "").join("").toUpperCase().slice(0, 6),
                          slug: f.slug || slugify(name),
                        }));
                      }}
                      placeholder="NextGen Cricket Academy"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Short code * <span className="text-gray-400 font-normal">(2-10 alphanumeric)</span>
                    </label>
                    <div className="relative">
                      <input required value={form.code}
                        onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) }))}
                        placeholder="NCA"
                        className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 pr-20
                          ${codeStatus === "ok" ? "border-green-400 focus:ring-green-400" :
                            codeStatus === "taken" ? "border-red-400 focus:ring-red-400" :
                            "border-gray-300 focus:ring-blue-500"}`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                        {codeStatus === "checking" && <span className="text-gray-400">checking…</span>}
                        {codeStatus === "ok"       && <span className="text-green-600 font-medium">available</span>}
                        {codeStatus === "taken"    && <span className="text-red-500 font-medium">taken</span>}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Slug * <span className="text-gray-400 font-normal">(subdomain)</span></label>
                    <input required value={form.slug}
                      onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                      placeholder="nca-mysuru"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    {form.slug && <p className="text-xs text-gray-400 mt-1">{form.slug}.cricmaidan.com</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                    <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      placeholder="Mysuru"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Custom domain</label>
                    <input value={form.customDomain} onChange={(e) => setForm((f) => ({ ...f, customDomain: e.target.value }))}
                      placeholder="www.ncamysuru.com"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Owner phone * <span className="text-gray-400 font-normal">(billing / WhatsApp)</span>
                    </label>
                    <input required value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </fieldset>

              {/* Billing */}
              <fieldset>
                <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Billing</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Monthly fee (₹) *
                    </label>
                    <input required type="number" step="1" min="0" value={form.monthlyAmount}
                      onChange={(e) => setForm((f) => ({ ...f, monthlyAmount: e.target.value }))}
                      placeholder="5000"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <p className="text-xs text-gray-400 mt-1">First payment due 1 month after creation.</p>
                  </div>
                </div>
              </fieldset>

              {/* Branch */}
              <fieldset>
                <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">First Branch</legend>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Branch name *</label>
                  <input required value={form.branchName} onChange={(e) => setForm((f) => ({ ...f, branchName: e.target.value }))}
                    placeholder="Main Branch"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </fieldset>

              {/* Super Admin */}
              <fieldset>
                <legend className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Super Admin</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                    <input required value={form.adminName} onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))}
                      placeholder="Ravi Kumar"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                    <input required type="email" value={form.adminEmail} onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                      placeholder="admin@academy.com"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">A temporary password will be generated — shown once after creation.</p>
              </fieldset>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button"
                  onClick={() => { setView("list"); setError(""); setForm({ ...BLANK_FORM }); setCodeStatus("idle"); }}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={creating || codeStatus === "taken"}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {creating ? "Creating…" : "Create academy"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Color maps ────────────────────────────────────────────────────────────────

const BILLING_STATUS_COLORS: Record<string, string> = {
  CURRENT:  "bg-green-50 text-green-700",
  DUE_SOON: "bg-amber-50 text-amber-700",
  OVERDUE:  "bg-red-50 text-red-700 ring-1 ring-red-200",
};

const AUDIT_COLORS: Record<string, string> = {
  CREATED:          "bg-green-50 text-green-700",
  DEACTIVATED:      "bg-red-50 text-red-700",
  REACTIVATED:      "bg-emerald-50 text-emerald-700",
  EXPORTED:         "bg-blue-50 text-blue-700",
  DOMAIN_SET:       "bg-indigo-50 text-indigo-700",
  PAYMENT_RECORDED: "bg-teal-50 text-teal-700",
};

const STAT_COLORS: Record<string, string> = {
  blue:   "bg-blue-50 text-blue-700 border-blue-100",
  green:  "bg-green-50 text-green-700 border-green-100",
  gray:   "bg-gray-50 text-gray-600 border-gray-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  amber:  "bg-amber-50 text-amber-700 border-amber-100",
  purple: "bg-purple-50 text-purple-700 border-purple-100",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-2xl border px-4 py-4 ${STAT_COLORS[color] || STAT_COLORS.gray}`}>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-xs mt-1 opacity-80">{label}</div>
    </div>
  );
}

function InfoRow({
  label, value, onCopy, copied,
}: { label: string; value: string; onCopy?: () => void; copied?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <div className="text-xs text-gray-500 w-28 flex-shrink-0">{label}</div>
      <div className="font-mono text-sm text-gray-800 flex-1 select-all">{value}</div>
      {onCopy && (
        <button onClick={onCopy}
          className="px-2.5 py-1 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition flex-shrink-0">
          {copied ? "Copied!" : "Copy"}
        </button>
      )}
    </div>
  );
}

function AcademyRow({
  academy: a, last, onActivate, onDeactivate, onSetDomain, onExport, exporting,
}: {
  academy: AcademyListItem;
  last: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onSetDomain: (d: string) => void;
  onExport: () => void;
  exporting: boolean;
}) {
  const [editDomain, setEditDomain] = useState(false);
  const [domain, setDomain]         = useState("");

  return (
    <div className={`px-5 py-4 flex items-center gap-4 ${!last ? "border-b border-gray-100" : ""}`}>
      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        {a.code.substring(0, 3)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-gray-900">{a.name}</div>
        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
          <span className="font-mono">{a.code}</span>
          {a.slug && <span>· {a.slug}.cricmaidan.com</span>}
          {a.city && <span>· {a.city}</span>}
          <span>· {a.playerCount} player{a.playerCount !== 1 ? "s" : ""}</span>
          {a.createdAt && (
            <span>· {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
          )}
        </div>
        {editDomain && (
          <div className="flex gap-2 mt-2">
            <input value={domain} onChange={(e) => setDomain(e.target.value)}
              placeholder="www.academy.com" autoFocus
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={() => { onSetDomain(domain); setEditDomain(false); }}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium">Save</button>
            <button onClick={() => setEditDomain(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs">Cancel</button>
          </div>
        )}
      </div>
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0
        ${a.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
        {a.active ? "active" : "inactive"}
      </span>
      <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
        <button onClick={() => { setDomain(""); setEditDomain(true); }}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50 transition">
          Set domain
        </button>
        <button onClick={onExport} disabled={exporting}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50 transition disabled:opacity-50">
          {exporting ? "Exporting…" : "Export"}
        </button>
        <button onClick={a.active ? onDeactivate : onActivate}
          className={`px-3 py-1.5 border rounded-lg text-xs transition
            ${a.active ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}>
          {a.active ? "Deactivate" : "Activate"}
        </button>
      </div>
    </div>
  );
}
