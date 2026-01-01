import { useEffect, useState } from "react";
import api from "../api/axios";

type SliderImage = {
  id: string;
  imageUrl: string;
  redirectUrl?: string;
  active: boolean;
};

function AdminSliderManager() {
  const [file, setFile] = useState<File | null>(null);
  const [redirectUrl, setRedirectUrl] = useState("");

  const [images, setImages] = useState<SliderImage[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ pagination + search
  const [page, setPage] = useState(0);
  const [size] = useState(5);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");

  // --------------------
  // LOAD SLIDERS
  // --------------------
  const fetchImages = async () => {
    setLoading(true);
    const res = await api.get("/admin/home-slider", {
      params: { page, size, search }
    });

    setImages(res.data.content);
    setTotalPages(res.data.totalPages);
    setLoading(false);
  };

  useEffect(() => {
    fetchImages();
  }, [page, search]);

  // --------------------
  // ACTIONS
  // --------------------
  const upload = async () => {
    if (!file) return;

    const form = new FormData();
    form.append("file", file);
    form.append("redirectUrl", redirectUrl);

    await api.post("/admin/home-slider", form);
    setFile(null);
    setRedirectUrl("");
    fetchImages();
  };

  const toggleActive = async (id: string) => {
    await api.patch(`/admin/home-slider/${id}/toggle`);
    fetchImages();
  };

  const deleteSlider = async (id: string) => {
    if (!window.confirm("Delete slider permanently?")) return;
    await api.delete(`/admin/home-slider/${id}`);
    fetchImages();
  };

  // --------------------
  // UI
  // --------------------
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Home Slider Manager</h1>

      {/* SEARCH */}
      <input
        className="border p-2 w-full"
        placeholder="Search slider…"
        value={search}
        onChange={(e) => {
          setPage(0);
          setSearch(e.target.value);
        }}
      />

      {/* UPLOAD */}
      <div className="bg-white p-4 rounded shadow space-y-3">
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <input
          className="border p-2 w-full"
          placeholder="Redirect URL"
          value={redirectUrl}
          onChange={(e) => setRedirectUrl(e.target.value)}
        />
        <button onClick={upload} className="bg-blue-600 text-white px-4 py-2 rounded">
          Upload
        </button>
      </div>

      {/* LIST */}
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        images.map((img) => (
          <div key={img.id} className="flex gap-4 bg-white p-3 rounded shadow">
            <img src={img.imageUrl} className="h-20 w-32 rounded object-cover" />

            <div className="flex-1 text-sm">
              <p>Status: {img.active ? "Active" : "Inactive"}</p>
              {img.redirectUrl && <p>{img.redirectUrl}</p>}
            </div>

            <button onClick={() => toggleActive(img.id)} className="bg-yellow-500 px-3 py-1 text-white rounded">
              Toggle
            </button>

            <button onClick={() => deleteSlider(img.id)} className="bg-red-600 px-3 py-1 text-white rounded">
              Delete
            </button>
          </div>
        ))
      )}

      {/* PAGINATION */}
      <div className="flex justify-between">
        <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</button>
        <span>Page {page + 1} of {totalPages}</span>
        <button disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>
    </div>
  );
}

export default AdminSliderManager;
