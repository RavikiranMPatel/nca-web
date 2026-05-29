import { useEffect, useState } from "react";
import axios from "axios";

const api = axios.create({ baseURL: "/api" });

type Academy = {
  id: string;
  publicId: string;
  name: string;
  code: string;
  slug: string | null;
  customDomain: string | null;
  city: string | null;
  ownerName: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
};

type View = "login" | "list" | "create" | "bulk";

export default function PlatformAdminPage() {
  const [view, setView] = useState<View>("login");
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("platform_token"),
  );
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Create form
  const [form, setForm] = useState({
    name: "",
    code: "",
    slug: "",
    customDomain: "",
    city: "",
    ownerName: "",
    email: "",
    phone: "",
  });

  // Bulk CSV
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      setView("list");
      fetchAcademies();
    }
  }, [token]);

  const authHeader = () => ({ Authorization: `Bearer ${token}` });

  const fetchAcademies = async () => {
    setLoading(true);
    try {
      const res = await api.get("/platform/academies", {
        headers: authHeader(),
      });
      setAcademies(res.data);
    } catch {
      setError("Failed to load academies");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      if (res.data.role !== "ROLE_PLATFORM_ADMIN") {
        setError("Not a platform admin account");
        return;
      }
      localStorage.setItem("platform_token", res.data.accessToken);
      setToken(res.data.accessToken);
    } catch {
      setError("Invalid credentials");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/platform/academies", form, { headers: authHeader() });
      setForm({
        name: "",
        code: "",
        slug: "",
        customDomain: "",
        city: "",
        ownerName: "",
        email: "",
        phone: "",
      });
      await fetchAcademies();
      setView("list");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create academy");
    }
  };

  const toggleActive = async (a: Academy) => {
    try {
      await api.patch(
        `/platform/academies/${a.publicId}/${a.active ? "deactivate" : "activate"}`,
        {},
        { headers: authHeader() },
      );
      await fetchAcademies();
    } catch {
      setError("Failed to update academy");
    }
  };

  const setDomain = async (publicId: string, domain: string) => {
    try {
      await api.patch(
        `/platform/academies/${publicId}/domain`,
        { customDomain: domain },
        { headers: authHeader() },
      );
      await fetchAcademies();
    } catch {
      setError("Failed to update domain");
    }
  };

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const parseCSV = (text: string) => {
    const lines = text
      .trim()
      .split("\n")
      .filter((l) => l.trim());
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim());
      const obj: any = {};
      headers.forEach((h, i) => (obj[h] = vals[i] || ""));
      return obj;
    });
  };

  const previewCSV = () => setCsvPreview(parseCSV(csvText));

  const importCSV = async () => {
    const rows = parseCSV(csvText);
    let added = 0,
      failed = 0;
    for (const r of rows) {
      try {
        await api.post(
          "/platform/academies",
          {
            name: r.name,
            code: r.code?.toUpperCase(),
            slug: r.slug || slugify(r.name),
            customDomain: r.custom_domain || null,
            city: r.city || null,
            ownerName: r.owner_name || null,
            email: r.email || null,
            phone: r.phone || null,
          },
          { headers: authHeader() },
        );
        added++;
      } catch {
        failed++;
      }
    }
    await fetchAcademies();
    setView("list");
    setCsvText("");
    setCsvPreview([]);
    alert(`Imported ${added}, failed ${failed}`);
  };

  const logout = () => {
    localStorage.removeItem("platform_token");
    setToken(null);
    setView("login");
    setAcademies([]);
  };

  const filtered = academies.filter(
    (a) =>
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.slug || "").includes(search.toLowerCase()) ||
      (a.code || "").toLowerCase().includes(search.toLowerCase()),
  );

  // ── LOGIN ──────────────────────────────────────────────────────────────────
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
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── MAIN LAYOUT ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">CM</span>
          </div>
          <div>
            <div className="font-semibold text-sm">
              CricMaidan Platform Admin
            </div>
            <div className="text-xs text-gray-400">
              {academies.length} academies
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("create")}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
          >
            + Add academy
          </button>
          <button
            onClick={() => setView("bulk")}
            className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
          >
            Bulk import
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition text-red-600"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
            {error}
            <button onClick={() => setError("")} className="ml-2 underline">
              dismiss
            </button>
          </div>
        )}

        {/* ── LIST ── */}
        {view === "list" && (
          <>
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                placeholder="Search academies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={fetchAcademies}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                Loading...
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No academies found.
                  </div>
                ) : (
                  filtered.map((a, i) => (
                    <AcademyRow
                      key={a.id}
                      academy={a}
                      last={i === filtered.length - 1}
                      onToggle={() => toggleActive(a)}
                      onSetDomain={(d) => setDomain(a.publicId, d)}
                    />
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* ── CREATE ── */}
        {view === "create" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold">Add academy</h2>
              <button
                onClick={() => setView("list")}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                ← Back
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Academy name *
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setForm((f) => ({
                        ...f,
                        name,
                        code:
                          f.code ||
                          name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 6),
                        slug: f.slug || slugify(name),
                      }));
                    }}
                    placeholder="NextGen Cricket Academy"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Code * (max 10)
                  </label>
                  <input
                    required
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        code: e.target.value.toUpperCase().slice(0, 10),
                      }))
                    }
                    placeholder="NCA"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Slug * (subdomain)
                  </label>
                  <input
                    required
                    value={form.slug}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, slug: slugify(e.target.value) }))
                    }
                    placeholder="nca-mysuru"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {form.slug || "slug"}.cricmaidan.com
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Custom domain
                  </label>
                  <input
                    value={form.customDomain}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, customDomain: e.target.value }))
                    }
                    placeholder="www.ncamysuru.com"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    City
                  </label>
                  <input
                    value={form.city}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, city: e.target.value }))
                    }
                    placeholder="Mysuru"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Owner name
                  </label>
                  <input
                    value={form.ownerName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ownerName: e.target.value }))
                    }
                    placeholder="Ravi Kumar"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="admin@academy.com"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Phone
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    placeholder="+91 98765 43210"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
                >
                  Create academy
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── BULK ── */}
        {view === "bulk" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold">Bulk CSV import</h2>
              <button
                onClick={() => setView("list")}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                ← Back
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 font-mono text-xs text-gray-500 mb-4">
              name,code,slug,city,owner_name,email,phone,custom_domain
              <br />
              NextGen Cricket Academy,NCA,nca-mysuru,Mysuru,Ravi
              Kumar,ravi@nca.com,9876543210,ncamysuru.com
            </div>
            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste CSV here..."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            {csvPreview.length > 0 && (
              <div className="mb-4 border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500">
                  Preview — {csvPreview.length} academies
                </div>
                {csvPreview.map((r, i) => (
                  <div
                    key={i}
                    className="px-4 py-2.5 border-t border-gray-100 text-sm"
                  >
                    <span className="font-medium">{r.name}</span>
                    <span className="text-gray-400 ml-2">
                      · {r.code} · {r.slug || slugify(r.name)}.cricmaidan.com
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={previewCSV}
                className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
              >
                Preview
              </button>
              <button
                onClick={importCSV}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
              >
                Import all
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AcademyRow({
  academy: a,
  last,
  onToggle,
  onSetDomain,
}: {
  academy: Academy;
  last: boolean;
  onToggle: () => void;
  onSetDomain: (d: string) => void;
}) {
  const [editDomain, setEditDomain] = useState(false);
  const [domain, setDomain] = useState(a.customDomain || "");

  return (
    <div
      className={`px-5 py-4 flex items-center gap-4 ${!last ? "border-b border-gray-100" : ""}`}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
        style={{ backgroundColor: "#2563eb" }}
      >
        {a.code.substring(0, 3)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{a.name}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {a.slug ? `${a.slug}.cricmaidan.com` : "no slug set"}
          {a.customDomain && ` · ${a.customDomain}`}
          {a.city && ` · ${a.city}`}
        </div>
        {editDomain && (
          <div className="flex gap-2 mt-2">
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="www.academy.com"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                onSetDomain(domain);
                setEditDomain(false);
              }}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium"
            >
              Save
            </button>
            <button
              onClick={() => setEditDomain(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${a.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}
      >
        {a.active ? "active" : "inactive"}
      </span>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => setEditDomain(true)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50 transition"
        >
          Set domain
        </button>
        <button
          onClick={onToggle}
          className={`px-3 py-1.5 border rounded-lg text-xs transition ${a.active ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}
        >
          {a.active ? "Deactivate" : "Activate"}
        </button>
      </div>
    </div>
  );
}
