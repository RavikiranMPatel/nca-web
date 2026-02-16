import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginApi } from "../api/auth.api";
import { useAuth } from "../auth/useAuth";
import { useEffect } from "react";
import publicApi from "../api/publicApi";
import { getImageUrl } from "../utils/imageUrl";

function Login() {
  // ✅ Initialize error state with session expired message if present
  const [error, setError] = useState(() => {
    const sessionExpired = sessionStorage.getItem("sessionExpired");
    if (sessionExpired === "true") {
      sessionStorage.removeItem("sessionExpired");
      return "Your session has expired. Please login again.";
    }
    return "";
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [academyName, setAcademyName] = useState("NextGen Cricket Academy");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await publicApi.get("/settings/public");
        setLogoUrl(res.data?.LOGO_URL || null);
        setAcademyName(res.data?.ACADEMY_NAME || "NextGen Cricket Academy");
      } catch (err) {
        console.warn("Failed to load public settings", err);
      }
    };

    loadSettings();
  }, []);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await loginApi({ email, password });

      // 🔐 Decode JWT payload
      const base64Payload = res.accessToken.split(".")[1];
      const decodedPayload = JSON.parse(
        decodeURIComponent(
          atob(base64Payload)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join(""),
        ),
      );

      const role = decodedPayload?.role;

      // ✅ AuthContext login
      login(res.accessToken, role);

      // Clear stale player context
      localStorage.removeItem("playerId");
      localStorage.removeItem("playerName");

      const redirectTo = sessionStorage.getItem("redirectAfterLogin");
      if (redirectTo) {
        sessionStorage.removeItem("redirectAfterLogin");
        navigate(redirectTo);
      } else {
        navigate("/home");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          {logoUrl ? (
            <img
              src={getImageUrl(logoUrl) || ""}
              alt={academyName}
              className="h-20 mb-2 object-contain"
            />
          ) : (
            <div className="h-20 mb-2 flex items-center justify-center text-gray-400 text-sm">
              Logo
            </div>
          )}

          <h2 className="text-xl font-semibold">{academyName}</h2>
        </div>

        {/* Error display with different styling for session expired */}
        {error && (
          <div
            className={`border px-4 py-2 rounded mb-4 text-sm ${
              error.includes("session")
                ? "bg-yellow-50 border-yellow-300 text-yellow-700"
                : "bg-red-50 border-red-300 text-red-700"
            }`}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="block mb-2 text-sm font-medium">Email</label>
          <input
            type="email"
            required
            className="w-full border rounded px-3 py-2 mb-4"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="block mb-2 text-sm font-medium">Password</label>
          <input
            type="password"
            required
            className="w-full border rounded px-3 py-2 mb-6"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Login
          </button>
        </form>

        <p className="text-sm mt-4 text-center">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-blue-600 font-medium hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
