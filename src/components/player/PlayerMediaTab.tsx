import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-hot-toast";
import {
  Plus,
  Image,
  Video,
  X,
  Trash2,
  Upload,
  Play,
  Tag,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  playerMediaService,
  detectPlatform,
  extractYouTubeId,
  extractInstagramId,
  getYouTubeThumbnail,
  getYouTubeEmbedUrl,
  getInstagramEmbedUrl,
} from "../../api/playerService/playerMediaService";
import type {
  PlayerMediaResponse,
  MediaType,
  MediaTag,
  VideoPlatform,
} from "../../api/playerService/playerMediaService";

// ─── CONSTANTS ───────────────────────────────────────────

const PAGE_SIZE = 20;

const TAGS: { value: MediaTag; label: string; icon: string }[] = [
  { value: "BATTING", label: "Batting", icon: "🏏" },
  { value: "BOWLING", label: "Bowling", icon: "🎯" },
  { value: "FIELDING", label: "Fielding", icon: "🥊" },
  { value: "MATCH", label: "Match", icon: "🏟️" },
  { value: "FITNESS", label: "Fitness", icon: "💪" },
  { value: "OTHER", label: "Other", icon: "📁" },
];

const TAG_COLORS: Record<string, string> = {
  BATTING: "bg-blue-100 text-blue-700",
  BOWLING: "bg-red-100 text-red-700",
  FIELDING: "bg-teal-100 text-teal-700",
  MATCH: "bg-purple-100 text-purple-700",
  FITNESS: "bg-orange-100 text-orange-700",
  OTHER: "bg-slate-100 text-slate-600",
};

// ─── HELPERS ─────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMonthYear(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function groupByMonth(
  items: PlayerMediaResponse[],
): Map<string, PlayerMediaResponse[]> {
  const groups = new Map<string, PlayerMediaResponse[]>();
  items.forEach((item) => {
    const key = formatMonthYear(item.createdAt);
    const existing = groups.get(key) || [];
    existing.push(item);
    groups.set(key, existing);
  });
  return groups;
}

// ─── MAIN COMPONENT ─────────────────────────────────────

type Props = {
  playerPublicId: string;
};

