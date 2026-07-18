import { useState } from "react";
import { Link } from "react-router-dom";
import publicApi from "../api/publicApi";

export default function ForgotPasswordPage() {
  const [email, setEmail]       = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await publicApi.post("/auth/forgot-password", { email: email.trim() });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-xl font-semibold mb-1">Forgot password?</h2>
        <p className="text-sm text-gray-500 mb-6">
          Enter your email and we'll send a reset link if the account exists.
        </p>

        {submitted ? (
          <div className="bg-green-50 border border-green-300 text-green-700 rounded px-4 py-3 text-sm">
            Check your inbox — if that email is registered, a reset link has been sent.
            <div className="mt-4">
              <Link to="/login" className="text-blue-600 font-medium hover:underline text-sm">
                Back to login
              </Link>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 rounded px-4 py-2 text-sm mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <label className="block mb-2 text-sm font-medium">Email address</label>
              <input
                type="email"
                required
                className="w-full border rounded px-3 py-2 mb-5"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <p className="text-sm mt-4 text-center">
              <Link to="/login" className="text-gray-500 hover:text-blue-600 hover:underline">
                Back to login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
