import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import publicApi from "../api/publicApi";

const PASSWORD_HINT =
  "At least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&)";

export default function ResetPasswordPage() {
  const [searchParams]          = useSearchParams();
  const token                   = searchParams.get("token") ?? "";
  const navigate                = useNavigate();

  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-96 text-center">
          <p className="text-red-600 font-medium mb-4">Invalid reset link.</p>
          <Link to="/forgot-password" className="text-blue-600 hover:underline text-sm">
            Request a new one
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await publicApi.post("/auth/reset-password", { token, newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-xl font-semibold mb-1">Set new password</h2>
        <p className="text-sm text-gray-500 mb-6">{PASSWORD_HINT}</p>

        {success ? (
          <div className="bg-green-50 border border-green-300 text-green-700 rounded px-4 py-3 text-sm">
            Password updated! Redirecting to login…
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 rounded px-4 py-2 text-sm mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <label className="block mb-2 text-sm font-medium">New password</label>
              <input
                type="password"
                required
                className="w-full border rounded px-3 py-2 mb-4"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <label className="block mb-2 text-sm font-medium">Confirm password</label>
              <input
                type="password"
                required
                className="w-full border rounded px-3 py-2 mb-5"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Saving…" : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