function PlayerMediaTab({ playerPublicId }: Props) {
  // Data
  const [media, setMedia] = useState<PlayerMediaResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<"ALL" | MediaType>("ALL");
  const [filterTag, setFilterTag] = useState<MediaTag | "ALL">("ALL");

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [uploadMode, setUploadMode] = useState<"PHOTO" | "VIDEO">("PHOTO");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState("");
  const [detectedPlatform, setDetectedPlatform] =
    useState<VideoPlatform | null>(null);
  const [detectedVideoId, setDetectedVideoId] = useState<string | null>(null);
  const [uploadTag, setUploadTag] = useState<MediaTag>("OTHER");
  const [uploadNote, setUploadNote] = useState("");
  const [uploading, setUploading] = useState(false);

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── LOAD DATA ─────────────────────────────────────────

  const loadMedia = useCallback(
    async (page: number, append = false) => {
      if (page === 0) setLoading(true);
      else setLoadingMore(true);

      try {
        const type = filterType === "ALL" ? undefined : filterType;
        const tag = filterTag === "ALL" ? undefined : filterTag;

        const data = await playerMediaService.getAll(
          playerPublicId,
          page,
          PAGE_SIZE,
          type,
          tag,
        );

        if (append) {
          setMedia((prev) => [...prev, ...data.content]);
        } else {
          setMedia(data.content);
        }

        setTotalCount(data.totalElements);
        setHasMore(data.hasNext);
        setCurrentPage(data.currentPage);
      } catch (error) {
        toast.error("Failed to load media");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [playerPublicId, filterType, filterTag],
  );

  // Reload from page 0 when filters change
  useEffect(() => {
    loadMedia(0);
  }, [loadMedia]);

  const handleLoadMore = () => {
    loadMedia(currentPage + 1, true);
  };

  // ─── FILTER HANDLERS (reset to page 0) ────────────────

  const handleTypeFilter = (type: "ALL" | MediaType) => {
    setFilterType(type);
    setMedia([]);
    setCurrentPage(0);
  };

  const handleTagFilter = (tag: MediaTag | "ALL") => {
    setFilterTag(tag);
    setMedia([]);
    setCurrentPage(0);
  };

  // ─── VIDEO URL DETECTION ───────────────────────────────

  const handleVideoUrlChange = (url: string) => {
    setVideoUrl(url);
    const platform = detectPlatform(url);
    setDetectedPlatform(platform);

    if (platform === "YOUTUBE") {
      setDetectedVideoId(extractYouTubeId(url));
    } else if (platform === "INSTAGRAM") {
      setDetectedVideoId(extractInstagramId(url));
    } else {
      setDetectedVideoId(null);
    }
  };

  // ─── PHOTO FILE SELECT ────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
  };

  // ─── UPLOAD HANDLER ────────────────────────────────────

  const handleUpload = async () => {
    setUploading(true);
    try {
      if (uploadMode === "PHOTO") {
        if (!uploadFile) {
          toast.error("Please select a photo");
          setUploading(false);
          return;
        }
        await playerMediaService.uploadPhoto(
          playerPublicId,
          uploadFile,
          uploadTag,
          uploadNote || undefined,
        );
        toast.success("Photo uploaded");
      } else {
        if (!videoUrl || !detectedPlatform || !detectedVideoId) {
          toast.error("Please enter a valid YouTube or Instagram URL");
          setUploading(false);
          return;
        }
        await playerMediaService.addVideo(playerPublicId, {
          mediaType: "VIDEO",
          mediaUrl: videoUrl,
          videoPlatform: detectedPlatform,
          tag: uploadTag,
          note: uploadNote || undefined,
        });
        toast.success("Video added");
      }
      resetUploadModal();
      loadMedia(0);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const resetUploadModal = () => {
    setShowUpload(false);
    setUploadMode("PHOTO");
    setUploadFile(null);
    setUploadPreview("");
    setVideoUrl("");
    setDetectedPlatform(null);
    setDetectedVideoId(null);
    setUploadTag("OTHER");
    setUploadNote("");
  };

  // ─── DELETE HANDLER ────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await playerMediaService.delete(playerPublicId, deleteTarget);
      toast.success("Media deleted");
      setDeleteTarget(null);
      // Remove from local state for instant UI update
      setMedia((prev) => prev.filter((m) => m.publicId !== deleteTarget));
      setTotalCount((prev) => prev - 1);
    } catch (error) {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  // ─── LIGHTBOX ──────────────────────────────────────────

  const lightboxMedia = lightboxIndex !== null ? media[lightboxIndex] : null;

  const goLightbox = (dir: -1 | 1) => {
    if (lightboxIndex === null) return;
    const next = lightboxIndex + dir;
    if (next >= 0 && next < media.length) {
      setLightboxIndex(next);
    }
  };

  // ─── GROUPED DATA ─────────────────────────────────────

  const grouped = groupByMonth(media);

  // ─── LOADING STATE ─────────────────────────────────────

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 mt-3">Loading media...</p>
      </div>
    );
  }

  // ─── RENDER ────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ─── HEADER ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            📸 Player Media
          </h3>
          <p className="text-xs text-slate-500">
            {totalCount} item{totalCount !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm"
        >
          <Plus size={14} />
          Upload
        </button>
      </div>

      {/* ─── FILTERS ──────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {/* Type filter */}
        <div className="flex gap-1 bg-white rounded-lg shadow-sm p-0.5">
          {(["ALL", "PHOTO", "VIDEO"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                filterType === t
                  ? "bg-blue-600 text-white"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {t === "ALL" ? "All" : t === "PHOTO" ? "📷 Photos" : "🎥 Videos"}
            </button>
          ))}
        </div>

        {/* Tag filter */}
        <div className="flex gap-1 bg-white rounded-lg shadow-sm p-0.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleTagFilter("ALL")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              filterTag === "ALL"
                ? "bg-blue-600 text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            All Tags
          </button>
          {TAGS.map((tag) => (
            <button
              key={tag.value}
              type="button"
              onClick={() => handleTagFilter(tag.value)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                filterTag === tag.value
                  ? "bg-blue-600 text-white"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {tag.icon}
              <span className="hidden sm:inline ml-1">{tag.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── GALLERY GRID ─────────────────────────────── */}
      {media.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-4xl mb-3">📷</div>
          <p className="text-sm text-slate-500 mb-1">No media yet</p>
          <p className="text-xs text-slate-400">
            Upload photos or add video links to build the gallery
          </p>
        </div>
      ) : (
        <>
          {Array.from(grouped.entries()).map(([month, items]) => (
            <div key={month}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                {month}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {items.map((item) => {
                  const globalIndex = media.indexOf(item);
                  const isVideo = item.mediaType === "VIDEO";
                  const isInstagram = item.videoPlatform === "INSTAGRAM";

                  return (
                    <div
                      key={item.publicId}
                      className="group relative bg-white rounded-lg shadow-sm overflow-hidden border border-slate-100 cursor-pointer hover:shadow-md transition-all"
                      onClick={() => setLightboxIndex(globalIndex)}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                        {isVideo && isInstagram ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
                            <svg
                              viewBox="0 0 24 24"
                              className="w-8 h-8 text-white mb-1"
                              fill="currentColor"
                            >
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                            </svg>
                            <span className="text-white text-[10px] font-semibold">
                              Instagram Reel
                            </span>
                          </div>
                        ) : (
                          <img
                            src={
                              isVideo && item.videoId
                                ? getYouTubeThumbnail(item.videoId)
                                : item.mediaUrl
                            }
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}

                        {/* Video play overlay */}
                        {isVideo && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                              <Play
                                size={18}
                                className="text-slate-800 ml-0.5"
                                fill="currentColor"
                              />
                            </div>
                          </div>
                        )}

                        {/* Platform badge */}
                        {isVideo && item.videoPlatform && (
                          <div className="absolute top-1.5 left-1.5">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white">
                              {item.videoPlatform === "YOUTUBE"
                                ? "▶ YouTube"
                                : "📷 Instagram"}
                            </span>
                          </div>
                        )}

                        {/* Delete button (hover) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(item.publicId);
                          }}
                          className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Info bar */}
                      <div className="p-2">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${TAG_COLORS[item.tag] || TAG_COLORS.OTHER}`}
                          >
                            {item.tag}
                          </span>
                          <span
                            className="text-[10px] text-slate-400"
                            title={formatFullDate(item.createdAt)}
                          >
                            {timeAgo(item.createdAt)}
                          </span>
                        </div>
                        {item.note && (
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-1">
                            {item.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* ─── LOAD MORE BUTTON ─────────────────────── */}
          {hasMore && (
            <div className="text-center pt-4 pb-8">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>Load More ({totalCount - media.length} remaining)</>
                )}
              </button>
            </div>
          )}

          {/* ─── END OF LIST ──────────────────────────── */}
          {!hasMore && media.length > 0 && (
            <p className="text-center text-xs text-slate-400 py-4">
              — All {totalCount} items loaded —
            </p>
          )}
        </>
      )}

      {/* ─── UPLOAD MODAL ─────────────────────────────── */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add Media</h3>
              <button
                type="button"
                onClick={resetUploadModal}
                className="p-1 rounded-full hover:bg-slate-100"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            {/* Type Toggle */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-4">
              <button
                type="button"
                onClick={() => setUploadMode("PHOTO")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all ${
                  uploadMode === "PHOTO"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                <Image size={14} /> Photo
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("VIDEO")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-all ${
                  uploadMode === "VIDEO"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                <Video size={14} /> Video
              </button>
            </div>

            {/* Photo Upload */}
            {uploadMode === "PHOTO" && (
              <div className="space-y-3">
                {uploadPreview ? (
                  <div className="relative">
                    <img
                      src={uploadPreview}
                      alt="Preview"
                      className="w-full rounded-lg object-cover max-h-48"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setUploadFile(null);
                        setUploadPreview("");
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 rounded-lg py-8 flex flex-col items-center gap-2 hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                  >
                    <Upload size={24} className="text-slate-400" />
                    <span className="text-sm text-slate-600">
                      Tap to select photo
                    </span>
                    <span className="text-[10px] text-slate-400">
                      JPG, PNG, WebP • Max 5MB
                    </span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}

            {/* Video URL */}
            {uploadMode === "VIDEO" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    Paste Video URL
                  </label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => handleVideoUrlChange(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or https://instagram.com/reel/..."
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {videoUrl && (
                  <div className="space-y-2">
                    {detectedPlatform && detectedVideoId ? (
                      <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <span className="text-green-600 font-semibold">✓</span>
                        <span className="text-green-700">
                          {detectedPlatform === "YOUTUBE"
                            ? "YouTube video"
                            : "Instagram Reel"}{" "}
                          detected
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        <span className="text-red-600 font-semibold">✕</span>
                        <span className="text-red-700">
                          Could not detect video. Check URL format.
                        </span>
                      </div>
                    )}

                    {detectedPlatform === "YOUTUBE" && detectedVideoId && (
                      <div className="rounded-lg overflow-hidden border">
                        <img
                          src={getYouTubeThumbnail(detectedVideoId)}
                          alt="YouTube thumbnail"
                          className="w-full aspect-video object-cover"
                        />
                      </div>
                    )}
                    {detectedPlatform === "INSTAGRAM" && detectedVideoId && (
                      <div className="rounded-lg overflow-hidden border bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-4 flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          📷 Instagram Reel Preview
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tag Selection */}
            <div className="mt-4">
              <label className="text-xs font-medium text-slate-600 block mb-2">
                <Tag size={12} className="inline mr-1" /> Tag
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {TAGS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setUploadTag(t.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      uploadTag === t.value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="mt-4">
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Note (optional)
              </label>
              <textarea
                value={uploadNote}
                onChange={(e) => setUploadNote(e.target.value)}
                placeholder="e.g., Good cover drive practice..."
                rows={2}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={handleUpload}
                disabled={
                  uploading ||
                  (uploadMode === "PHOTO" && !uploadFile) ||
                  (uploadMode === "VIDEO" &&
                    (!detectedPlatform || !detectedVideoId))
                }
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    {uploadMode === "PHOTO" ? "Upload Photo" : "Add Video"}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={resetUploadModal}
                disabled={uploading}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 disabled:opacity-50 transition-all text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── LIGHTBOX ─────────────────────────────────── */}
      {lightboxMedia && lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative w-full max-w-3xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute -top-10 right-0 p-2 text-white/70 hover:text-white z-10"
            >
              <X size={24} />
            </button>

            {/* Media */}
            <div className="bg-black rounded-lg overflow-hidden">
              {lightboxMedia.mediaType === "PHOTO" ? (
                <img
                  src={lightboxMedia.mediaUrl}
                  alt=""
                  className="w-full max-h-[70vh] object-contain"
                />
              ) : lightboxMedia.videoPlatform === "YOUTUBE" &&
                lightboxMedia.videoId ? (
                <div className="aspect-video">
                  <iframe
                    src={`${getYouTubeEmbedUrl(lightboxMedia.videoId)}?autoplay=1`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="YouTube video"
                  />
                </div>
              ) : lightboxMedia.videoPlatform === "INSTAGRAM" &&
                lightboxMedia.videoId ? (
                <div className="aspect-[9/16] max-h-[70vh] mx-auto">
                  <iframe
                    src={getInstagramEmbedUrl(lightboxMedia.videoId)}
                    className="w-full h-full"
                    allowFullScreen
                    title="Instagram Reel"
                  />
                </div>
              ) : null}
            </div>

            {/* Info Bar */}
            <div className="bg-slate-900 rounded-b-lg px-4 py-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${TAG_COLORS[lightboxMedia.tag] || TAG_COLORS.OTHER}`}
                  >
                    {lightboxMedia.tag}
                  </span>
                  <span
                    className="text-xs text-slate-400"
                    title={formatFullDate(lightboxMedia.createdAt)}
                  >
                    {timeAgo(lightboxMedia.createdAt)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    ({formatFullDate(lightboxMedia.createdAt)})
                  </span>
                </div>
                {lightboxMedia.uploadedBy && (
                  <p className="text-xs text-slate-500 mt-1">
                    Uploaded by {lightboxMedia.uploadedBy}
                  </p>
                )}
                {lightboxMedia.note && (
                  <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
                    {lightboxMedia.note}
                  </p>
                )}
              </div>

              {lightboxMedia.mediaType === "VIDEO" &&
                lightboxMedia.mediaUrl && (
                  <a
                    href={lightboxMedia.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-3 p-2 rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
            </div>

            {/* Navigation */}
            {lightboxIndex > 0 && (
              <button
                type="button"
                onClick={() => goLightbox(-1)}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            {lightboxIndex < media.length - 1 && (
              <button
                type="button"
                onClick={() => goLightbox(1)}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION ───────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center">
              <div className="text-3xl mb-2">🗑️</div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Delete Media?
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-all text-sm"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 disabled:opacity-50 transition-all text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerMediaTab;
