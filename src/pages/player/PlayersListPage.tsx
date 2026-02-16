import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { playerService } from "../../api/playerService/playerService";
import {
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Send,
  MessageCircle,
  Mail,
  X,
  Info,
} from "lucide-react";
import { getImageUrl } from "../../utils/imageUrl";
import { toast } from "react-hot-toast";
import api from "../../api/axios";

type Player = {
  id: string;
  publicId: string;
  displayName: string;
  gender: string;
  batch: string;
  profession: string;
  phone?: string;
  joiningDate?: string;
  dob?: string;
  active: boolean;
  photoUrl?: string;
};

const ITEMS_PER_PAGE = 10;

// ─── AGE GROUP CALCULATION ───────────────────────────────

const AGE_GROUPS = [
  { label: "Under 12", value: "U-12", age: 12 },
  { label: "Under 14", value: "U-14", age: 14 },
  { label: "Under 16", value: "U-16", age: 16 },
  { label: "Under 19", value: "U-19", age: 19 },
  { label: "Under 23", value: "U-23", age: 23 },
];

function getSeasonYear(): number {
  const now = new Date();
  return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
}

function getPlayerAgeGroup(dob?: string): string | null {
  if (!dob) return null;
  const dobDate = new Date(dob);
  if (isNaN(dobDate.getTime())) return null;
  const seasonYear = getSeasonYear();

  for (const group of AGE_GROUPS) {
    const cutoff = new Date(seasonYear - group.age, 8, 1);
    if (dobDate >= cutoff) return group.value;
  }
  return "Senior";
}

function isEligibleForGroup(
  dob: string | undefined,
  groupValue: string,
): boolean {
  if (!dob) return false;
  const dobDate = new Date(dob);
  if (isNaN(dobDate.getTime())) return false;
  const seasonYear = getSeasonYear();
  const group = AGE_GROUPS.find((g) => g.value === groupValue);
  if (!group) return false;
  const cutoff = new Date(seasonYear - group.age, 8, 1);
  return dobDate >= cutoff;
}

// ─── SHARE MODAL COMPONENT ──────────────────────────────

type ShareModalProps = {
  isOpen: boolean;
  onClose: () => void;
  channel: "WHATSAPP" | "EMAIL";
  playerCount: number;
  filterLabel: string;
  playerPublicIds: string[];
};

