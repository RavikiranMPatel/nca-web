import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signupApi } from "../api/auth.api";
import { useAuth } from "../auth/useAuth";
import { useEffect } from "react";
import publicApi from "../api/publicApi";
import { getImageUrl } from "../utils/imageUrl";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [academyName, setAcademyName] = useState("NextGen Cricket Academy");

  const { login } = useAuth();
  const navigate = useNavigate();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const res = await signupApi({ name, email, password });

      // 🔐 Decode JWT to get role
      const base64Payload = res.accessToken.split(".")[1];
      const decodedPayload = JSON.parse(
        decodeURIComponent(
          atob(base64Payload)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join(""),
        ),
      );

      const role = decodedPayload?.role || "ROLE_USER";

      // ✅ AuthContext login (token + role)
      login(res.accessToken, role);

      navigate("/home");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Signup failed");
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

          <h2 className="text-xl font-semibold">Create Account</h2>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            placeholder="Full Name"
            className="w-full border rounded px-3 py-2 mb-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="email"
            placeholder="Email"
            className="w-full border rounded px-3 py-2 mb-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full border rounded px-3 py-2 mb-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirm Password"
            className="w-full border rounded px-3 py-2 mb-6"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Sign Up
          </button>
        </form>

        <p className="text-sm mt-4 text-center">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-blue-600 font-medium hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
