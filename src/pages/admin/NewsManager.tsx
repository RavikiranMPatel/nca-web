import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  FileText,
  Upload,
  Calendar,
} from "lucide-react";
import axiosInstance from "../../api/axiosInstance";
import { getImageUrl } from "../../utils/imageUrl";

type NewsPost = {
  id: string;
  title: string;
  slug: string;
  category?: string;
  shortDescription?: string;
  content: string;
  featuredImageUrl?: string;
  status: string;
  publishedAt: string;
};

const NewsManager = () => {
  const [news, setNews] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<{
    title: string;
    slug: string;
    category?: string;
    shortDescription?: string;
    content: string;
    featuredImageUrl?: string;
    status: string;
    publishedAt: string;
  }>({
    title: "",
    slug: "",
    category: "",
    shortDescription: "",
    content: "",
    featuredImageUrl: "",
    status: "PUBLISHED",
    publishedAt: new Date().toISOString().slice(0, 16),
  });

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      const response = await axiosInstance.get("/api/admin/cms/news");
      setNews(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error loading news:", error);
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      // ✅ FIXED: Removed Content-Type header - let browser set it automatically
      const response = await axiosInstance.post(
        "/api/admin/cms/news/upload-image",
        fd,
      );
      setFormData((prev) => ({ ...prev, featuredImageUrl: response.data }));
    } catch (error) {
      console.error("Error uploading:", error);
      alert("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = () => {
    setIsAdding(true);
    setFormData({
      title: "",
      slug: "",
      category: "",
      shortDescription: "",
      content: "",
      featuredImageUrl: "",
      status: "PUBLISHED",
      publishedAt: new Date().toISOString().slice(0, 16),
    });
  };

  const handleEdit = (item: NewsPost) => {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      slug: item.slug,
      category: item.category || "",
      shortDescription: item.shortDescription || "",
      content: item.content,
      featuredImageUrl: item.featuredImageUrl || "",
      status: item.status,
      publishedAt: item.publishedAt
        ? new Date(item.publishedAt).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    const payload = {
      ...formData,
      slug: formData.slug || generateSlug(formData.title),
      publishedAt: new Date(formData.publishedAt).toISOString(),
    };

    try {
      if (isAdding) {
        const response = await axiosInstance.post(
          "/api/admin/cms/news",
          payload,
        );
        setNews([response.data, ...news]);
      } else {
        const response = await axiosInstance.put(
          `/api/admin/cms/news/${editingId}`,
          payload,
        );
        setNews(news.map((n) => (n.id === editingId ? response.data : n)));
      }
      handleCancel();
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save news");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await axiosInstance.delete(`/api/admin/cms/news/${id}`);
      setNews(news.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Error deleting:", error);
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
              <FileText className="w-6 h-6 text-blue-600" />
              News Management
            </h2>
            <p className="text-gray-600 mt-1">
              Manage news articles and announcements
            </p>
          </div>
          <button
            onClick={handleAdd}
            disabled={isAdding || !!editingId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Add News
          </button>
        </div>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-blue-200">
          <h3 className="text-lg font-semibold mb-4">
            {isAdding ? "Add New" : "Edit"} News Article
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    title: e.target.value,
                    slug: generateSlug(e.target.value),
                  })
                }
                placeholder="Summer Camp 2026 Registration Open"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="summer-camp-2026"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="Announcement"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Short Description
              </label>
              <textarea
                value={formData.shortDescription}
                onChange={(e) =>
                  setFormData({ ...formData, shortDescription: e.target.value })
                }
                placeholder="Brief summary..."
                rows={2}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Full Content *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="Full article content..."
                rows={6}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Featured Image
              </label>
              <div className="flex items-center gap-4">
                {formData.featuredImageUrl && (
                  <img
                    src={getImageUrl(formData.featuredImageUrl)}
                    alt="Preview"
                    className="w-32 h-20 object-cover rounded"
                  />
                )}
                <label className="px-4 py-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Upload Image"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> Published Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.publishedAt}
                  onChange={(e) =>
                    setFormData({ ...formData, publishedAt: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={!formData.title || !formData.content}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {news.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex gap-4">
              {item.featuredImageUrl && (
                <img
                  src={getImageUrl(item.featuredImageUrl)}
                  alt={item.title}
                  className="w-32 h-24 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {item.shortDescription}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        {item.category}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded ${item.status === "PUBLISHED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {item.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(item.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      disabled={
                        isAdding || (editingId && editingId !== item.id)
                      }
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={isAdding || !!editingId}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsManager;