function ShareModal({
  isOpen,
  onClose,
  channel,
  playerCount,
  filterLabel,
  playerPublicIds,
}: ShareModalProps) {
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const isWhatsApp = channel === "WHATSAPP";
  const placeholder = isWhatsApp
    ? "Enter WhatsApp number (e.g., 9876543210)"
    : "Enter email address";

  const handleSend = async () => {
    if (!recipient.trim()) {
      toast.error(isWhatsApp ? "Enter phone number" : "Enter email address");
      return;
    }

    setSending(true);
    try {
      const res = await api.post("/admin/players/share-list", {
        playerPublicIds,
        filterLabel,
        channel,
        recipientPhone: isWhatsApp ? recipient.trim() : null,
        recipientEmail: !isWhatsApp ? recipient.trim() : null,
      });

      if (res.data.sent) {
        toast.success(
          `Player list sent to ${playerCount} players via ${isWhatsApp ? "WhatsApp" : "Email"}`,
        );
        onClose();
      } else {
        toast.error("Failed to send. Check configuration.");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to send player list",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 rounded-t-xl ${
            isWhatsApp
              ? "bg-gradient-to-r from-green-500 to-green-600"
              : "bg-gradient-to-r from-blue-500 to-blue-600"
          }`}
        >
          <div className="flex items-center gap-2 text-white">
            {isWhatsApp ? <MessageCircle size={20} /> : <Mail size={20} />}
            <h3 className="font-bold">
              Send via {isWhatsApp ? "WhatsApp" : "Email"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            <p className="text-slate-600">
              Sending{" "}
              <span className="font-bold text-slate-900">
                {playerCount} players
              </span>
              {filterLabel && (
                <span className="text-slate-500"> — {filterLabel}</span>
              )}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">
              {isWhatsApp ? "WhatsApp Number" : "Email Address"}
            </label>
            <input
              type={isWhatsApp ? "tel" : "email"}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={placeholder}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            {isWhatsApp && (
              <p className="text-[11px] text-slate-400 mt-1">
                Indian numbers: 10 digits. International: include country code
                (e.g., +44...)
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className={`flex-1 py-2.5 text-sm font-medium text-white rounded-lg transition flex items-center justify-center gap-2 ${
                isWhatsApp
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-blue-600 hover:bg-blue-700"
              } disabled:opacity-50`}
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────

function PlayersListPage() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [professionFilter, setProfessionFilter] = useState<string>("all");
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [shareModal, setShareModal] = useState<{
    open: boolean;
    channel: "WHATSAPP" | "EMAIL";
  }>({ open: false, channel: "WHATSAPP" });
  const [showAgeGroupTooltip, setShowAgeGroupTooltip] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      const players = await playerService.getAllPlayers();
      setPlayers(players);
    } catch {
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const professions = Array.from(new Set(players.map((p) => p.profession)));

  // Apply filters
  const filteredPlayers = players.filter((p) => {
    const matchesSearch =
      p.displayName.toLowerCase().includes(search.toLowerCase()) ||
      p.publicId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && p.active) ||
      (statusFilter === "inactive" && !p.active);
    const matchesProfession =
      professionFilter === "all" || p.profession === professionFilter;
    const matchesAgeGroup =
      ageGroupFilter === "all" || isEligibleForGroup(p.dob, ageGroupFilter);

    return (
      matchesSearch && matchesStatus && matchesProfession && matchesAgeGroup
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPlayers = filteredPlayers.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, professionFilter, ageGroupFilter]);

  const ageGroupCounts = AGE_GROUPS.map((g) => ({
    ...g,
    count: players.filter((p) => isEligibleForGroup(p.dob, g.value)).length,
  }));

  // Build filter label for exports
  const getFilterLabel = (): string => {
    const parts: string[] = [];
    if (ageGroupFilter !== "all") {
      const g = AGE_GROUPS.find((g) => g.value === ageGroupFilter);
      if (g) parts.push(g.label);
    }
    if (statusFilter !== "all")
      parts.push(statusFilter === "active" ? "Active" : "Inactive");
    if (professionFilter !== "all") parts.push(professionFilter);
    if (search) parts.push(`Search: "${search}"`);
    return parts.length > 0 ? parts.join(" • ") : "All Players";
  };

  const getFilteredPublicIds = (): string[] =>
    filteredPlayers.map((p) => p.publicId);

  // Export handlers
  const handleExportExcel = async () => {
    setExportingExcel(true);
    setShowExportMenu(false);
    try {
      const res = await api.post(
        "/admin/players/export-excel",
        {
          playerPublicIds: getFilteredPublicIds(),
          filterLabel: getFilterLabel(),
        },
        { responseType: "blob" },
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `players-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Excel downloaded!");
    } catch {
      toast.error("Failed to export Excel");
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    setShowExportMenu(false);
    try {
      const res = await api.post(
        "/admin/players/export-pdf",
        {
          playerPublicIds: getFilteredPublicIds(),
          filterLabel: getFilterLabel(),
        },
        { responseType: "blob" },
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `players-${new Date().toISOString().slice(0, 10)}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded!");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  // Season year info for tooltip
  const seasonYear = getSeasonYear();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading players...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin")}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Players Management
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {filteredPlayers.length} player
                {filteredPlayers.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>

          {/* EXPORT & SHARE ACTIONS */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Export dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
              </button>

              {showExportMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-20 py-1">
                    <button
                      onClick={handleExportExcel}
                      disabled={exportingExcel}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                    >
                      <FileSpreadsheet size={16} className="text-green-600" />
                      {exportingExcel ? "Exporting..." : "Export as Excel"}
                    </button>
                    <button
                      onClick={handleExportPdf}
                      disabled={exportingPdf}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                    >
                      <FileText size={16} className="text-red-600" />
                      {exportingPdf ? "Exporting..." : "Export as PDF"}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* WhatsApp share */}
            <button
              onClick={() => setShareModal({ open: true, channel: "WHATSAPP" })}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition shadow-sm"
            >
              <MessageCircle size={16} />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Email share */}
            <button
              onClick={() => setShareModal({ open: true, channel: "EMAIL" })}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm"
            >
              <Mail size={16} />
              <span className="hidden sm:inline">Email</span>
            </button>
          </div>
        </div>

        {/* FILTERS & SEARCH */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              placeholder="Search by name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-3">
            {/* Status Filter */}
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Profession Filter */}
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                Type
              </label>
              <select
                value={professionFilter}
                onChange={(e) => setProfessionFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
              >
                <option value="all">All Types</option>
                {professions.map((prof) => (
                  <option key={prof} value={prof}>
                    {prof}
                  </option>
                ))}
              </select>
            </div>

            {/* Age Group Filter with Info tooltip */}
            <div className="flex-1 min-w-[140px]">
              <div className="flex items-center gap-1 mb-1.5">
                <label className="text-xs font-medium text-slate-600">
                  Age Group
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAgeGroupTooltip(!showAgeGroupTooltip)}
                    className="text-slate-400 hover:text-blue-600 transition"
                  >
                    <Info size={13} />
                  </button>

                  {showAgeGroupTooltip && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowAgeGroupTooltip(false)}
                      />
                      <div className="absolute left-0 bottom-full mb-2 w-72 bg-slate-800 text-white text-xs rounded-lg p-3 shadow-xl z-20">
                        <p className="font-bold mb-1.5">
                          🏏 Age Group Calculation
                        </p>
                        <p className="leading-relaxed mb-2">
                          Based on{" "}
                          <span className="font-semibold">BCCI/KSCA</span> rules
                          using{" "}
                          <span className="font-semibold">
                            September 1st cutoff
                          </span>
                          .
                        </p>
                        <p className="leading-relaxed mb-2">
                          Current season:{" "}
                          <span className="font-semibold text-blue-300">
                            {seasonYear}-{seasonYear + 1}
                          </span>
                        </p>
                        <div className="space-y-1 border-t border-slate-600 pt-2 mt-2">
                          {AGE_GROUPS.map((g) => {
                            const cutoffYear = seasonYear - g.age;
                            return (
                              <p key={g.value} className="flex justify-between">
                                <span className="font-medium">{g.label}:</span>
                                <span className="text-slate-300">
                                  Born on/after 1 Sep {cutoffYear}
                                </span>
                              </p>
                            );
                          })}
                        </div>
                        <div className="w-2 h-2 bg-slate-800 rotate-45 absolute -bottom-1 left-3" />
                      </div>
                    </>
                  )}
                </div>
              </div>
              <select
                value={ageGroupFilter}
                onChange={(e) => setAgeGroupFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
              >
                <option value="all">All Age Groups</option>
                {ageGroupCounts.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label} ({g.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters */}
            {(search ||
              statusFilter !== "all" ||
              professionFilter !== "all" ||
              ageGroupFilter !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setProfessionFilter("all");
                  setAgeGroupFilter("all");
                }}
                className="self-end px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* MOBILE CARDS */}
        <div className="md:hidden space-y-3">
          {paginatedPlayers.map((p) => {
            const ageGroup = getPlayerAgeGroup(p.dob);
            return (
              <div
                key={p.publicId}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-3 mb-3">
                  <div className="flex-shrink-0">
                    {p.photoUrl ? (
                      <img
                        src={getImageUrl(p.photoUrl) || undefined}
                        alt={p.displayName}
                        className="w-16 h-16 rounded-full object-cover border-2 border-slate-200"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling?.classList.remove(
                            "hidden",
                          );
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border-2 border-slate-200 ${
                        p.photoUrl ? "hidden" : ""
                      }`}
                    >
                      <span className="text-xl font-bold text-blue-600">
                        {p.displayName.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-lg truncate">
                          {p.displayName}
                        </p>
                        <p className="text-xs text-slate-500 font-mono mt-1">
                          {p.publicId}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            p.active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {p.active ? "Active" : "Inactive"}
                        </span>
                        {ageGroup && ageGroup !== "Senior" && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700">
                            {ageGroup}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Type:</span>
                    <span className="font-medium text-slate-900">
                      {p.profession}
                    </span>
                  </div>
                  {p.phone && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Phone:</span>
                      <span className="font-medium text-slate-900">
                        {p.phone}
                      </span>
                    </div>
                  )}
                  {p.joiningDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Joined:</span>
                      <span className="font-medium text-slate-900">
                        {new Date(p.joiningDate).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/admin/players/${p.publicId}`)}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all shadow-sm"
                >
                  View Details
                </button>
              </div>
            );
          })}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Photo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Player ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Age Group
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedPlayers.map((p) => {
                  const ageGroup = getPlayerAgeGroup(p.dob);
                  return (
                    <tr
                      key={p.publicId}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        {p.photoUrl ? (
                          <img
                            src={getImageUrl(p.photoUrl) || undefined}
                            alt={p.displayName}
                            className="w-10 h-10 rounded-full object-cover border-2 border-slate-200"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              e.currentTarget.nextElementSibling?.classList.remove(
                                "hidden",
                              );
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border-2 border-slate-200 ${
                            p.photoUrl ? "hidden" : ""
                          }`}
                        >
                          <span className="text-sm font-bold text-blue-600">
                            {p.displayName.charAt(0)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-slate-700">
                          {p.publicId}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-900">
                          {p.displayName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {ageGroup && ageGroup !== "Senior" ? (
                          <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            {ageGroup}
                          </span>
                        ) : ageGroup === "Senior" ? (
                          <span className="text-xs text-slate-500">Senior</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">
                          {p.profession}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">
                          {p.phone || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">
                          {p.joiningDate
                            ? new Date(p.joiningDate).toLocaleDateString(
                                "en-GB",
                              )
                            : "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            p.active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {p.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() =>
                            navigate(`/admin/players/${p.publicId}`)
                          }
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between bg-white rounded-xl shadow-sm border border-slate-200 px-4 sm:px-6 py-4 gap-3">
            <p className="text-sm text-slate-600">
              Showing {startIndex + 1} to{" "}
              {Math.min(startIndex + ITEMS_PER_PAGE, filteredPlayers.length)} of{" "}
              {filteredPlayers.length} players
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {filteredPlayers.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="text-slate-400 mb-4">
              <Search size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No players found
            </h3>
            <p className="text-slate-500 text-sm">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>

      {/* SHARE MODAL */}
      <ShareModal
        isOpen={shareModal.open}
        onClose={() => setShareModal({ ...shareModal, open: false })}
        channel={shareModal.channel}
        playerCount={filteredPlayers.length}
        filterLabel={getFilterLabel()}
        playerPublicIds={getFilteredPublicIds()}
      />
    </div>
  );
}

export default PlayersListPage;
