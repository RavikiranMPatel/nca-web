import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUp, ArrowDown, Eye, EyeOff, Layout } from "lucide-react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { homepageSectionService } from "../../api/homepageSectionService";
import { clubService } from "../../api/clubService";
import type { HomepageSection } from "../../types/club";

const SECTION_LABELS: Record<string, string> = {
  ABOUT: "About",
  FACILITIES: "Facilities",
  GALLERY: "Gallery",
  TESTIMONIALS: "Testimonials",
  NEWS: "News",
  TEAM: "Team",
  CLUB: "Club",
};

function HomepageSectionsPage() {
  const navigate = useNavigate();
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubExists, setClubExists] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [sectionData, clubPage] = await Promise.all([
        homepageSectionService.listAll(),
        clubService.listClubs(0, 1),
      ]);
      setSections(sectionData);
      setClubExists(clubPage.totalElements > 0);
    } catch {
      toast.error("Failed to load homepage sections");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleVisibility = async (section: HomepageSection) => {
    if (section.sectionType === "CLUB" && !clubExists && !section.visible) {
      toast.error("Create at least one Club before enabling the Club section");
      return;
    }
    const newVisible = !section.visible;
    // Optimistic update
    setSections((prev) =>
      prev.map((s) =>
        s.publicId === section.publicId ? { ...s, visible: newVisible } : s,
      ),
    );
    setSavingId(section.publicId);
    try {
      await homepageSectionService.setVisibility(section.publicId, newVisible);
    } catch {
      // Rollback
      setSections((prev) =>
        prev.map((s) =>
          s.publicId === section.publicId
            ? { ...s, visible: section.visible }
            : s,
        ),
      );
      toast.error("Failed to update visibility");
    } finally {
      setSavingId(null);
    }
  };

  const move = async (index: number, direction: "up" | "down") => {
    const next = [...sections];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const orderedIds = next.map((s) => s.publicId);
    // Optimistic update
    setSections(next);
    try {
      const updated = await homepageSectionService.reorder(orderedIds);
      setSections(updated);
    } catch {
      // Rollback
      setSections(sections);
      toast.error("Failed to reorder sections");
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-20">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm"
      >
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin/settings")}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Layout className="text-blue-600" size={24} />
                Homepage Sections
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">
                Control which sections appear on your public homepage and in what order
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        {sections.map((section, index) => {
          const isClubDisabled =
            section.sectionType === "CLUB" && !clubExists;
          const isSaving = savingId === section.publicId;

          return (
            <motion.div
              key={section.publicId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className={`bg-white rounded-xl border shadow-sm p-4 flex items-start gap-4 ${
                isClubDisabled ? "opacity-60" : ""
              } ${section.visible ? "border-slate-200" : "border-slate-100"}`}
            >
              {/* Order buttons */}
              <div className="flex flex-col gap-1 flex-shrink-0 pt-0.5">
                <button
                  onClick={() => move(index, "up")}
                  disabled={index === 0}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Move up"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  onClick={() => move(index, "down")}
                  disabled={index === sections.length - 1}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Move down"
                >
                  <ArrowDown size={14} />
                </button>
              </div>

              {/* Order badge */}
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">
                {section.displayOrder}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900">
                    {SECTION_LABELS[section.sectionType] ?? section.sectionType}
                  </span>
                  {section.visible ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                      Visible
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                      Hidden
                    </span>
                  )}
                  {isClubDisabled && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                      No clubs yet
                    </span>
                  )}
                </div>
                {isClubDisabled && (
                  <p className="text-xs text-amber-600 mt-0.5">
                    Add at least one Club before enabling this section
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-1.5">
                  Updated by {section.updatedBy} · {formatDate(section.updatedAt)}
                </p>
              </div>

              {/* Visibility toggle */}
              <button
                onClick={() => toggleVisibility(section)}
                disabled={isSaving || isClubDisabled}
                className={`flex-shrink-0 p-2 rounded-lg transition ${
                  isSaving
                    ? "opacity-50 cursor-not-allowed"
                    : isClubDisabled
                    ? "opacity-30 cursor-not-allowed"
                    : section.visible
                    ? "text-emerald-600 hover:bg-emerald-50"
                    : "text-slate-400 hover:bg-slate-100"
                }`}
                title={section.visible ? "Hide section" : "Show section"}
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : section.visible ? (
                  <Eye size={20} />
                ) : (
                  <EyeOff size={20} />
                )}
              </button>
            </motion.div>
          );
        })}

        {sections.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Layout size={40} className="mx-auto mb-3" />
            <p>No sections found</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default HomepageSectionsPage;
