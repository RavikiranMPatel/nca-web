import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, ChevronRight, ArrowLeft, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { useAuth } from "../auth/useAuth";
import type { LoginData } from "../auth/AuthContext";

// Scoped to /api/public — all paths in this file are relative to that base,
// so /players/search and /players/claim-account can never accidentally miss the /public/ segment.
const claimApi = axios.create({
  baseURL: "/api/public",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

type PlayerResult = {
  playerPublicId: string;
  displayName: string;
};

type Step = "search" | "claim";

export default function PlayerSignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState<Step>("search");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerResult | null>(null);

  // Step 1 state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 2 state
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await claimApi.get<PlayerResult[]>("/players/search", {
          params: { q: query.trim() },
        });
        setResults(res.data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  function selectPlayer(player: PlayerResult) {
    setSelectedPlayer(player);
    setError("");
    setStep("claim");
  }

  function goBack() {
    setStep("search");
    setError("");
    setPhone("");
    setEmail("");
    setPassword("");
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await claimApi.post<{
        accessToken: string;
        userId: string;
        userName: string;
        userEmail: string;
        role: string;
        academyId: string;
        academyName: string;
        branchId: string;
        branchName: string;
      }>("/players/claim-account", {
        playerPublicId: selectedPlayer!.playerPublicId,
        phone: phone.trim(),
        email: email.trim(),
        password,
      });

      const data = res.data;
      const loginData: LoginData = {
        token: data.accessToken,
        role: data.role,
        userName: data.userName,
        userEmail: data.userEmail,
        userPublicId: data.userId,
        academyId: data.academyId ? String(data.academyId) : undefined,
        academyName: data.academyName,
        branchId: data.branchId ? String(data.branchId) : undefined,
        branchName: data.branchName,
      };
      login(loginData);
      navigate("/home");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-10">
      <div className="bg-white rounded-xl shadow-md w-full max-w-md p-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <span className="text-4xl">🏏</span>
          <h1 className="text-xl font-bold text-gray-900 mt-2">
            Activate Your Player Account
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Already enrolled at the academy? Set up your login here.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
              step === "search"
                ? "bg-blue-600 text-white"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            <span>1</span>
            <span>Find Your Name</span>
          </div>
          <ChevronRight size={14} className="text-gray-400" />
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
              step === "claim"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            <span>2</span>
            <span>Verify & Set Password</span>
          </div>
        </div>

        {/* ── STEP 1: Search ─────────────────────────────────────────────── */}
        {step === "search" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Search your name
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type at least 2 letters…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mt-3 min-h-[120px]">
              {searching && (
                <p className="text-sm text-gray-400 text-center py-6">
                  Searching…
                </p>
              )}

              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-6">
                  No players found. Check the spelling or contact the academy.
                </p>
              )}

              {!searching && results.length > 0 && (
                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                  {results.map((p) => (
                    <li key={p.playerPublicId}>
                      <button
                        onClick={() => selectPlayer(p)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm hover:bg-blue-50 transition"
                      >
                        <span className="font-medium text-gray-800">
                          {p.displayName}
                        </span>
                        <ChevronRight size={16} className="text-gray-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-xs text-center text-gray-400 mt-4">
              If your name doesn't appear, your account may already be activated
              or contact the academy admin.
            </p>

            <p className="text-sm mt-5 text-center">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-blue-600 font-medium hover:underline"
              >
                Login
              </Link>
            </p>
          </div>
        )}

        {/* ── STEP 2: Claim ─────────────────────────────────────────────── */}
        {step === "claim" && selectedPlayer && (
          <form onSubmit={handleClaim}>
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-4"
            >
              <ArrowLeft size={13} />
              Back to search
            </button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-0.5">
                Setting up account for
              </p>
              <p className="text-sm font-bold text-blue-900">
                {selectedPlayer.displayName}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 text-sm px-4 py-2.5 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Mobile or parent's number on file"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Must match the number registered with the academy.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars, upper, lower, number, symbol"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Must include uppercase, lowercase, number, and special character.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition"
            >
              {submitting ? "Activating…" : "Activate Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
