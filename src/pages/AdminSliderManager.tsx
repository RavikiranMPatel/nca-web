import { useEffect, useState } from "react";
import api from "../api/axios";

function AdminSliderManager() {
  const [file, setFile] = useState<File | null>(null);
  const [redirectUrl, setRedirectUrl] = useState("");

  const upload = async () => {
    if (!file) return;

    const form = new FormData();
    form.append("file", file);
    form.append("redirectUrl", redirectUrl);

    await api.post("/admin/home-slider", form);
    alert("Uploaded");
  };

  return (
    <div className="max-w-lg space-y-4">
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <input
        className="border p-2 w-full"
        placeholder="Redirect URL (optional)"
        value={redirectUrl}
        onChange={(e) => setRedirectUrl(e.target.value)}
      />

      <button
        onClick={upload}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Upload Slider Image
      </button>
    </div>
  );
}

export default AdminSliderManager;
