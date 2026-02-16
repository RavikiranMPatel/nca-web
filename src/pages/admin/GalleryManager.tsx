import React, { useState, useEffect } from "react";
import { Upload, Trash2, Eye, EyeOff, Image as ImageIcon } from "lucide-react";
import axiosInstance from "../../api/axiosInstance";
import { getImageUrl } from "../../utils/imageUrl";

type GalleryImage = {
  id: string;
  imageUrl: string;
  caption?: string;
  active: boolean;
};

const GalleryManager = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const response = await axiosInstance.get("/api/admin/cms/gallery");
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
      // Upload files one by one
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        // ✅ FIXED: Removed Content-Type header - let browser set it automatically
        const response = await axiosInstance.post(
          "/api/admin/cms/gallery/upload-image",
          formData,
        );

        // The response should be the image URL string
        // Now create the gallery entry with the image URL
        const galleryEntry = {
          imageUrl: response.data,
          caption: "",
          active: true,
        };

        const createResponse = await axiosInstance.post(
          "/api/admin/cms/gallery",
          galleryEntry,
        );

        setImages((prev) => [...prev, createResponse.data]);
      }
    } catch (error) {
      console.error("Error uploading:", error);
      alert("Failed to upload images");
    } finally {
      setUploading(false);
      // Reset the input
      e.target.value = "";
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await axiosInstance.patch(`/api/admin/cms/gallery/${id}/toggle`);
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
      await axiosInstance.delete(`/api/admin/cms/gallery/${id}`);
      setImages(images.filter((img) => img.id !== id));
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleCaptionUpdate = async (id: string, caption: string) => {
    try {
      const image = images.find((img) => img.id === id);
      if (!image) return;

      await axiosInstance.put(`/api/admin/cms/gallery/${id}`, {
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
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-blue-600" />
              Gallery Management
            </h2>
            <p className="text-gray-600 mt-1">
              Upload and manage gallery images
            </p>
          </div>
          <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer flex items-center gap-2">
            <Upload className="w-5 h-5" />
            {uploading ? "Uploading..." : "Upload Images"}
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
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No images in gallery</p>
          <p className="text-gray-400 mt-2">Upload images to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div className="relative group">
                <img
                  src={getImageUrl(image.imageUrl)}
                  alt={image.caption || "Gallery"}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleToggle(image.id)}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100"
                  >
                    {image.active ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <EyeOff className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(image.id)}
                    className="p-2 bg-white rounded-lg hover:bg-red-50 text-red-600"
                  >
                    <Trash2 className="w-5 h-5" />
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
                  placeholder="Add caption..."
                  className="w-full text-sm px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500"
                />
                <div className="mt-2">
                  {image.active ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      <Eye className="w-3 h-3" /> Visible
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
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
