import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Users, UserPlus } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";

type CoachingPlayer = {
  publicId: string;
  displayName: string;
  phone?: string;
  enrollmentSource: string;
  sourceAcademyName?: string;
  active: boolean;
};

type View = { type: "list" } | { type: "register" };

function CoachingDashboardPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>({ type: "list" });
  const [players, setPlayers] = useState<CoachingPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [createLogin, setCreateLogin] = useState(true);

  // Register form state
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [playerRole, setPlayerRole] = useState("BATSMEN");
  const [sourceAcademyName, setSourceAcademyName] = useState("");
  const [gender, setGender] = useState("MALE");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    setLoading(true);
    try {
      const [ownRes, extRes] = await Promise.all([
        // ← Change this: only fetch own players who have coaching data
        api.get("/admin/players/coaching/own"),
        api.get("/admin/players/coaching/players"),
      ]);
      const own: CoachingPlayer[] = ownRes.data.map((p: any) => ({
        publicId: p.publicId,
        displayName: p.displayName,
        phone: p.phone,
        enrollmentSource: p.enrollmentSource || "DIRECT",
        active: p.active,
      }));
      const ext: CoachingPlayer[] = extRes.data.map((p: any) => ({
        publicId: p.publicId,
        displayName: p.displayName,
        phone: p.phone,
        enrollmentSource: "ONE_ON_ONE",
        sourceAcademyName: p.sourceAcademyName,
        active: p.active,
      }));
      const ownIds = new Set(own.map((p) => p.publicId));
      setPlayers([...own, ...ext.filter((p) => !ownIds.has(p.publicId))]);
    } catch {
      toast.error("Failed to load players");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterExternal = async () => {
    if (!displayName.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/players/external", {
        displayName: displayName.trim(),
        phone: phone || undefined,
        dob: dob || undefined,
        playerRole,
        sourceAcademyName: sourceAcademyName || undefined,
        gender,
        email: email || undefined,
        loginEmail: createLogin ? loginEmail || email || undefined : undefined,
        loginPassword: createLogin ? loginPassword : undefined,
      });
      toast.success(
        createLogin && loginPassword
          ? "Player registered & login credentials sent via WhatsApp!"
          : "External player registered successfully!",
      );
      setView({ type: "list" });
      resetForm();
      loadPlayers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to register");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setDisplayName("");
    setPhone("");
    setDob("");
    setPlayerRole("BATSMEN");
    setSourceAcademyName("");
    setGender("MALE");
    setEmail("");
    setLoginEmail("");
    setLoginPassword("");
    setCreateLogin(true);
  };

  const filtered = players.filter(
    (p) =>
      p.displayName.toLowerCase().includes(search.toLowerCase()) ||
      (p.sourceAcademyName || "").toLowerCase().includes(search.toLowerCase()),
  );

  const own = filtered.filter((p) => p.enrollmentSource !== "ONE_ON_ONE");
  const external = filtered.filter((p) => p.enrollmentSource === "ONE_ON_ONE");

  if (view.type === "register") {
    return (
      <div className="max-w-xl mx-auto space-y-5">
        <button
          onClick={() => setView({ type: "list" })}
          className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:text-blue-700"
        >
          <ArrowLeft size={16} /> Back to Coaching Dashboard
        </button>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-blue-600" />
            <h2 className="font-bold text-slate-900">
              Register External Player
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            For players from other academies or walk-ins coming for 1-on-1
            coaching.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Player name"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="player@email.com"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Role
                </label>
                <select
                  value={playerRole}
                  onChange={(e) => setPlayerRole(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BATSMEN">Batsmen</option>
                  <option value="BOWLER">Bowler</option>
                  <option value="ALL_ROUNDER">All Rounder</option>
                  <option value="WICKET_KEEPER">Wicket Keeper</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Source Academy
              </label>
              <input
                type="text"
                value={sourceAcademyName}
                onChange={(e) => setSourceAcademyName(e.target.value)}
                placeholder="e.g. Karnataka Cricket Academy"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="border-t border-slate-200 pt-3 mt-1">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="create-login"
                  checked={createLogin}
                  onChange={(e) => setCreateLogin(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <label
                  htmlFor="create-login"
                  className="text-sm font-medium text-slate-700"
                >
                  Create login account for player
                </label>
              </div>

              {createLogin && (
                <div className="space-y-3 bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Login Email
                      <span className="text-slate-400 font-normal ml-1">
                        (leave blank to use email above)
                      </span>
                    </label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Same as email above"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Temporary Password *
                    </label>
                    <input
                      type="text"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Credentials will be sent via WhatsApp to player's phone.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setView({ type: "list" })}
              disabled={saving}
              className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleRegisterExternal}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 shadow-sm"
            >
              <UserPlus size={15} />
              {saving ? "Registering..." : "Register Player"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin")}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              1-on-1 Coaching
            </h1>
            <p className="text-sm text-slate-500">
              Select a player to manage coaching
            </p>
          </div>
        </div>
        <button
          onClick={() => setView({ type: "register" })}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 shadow-sm"
        >
          <UserPlus size={15} /> External Player
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or academy..."
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading && (
        <div className="text-center py-10">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Own Academy Players */}
      {!loading && own.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-800">
              Academy Players
            </h2>
            <span className="text-xs text-slate-400 ml-auto">
              {own.length} players
            </span>
          </div>
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {own.map((p) => (
              <PlayerRow
                key={p.publicId}
                player={p}
                onClick={() =>
                  navigate(`/admin/players/${p.publicId}/coaching`)
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* External Players */}
      {!loading && external.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5 space-y-3">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-orange-500" />
            <h2 className="text-sm font-semibold text-slate-800">
              External / One-on-One
            </h2>
            <span className="text-xs text-slate-400 ml-auto">
              {external.length} players
            </span>
          </div>
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {external.map((p) => (
              <PlayerRow
                key={p.publicId}
                player={p}
                onClick={() =>
                  navigate(`/admin/players/${p.publicId}/coaching`)
                }
              />
            ))}
          </div>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="bg-white rounded-lg shadow p-10 text-center">
          <p className="text-slate-500 text-sm">
            {search ? "No players match your search" : "No players found"}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Player row ────────────────────────────────────────────────────

function PlayerRow({
  player,
  onClick,
}: {
  player: CoachingPlayer;
  onClick: () => void;
}) {
  const isExternal = player.enrollmentSource === "ONE_ON_ONE";
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-blue-50 transition group text-left"
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
            isExternal
              ? "bg-orange-100 text-orange-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {player.displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800 group-hover:text-blue-700">
            {player.displayName}
          </p>
          <p className="text-[11px] text-slate-400">
            {isExternal
              ? `External${player.sourceAcademyName ? ` · ${player.sourceAcademyName}` : ""}`
              : player.publicId}
          </p>
        </div>
      </div>
      {isExternal && (
        <span className="text-[10px] font-semibold bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full border border-orange-200">
          EXT
        </span>
      )}
    </button>
  );
}

export default CoachingDashboardPage;
