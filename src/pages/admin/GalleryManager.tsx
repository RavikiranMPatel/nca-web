import React, { useState, useEffect } from "react";
import { Upload, Trash2, Eye, EyeOff, Image as ImageIcon } from "lucide-react";
import api from "../../api/axios";
import { getImageUrl } from "../../utils/imageUrl";
import PresenceBanner from "../../components/PresenceBanner";
import { useAuth } from "../../auth/useAuth";

type GalleryImage = {
  id: string;
  imageUrl: string;
  caption?: string;
  active: boolean;
};

const GalleryManager = () => {
  const { academyId } = useAuth();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const response = await api.get("/admin/cms/gallery");
      setImages(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error loading gallery:", error);
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await api.post(
          "/admin/cms/gallery/upload-image",
          formData,
        );

        const galleryEntry = {
          imageUrl: response.data,
          caption: "",
          active: true,
        };

        const createResponse = await api.post(
          "/admin/cms/gallery", // ✅ removed /api
          galleryEntry,
        );

        setImages((prev) => [...prev, createResponse.data]);
      }
    } catch (error) {
      console.error("Error uploading:", error);
      alert("Failed to upload images");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.patch(`/admin/cms/gallery/${id}/toggle`);
      setImages(
        images.map((img) =>
          img.id === id ? { ...img, active: !img.active } : img,
        ),
      );
    } catch (error) {
      console.error("Error toggling:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this image?")) return;
    try {
      await api.delete(`/admin/cms/gallery/${id}`); // ✅ removed /api
      setImages(images.filter((img) => img.id !== id));
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleCaptionUpdate = async (id: string, caption: string) => {
    try {
      const image = images.find((img) => img.id === id);
      if (!image) return;

      await api.put(`/admin/cms/gallery/${id}`, {
        // ✅ removed /api
        ...image,
        caption,
      });
      setImages(
        images.map((img) => (img.id === id ? { ...img, caption } : img)),
      );
    } catch (error) {
      console.error("Error updating caption:", error);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 tracking-tight">
              <ImageIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
              Gallery Management
            </h2>
            <PresenceBanner
              entity="facilities-manager"
              id={academyId ?? undefined}
            />
            <p className="text-sm text-gray-500 mt-0.5">
              Upload and manage gallery images
            </p>
          </div>
          <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm flex-shrink-0 cursor-pointer ${uploading ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"}`}>
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">{uploading ? "Uploading…" : "Upload Images"}</span>
            <span className="sm:hidden">{uploading ? "…" : "Upload"}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 sm:p-16 text-center">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-semibold">No images in gallery</p>
          <p className="text-sm text-gray-400 mt-1">Upload images to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="relative group">
                <img
                  src={getImageUrl(image.imageUrl)}
                  alt={image.caption || "Gallery"}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleToggle(image.id)}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100 transition shadow-sm"
                  >
                    {image.active ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(image.id)}
                    className="p-2 bg-white rounded-lg hover:bg-red-50 text-red-500 transition shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <input
                  type="text"
                  value={image.caption || ""}
                  onChange={(e) =>
                    setImages(
                      images.map((img) =>
                        img.id === image.id
                          ? { ...img, caption: e.target.value }
                          : img,
                      ),
                    )
                  }
                  onBlur={(e) => handleCaptionUpdate(image.id, e.target.value)}
                  placeholder="Add caption…"
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
                />
                <div className="mt-2">
                  {image.active ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                      <Eye className="w-3 h-3" /> Visible
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">
                      <EyeOff className="w-3 h-3" /> Hidden
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GalleryManager;
