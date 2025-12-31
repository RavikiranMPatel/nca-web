import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

function CreatePlayer() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    displayName: "",
    dob: "",
    guardianName: "",
    skillLevel: "",
    battingStyle: "",
    bowlingStyle: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --------------------
  // HANDLE CHANGE
  // --------------------
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // --------------------
  // SUBMIT
  // --------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/players", form);

      // ✅ Store playerId for booking
      localStorage.setItem("playerId", res.data.id);

      navigate("/home");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to create player profile"
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------
  // UI
  // --------------------
  return (
    <div className="max-w-xl mx-auto mt-12 bg-white p-8 rounded shadow">
      <h1 className="text-2xl font-semibold mb-6 text-center">
        Create Player Profile
      </h1>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-2 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* NAME */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Player Name *
          </label>
          <input
            name="displayName"
            required
            value={form.displayName}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* DOB */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Date of Birth
          </label>
          <input
            type="date"
            name="dob"
            value={form.dob}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* GUARDIAN */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Guardian Name
          </label>
          <input
            name="guardianName"
            value={form.guardianName}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* SKILL */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Skill Level
          </label>
          <select
            name="skillLevel"
            value={form.skillLevel}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Select</option>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </div>

        {/* BATTING */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Batting Style
          </label>
          <select
            name="battingStyle"
            value={form.battingStyle}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Select</option>
            <option>Right-hand</option>
            <option>Left-hand</option>
          </select>
        </div>

        {/* BOWLING */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Bowling Style
          </label>
          <select
            name="bowlingStyle"
            value={form.bowlingStyle}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Select</option>
            <option>Fast</option>
            <option>Medium</option>
            <option>Spin</option>
          </select>
        </div>

        {/* ACTION */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded text-white ${
            loading
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Creating..." : "Create Player"}
        </button>
      </form>
    </div>
  );
}

export default CreatePlayer;
