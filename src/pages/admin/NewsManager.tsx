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
import api from "../../api/axios";
import { getImageUrl } from "../../utils/imageUrl";
import PresenceBanner from "../../components/PresenceBanner";
import { useAuth } from "../../auth/useAuth";

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
  const { academyId } = useAuth();
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
      const response = await api.get("/admin/cms/news");
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
      const response = await api.post("/admin/cms/news/upload-image", fd);
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
        const response = await api.post("/admin/cms/news", payload);
        setNews([response.data, ...news]);
      } else {
        const response = await api.put(`/admin/cms/news/${editingId}`, payload);
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
      await api.delete(`/admin/cms/news/${id}`);
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
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 tracking-tight">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
              News Management
            </h2>
            <PresenceBanner
              entity="YOUR-MANAGER-NAME"
              id={academyId ?? undefined}
            />
            <p className="text-sm text-gray-500 mt-0.5">
              Manage news articles and announcements
            </p>
          </div>
          <button
            onClick={handleAdd}
            disabled={isAdding || !!editingId}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-sm flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add News</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white rounded-xl border-2 border-blue-200 shadow-sm p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
            {isAdding ? "Add New" : "Edit"} News Article
          </h3>
          {editingId && (
            <PresenceBanner entity="YOUR-ENTITY-NAME" id={editingId} />
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Title *</label>
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="summer-camp-2026"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="Announcement"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Short Description
              </label>
              <textarea
                value={formData.shortDescription}
                onChange={(e) =>
                  setFormData({ ...formData, shortDescription: e.target.value })
                }
                placeholder="Brief summary…"
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Full Content *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="Full article content…"
                rows={6}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Featured Image
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                {formData.featuredImageUrl && (
                  <img
                    src={getImageUrl(formData.featuredImageUrl)}
                    alt="Preview"
                    className="w-28 h-18 object-cover rounded-lg border border-gray-200"
                  />
                )}
                <label className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-200 active:bg-gray-300 transition">
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading…" : "Upload Image"}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition bg-white"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Published Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.publishedAt}
                  onChange={(e) =>
                    setFormData({ ...formData, publishedAt: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm transition"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={!formData.title || !formData.content}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-sm"
              >
                <Save className="w-4 h-4" /> Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 active:bg-gray-300 transition"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {news.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <div className="flex gap-3 sm:gap-4">
              {item.featuredImageUrl && (
                <img
                  src={getImageUrl(item.featuredImageUrl)}
                  alt={item.title}
                  className="w-20 h-16 sm:w-28 sm:h-20 object-cover rounded-lg border border-gray-100 flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-800 text-sm truncate">{item.title}</h3>
                    {item.shortDescription && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {item.shortDescription}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {item.category && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                          {item.category}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full font-medium ${item.status === "PUBLISHED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {item.status}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(item)}
                      disabled={
                        isAdding || (editingId && editingId !== item.id)
                      }
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:text-gray-300 disabled:hover:bg-transparent transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={isAdding || !!editingId}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:text-gray-300 disabled:hover:bg-transparent transition"
                    >
                      <Trash2 className="w-4 h-4" />
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
