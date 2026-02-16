import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ImageUpload from "../components/ImageUpload";

import {
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  X,
  ArrowLeft,
} from "lucide-react";
import api from "../api/axios";
import { getImageUrl } from "../utils/imageUrl";

type SliderImage = {
  id: string;
  imageUrl: string;
  redirectUrl?: string;
  active: boolean;
};

function AdminSliderManager() {
  const navigate = useNavigate();

  // Upload state

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("");

  // List state
  const [images, setImages] = useState<SliderImage[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [size] = useState(6);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Search
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  // --------------------
  // LOAD SLIDERS
  // --------------------
  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/home-slider", {
        params: { page, size, search: query },
      });

      setImages(res.data.content);
      setTotalPages(res.data.totalPages);
      setTotalElements(res.data.totalElements);
    } finally {
      setLoading(false);
    }
  }, [page, size, query]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // --------------------
  // ACTIONS
  // --------------------
  const toggleActive = async (id: string) => {
    await api.patch(`/admin/home-slider/${id}/toggle`);
    fetchImages();
  };

  const deleteSlider = async (id: string) => {
    if (!window.confirm("Delete this slider image permanently?")) return;
    await api.delete(`/admin/home-slider/${id}`);
    fetchImages();
  };

  // --------------------
  // SEARCH
  // --------------------
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
    setQuery(value);
  };

  // --------------------
  // UI
  // --------------------
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/admin")}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          title="Back to Admin Dashboard"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex-1 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Home Slider Manager</h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage homepage banner images ({totalElements} total)
            </p>
          </div>

          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            Add New Slider
          </button>
        </div>
      </div>

      {/* UPLOAD FORM */}
      {showUploadForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upload New Slider Image</h2>
            <button
              onClick={() => setShowUploadForm(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X size={20} />
            </button>
          </div>

          <ImageUpload
            uploadType="slider"
            label="Slider Image"
            helpText="Recommended: 1920x800px (16:6 ratio)"
            onUploadSuccess={async (url) => {
              try {
                await api.post("/admin/home-slider", {
                  imageUrl: url,
                  redirectUrl,
                });

                setRedirectUrl("");
                setShowUploadForm(false);
                fetchImages();
              } catch (error) {
                alert("Failed to save slider");
              }
            }}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Redirect URL (Optional)
            </label>
            <input
              type="text"
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </div>
      )}

      {/* SEARCH */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by redirect URL..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* SLIDER LIST */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : images.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <ImageIcon className="mx-auto text-gray-300 mb-4" size={64} />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No slider images found
          </h3>
          <p className="text-gray-500">
            {search
              ? "Try adjusting your search"
              : "Upload your first slider image to get started"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((img) => (
            <div
              key={img.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden"
            >
              {/* Image */}
              <div className="relative">
                <img
                  src={getImageUrl(img.imageUrl) || ""}
                  alt="Slider"
                  className="w-full h-48 object-cover"
                />

                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  {img.active ? (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Eye size={12} />
                      Active
                    </span>
                  ) : (
                    <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <EyeOff size={12} />
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-3">
                {img.redirectUrl && (
                  <div className="flex items-start gap-2 text-sm">
                    <LinkIcon
                      size={16}
                      className="text-gray-400 mt-0.5 flex-shrink-0"
                    />
                    <a
                      href={img.redirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {img.redirectUrl}
                    </a>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(img.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition ${
                      img.active
                        ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                        : "bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    {img.active ? (
                      <>
                        <EyeOff size={16} />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <Eye size={16} />
                        Activate
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => deleteSlider(img.id)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <span className="text-sm text-gray-600">
              Page {page + 1} of {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page + 1 >= totalPages}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSliderManager;
