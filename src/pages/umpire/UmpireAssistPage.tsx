import { useState, useRef, useEffect } from "react";

//const API_BASE = "https://cricket-api.ncamysuru.com";
const API_BASE = "http://localhost:8000";

const getPageImageUrl = (source: string, format: string | null, page: number) =>
  `${API_BASE}/api/page-image?source=${source}&format=${format || ""}&page=${page}`;

const getPageDownloadUrl = (
  source: string,
  format: string | null,
  page: number,
) =>
  `${API_BASE}/api/page-download?source=${source}&format=${format || ""}&page=${page}`;

// ─── Types ───────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  mode?: string;
}

interface CalcResult {
  [key: string]: string | number | boolean;
}

interface Source {
  source: string;
  format: string | null;
  page: number;
  heading?: string;
  preview: string;
  full_text: string;
}

// ─── PDF Viewer (Desktop right panel) ───────────────────────
interface PDFSource {
  source: string;
  format: string | null;
  page: number;
  heading?: string;
}

function PDFViewer({
  pdfSources,
  activeTab,
  onTabChange,
}: {
  pdfSources: PDFSource[];
  activeTab: number;
  onTabChange: (tab: number) => void;
}) {
  const [currentPages, setCurrentPages] = useState<Record<number, number>>({});
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const sourceConfig: Record<
    string,
    {
      emoji: string;
      label: string;
      color: string;
      bg: string;
    }
  > = {
    KSCA: {
      emoji: "🏏",
      label: "KSCA",
      color: "text-green-700",
      bg: "bg-green-50",
    },
    TomSmith: {
      emoji: "📚",
      label: "Tom Smith",
      color: "text-amber-700",
      bg: "bg-amber-50",
    },
    MCC: {
      emoji: "📖",
      label: "MCC",
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    ICC: {
      emoji: "🌍",
      label: "ICC",
      color: "text-purple-700",
      bg: "bg-purple-50",
    },
    BCCI: {
      emoji: "🏆",
      label: "BCCI",
      color: "text-orange-700",
      bg: "bg-orange-50",
    },
  };

  useEffect(() => {
    const pages: Record<number, number> = {};
    pdfSources.forEach((s, idx) => {
      pages[idx] = s.page;
    });
    setCurrentPages(pages);
    setImageError(false);
  }, [pdfSources]);

  useEffect(() => {
    setImageError(false);
    setImageLoading(false);
  }, [activeTab]);

  if (pdfSources.length === 0) return null;

  const currentSource = pdfSources[activeTab];
  if (!currentSource) return null;

  const currentPage = currentPages[activeTab] ?? currentSource.page;
  const cfg = sourceConfig[currentSource.source] || {
    emoji: "📄",
    label: currentSource.source,
    color: "text-gray-700",
    bg: "bg-gray-50",
  };

  const imageUrl = getPageImageUrl(
    currentSource.source,
    currentSource.format,
    currentPage,
  );
  const downloadUrl = getPageDownloadUrl(
    currentSource.source,
    currentSource.format,
    currentPage,
  );

  const setPage = (page: number) => {
    setCurrentPages((prev) => ({ ...prev, [activeTab]: page }));
    setImageError(false);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Tabs — only show if multiple sources */}
      {pdfSources.length > 1 && (
        <div className="flex border-b border-gray-200 flex-shrink-0">
          {pdfSources.map((s, idx) => {
            const tabCfg = sourceConfig[s.source] || {
              emoji: "📄",
              label: s.source,
              color: "text-gray-700",
              bg: "bg-gray-50",
            };
            const isActive = idx === activeTab;
            return (
              <button
                key={idx}
                onClick={() => onTabChange(idx)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5
                           text-xs font-semibold border-b-2 transition-all
                           ${
                             isActive
                               ? `border-blue-600 text-blue-700 ${tabCfg.bg}`
                               : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                           }`}
              >
                <span>{tabCfg.emoji}</span>
                <span>{tabCfg.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Source header */}
      <div
        className={`px-4 py-2 border-b border-gray-200 flex-shrink-0 ${cfg.bg}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{cfg.emoji}</span>
          <div className="min-w-0">
            <p className={`text-xs font-bold ${cfg.color}`}>
              {cfg.label}
              {currentSource.format ? ` · ${currentSource.format}` : ""}
            </p>
            {currentSource.heading && (
              <p className="text-xs text-gray-600 mt-0.5 leading-tight truncate">
                {currentSource.heading}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* PDF Image */}
      <div className="flex-1 overflow-y-auto bg-gray-100 relative">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
              <p className="text-xs text-gray-500">Loading page...</p>
            </div>
          </div>
        )}
        {imageError ? (
          <div className="flex items-center justify-center h-full p-8 text-center">
            <div>
              <p className="text-4xl mb-3">📄</p>
              <p className="text-sm text-gray-500">
                Could not load page {currentPage}
              </p>
              <button
                onClick={() => {
                  setImageError(false);
                  setImageLoading(false);
                }}
                className="mt-2 text-xs text-blue-500 underline"
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={`Page ${currentPage}`}
            className="w-full h-auto"
            onLoadStart={() => {
              setImageLoading(true);
              setImageError(false);
            }}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-2">
          <button
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5
                       bg-gray-100 hover:bg-gray-200 rounded-lg transition
                       disabled:opacity-30 disabled:cursor-not-allowed text-gray-700"
          >
            ◀ Prev
          </button>

          <div className="text-center">
            <span className="text-xs font-semibold text-gray-700">
              Page {currentPage}
            </span>
            {currentPage !== currentSource.page && (
              <button
                onClick={() => setPage(currentSource.page)}
                className="block text-[10px] text-blue-500 hover:underline mx-auto mt-0.5"
              >
                ↩ Back to source
              </button>
            )}
          </div>

          <button
            onClick={() => setPage(currentPage + 1)}
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5
                       bg-gray-100 hover:bg-gray-200 rounded-lg transition text-gray-700"
          >
            Next ▶
          </button>
        </div>

        {/* Download */}
        <a
          href={downloadUrl}
          download={`${currentSource.source}_page_${currentPage}.pdf`}
          className="flex items-center justify-center gap-2 mx-4 mb-3 py-2
                     bg-blue-600 hover:bg-blue-700 text-white text-xs
                     font-semibold rounded-xl transition"
        >
          ⬇ Download Page {currentPage}
        </a>
      </div>
    </div>
  );
}

// ─── PDF Viewer (Mobile inline) ──────────────────────────────
function MobilePDFViewer({ pdfSource }: { pdfSource: PDFSource | null }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    if (pdfSource) {
      setCurrentPage(pdfSource.page);
      setImageError(false);
    }
  }, [pdfSource?.source, pdfSource?.format, pdfSource?.page]);

  if (!pdfSource) return null;

  const imageUrl = getPageImageUrl(
    pdfSource.source,
    pdfSource.format,
    currentPage,
  );
  const downloadUrl = getPageDownloadUrl(
    pdfSource.source,
    pdfSource.format,
    currentPage,
  );

  return (
    <div className="mt-3 bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-700">
          📄 {pdfSource.source}
          {pdfSource.format ? ` · ${pdfSource.format}` : ""}
          {pdfSource.heading ? ` — ${pdfSource.heading}` : ""}
        </p>
      </div>

      {/* Image */}
      <div className="relative bg-gray-100 min-h-[200px] flex items-center justify-center">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
          </div>
        )}
        {imageError ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-400">Could not load page</p>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={`Page ${currentPage}`}
            className="w-full h-auto"
            onLoadStart={() => {
              setImageLoading(true);
              setImageError(false);
            }}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
          />
        )}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t border-gray-200">
        <button
          onClick={() => {
            setCurrentPage((p) => Math.max(1, p - 1));
            setImageError(false);
          }}
          disabled={currentPage <= 1}
          className="text-xs font-medium px-3 py-1.5 bg-white border border-gray-200
                     rounded-lg disabled:opacity-30 text-gray-700"
        >
          ◀ Prev
        </button>
        <div className="text-center">
          <span className="text-xs font-semibold text-gray-700">
            Page {currentPage}
          </span>
          {currentPage !== pdfSource.page && (
            <button
              onClick={() => setCurrentPage(pdfSource.page)}
              className="block text-[10px] text-blue-500 hover:underline mx-auto"
            >
              ↩ Source page
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setCurrentPage((p) => p + 1);
            setImageError(false);
          }}
          className="text-xs font-medium px-3 py-1.5 bg-white border border-gray-200
                     rounded-lg text-gray-700"
        >
          Next ▶
        </button>
      </div>

      {/* Download */}
      <a
        href={downloadUrl}
        download={`${pdfSource.source}_page_${currentPage}.pdf`}
        className="flex items-center justify-center gap-2 w-full py-2.5
                   bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
      >
        ⬇ Download Page {currentPage}
      </a>
    </div>
  );
}

function renderBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part,
  );
}

// ─── Chat Tab ────────────────────────────────────────────────
const QUICK_QUESTIONS = [
  "Bowler limit in KSCA PC2?",
  "What are new changes in KSCA 2026-27?",
  "Helmet penalty runs in KSCA?",
  "Minimum overs for KSCA PC2 match?",
  "Can substitute fielder keep wickets in KSCA?",
  "What is a Wide ball in KSCA?",
  "What does Tom Smith say about wide ball?",
  "Debate LBW with Tom Smith",
];

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hello! I'm your cricket laws assistant. Ask me anything about MCC Laws, ICC, BCCI or KSCA playing conditions.",
};

const STT_FIXES: [RegExp, string][] = [
  [/\bk\s*s\s*c\s*a\b/gi, "KSCA"],
  [/\b(ksea|kaska|kaska|casca|caska|kasca|cesca)\b/gi, "KSCA"],
  [/\bksrtc\s*(one|1)\b/gi, "KSCA PC1"],
  [/\bksrtc\s*(two|to|too|2)\b/gi, "KSCA PC2"],
  [/\bksrtc\s*(three|3)\b/gi, "KSCA PC3"],
  [/\bksrtc\s*(four|for|4)\b/gi, "KSCA PC4"],
  [/\bksrtc\b/gi, "KSCA"],
  [/\b(pc|peace)\s*(one|1)\b/gi, "PC1"],
  [/\b(pc|peace)\s*(two|to|too|2)\b/gi, "PC2"],
  [/\b(pc|peace)\s*(three|3)\b/gi, "PC3"],
  [/\b(pc|peace)\s*(four|for|4)\b/gi, "PC4"],
  [/\bm\s*c\s*c\b/gi, "MCC"],
  [/\bi\s*c\s*c\b/gi, "ICC"],
  [/\bb\s*c\s*c\s*i\b/gi, "BCCI"],
  [/\bf\s*(fifty|50)\b/gi, "F50"],
  [/\bt\s*(twenty|20)\b/gi, "T20"],
  [/\bv\s*j\s*d\b/gi, "VJD"],
  [/\bl\s*b\s*w\b/gi, "LBW"],
  [/\bno\s*bal+\b/gi, "no ball"],
];

function cleanTranscript(text: string): string {
  let out = text;
  for (const [pattern, replacement] of STT_FIXES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
  interface SpeechRecognition extends EventTarget {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
  }
}

function ChatTab() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [sttSupported, setSttSupported] = useState(true);
  const [sttLang, setSttLang] = useState<"en-IN" | "kn-IN">("en-IN");
  const [activePdfSources, setActivePdfSources] = useState<PDFSource[]>([]);
  const [activePdfTab, setActivePdfTab] = useState(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (question?: string) => {
    const q = question || input;
    if (!q.trim()) return;
    const userMessage: Message = { role: "user", content: q };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    const history = updatedMessages
      .slice(1)
      .slice(0, -1)
      .map((m) => ({ role: m.role, content: m.content }));
    try {
      const res = await fetch(`${API_BASE}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history }),
      });
      const data = await res.json();

      // Extract unique sources by source name for PDF viewer tabs
      if (data.sources && data.sources.length > 0) {
        const seen = new Set<string>();
        const uniqueSources: PDFSource[] = [];

        for (const s of data.sources) {
          const key = s.source;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueSources.push({
              source: s.source,
              format: s.format,
              page: s.page,
              heading: s.heading,
            });
          }
        }
        setActivePdfSources(uniqueSources);
        setActivePdfTab(0);
      } else {
        setActivePdfSources([]);
        setActivePdfTab(0);
      }

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          mode: data.mode,
        },
      ]);
    } catch {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "Sorry, I couldn't connect to the server. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyAnswer = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  const newConversation = () => {
    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setLoading(false);
    setActivePdfSources([]);
    setActivePdfTab(0);
  };

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setSttSupported(false);
  }, []);

  const toggleListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSttSupported(false);
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SR();
    recognition.lang = sttLang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((r: SpeechRecognitionResult) => r[0].transcript)
        .join("");
      setInput(cleanTranscript(transcript));
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setInput("");
    setListening(true);
    recognition.start();
  };

  const showChips = messages.length <= 1;
  const hasPdf = activePdfSources.length > 0;

  return (
    <div className="flex h-full transition-all duration-300">
      {/* ── LEFT: Chat Panel ── */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {messages.length > 1 && (
          <div className="flex justify-end px-4 pt-2 flex-shrink-0">
            <button
              onClick={newConversation}
              className="text-xs text-gray-500 hover:text-blue-600 border border-gray-200 rounded-full px-3 py-1 flex items-center gap-1"
            >
              ↻ New conversation
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 pb-2 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] ${msg.role === "user" ? "order-2" : "order-1"}`}
              >
                {/* Mode badge */}
                {msg.role === "assistant" && i > 0 && msg.mode && (
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    {msg.mode === "KSCA_PRECISE" && (
                      <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        🎯 KSCA Precise
                      </span>
                    )}
                    {msg.mode === "DEBATE" && (
                      <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        ⚖️ Tom Smith Debate
                      </span>
                    )}
                    {msg.mode === "GENERAL" && (
                      <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        🌐 General
                      </span>
                    )}
                  </div>
                )}

                {/* Message bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
                  }`}
                >
                  {msg.role === "user" ? (
                    msg.content
                  ) : (
                    <div className="space-y-1 whitespace-normal">
                      {msg.content.split("\n").map((line, j) => {
                        const trimmed = line.trim();
                        if (!trimmed) return null;
                        if (trimmed.startsWith("- ")) {
                          return (
                            <div key={j} className="flex gap-2">
                              <span className="mt-0.5 text-blue-500">•</span>
                              <span>{renderBold(trimmed.slice(2))}</span>
                            </div>
                          );
                        }
                        return <p key={j}>{renderBold(trimmed)}</p>;
                      })}

                      {/* Mobile PDF viewer — inline below answer */}
                      {msg.role === "assistant" &&
                        i > 0 &&
                        msg.sources &&
                        msg.sources.length > 0 && (
                          <div className="md:hidden mt-2 space-y-2">
                            {(() => {
                              const seen = new Set<string>();
                              const unique: Source[] = [];
                              for (const s of msg.sources) {
                                if (!seen.has(s.source)) {
                                  seen.add(s.source);
                                  unique.push(s);
                                }
                              }
                              return unique.map((s, idx) => (
                                <MobilePDFViewer
                                  key={idx}
                                  pdfSource={{
                                    source: s.source,
                                    format: s.format,
                                    page: s.page,
                                    heading: s.heading,
                                  }}
                                />
                              ));
                            })()}
                          </div>
                        )}
                    </div>
                  )}
                </div>

                {/* Copy button */}
                {msg.role === "assistant" && i > 0 && (
                  <button
                    onClick={() => copyAnswer(msg.content, i)}
                    className="mt-1 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-1"
                  >
                    {copied === i ? (
                      <span className="text-green-500">✓ Copied!</span>
                    ) : (
                      <span>📋 Copy answer</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick chips */}
        {showChips && (
          <div className="px-4 pb-2 flex-shrink-0">
            <p className="text-xs text-gray-400 mb-2">Quick questions:</p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  disabled={loading}
                  className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1.5 hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-200 p-4 pb-safe bg-white flex-shrink-0 pb-6 sm:pb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
              placeholder={
                listening
                  ? "Listening…"
                  : "Ask about KSCA, MCC, ICC or BCCI rules..."
              }
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {sttSupported && (
              <button
                onClick={toggleListening}
                disabled={loading}
                title="Speak your question"
                className={`px-3 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 ${
                  listening
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {listening ? "■" : "🎤"}
              </button>
            )}
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
            >
              Send
            </button>
          </div>
          <div className="flex items-center justify-center gap-3 mt-2">
            <p className="text-xs text-gray-400">
              Tip: tap 🎤 to speak — works best on Chrome
            </p>
            {sttSupported && (
              <div className="flex gap-1">
                <button
                  onClick={() => setSttLang("en-IN")}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition ${
                    sttLang === "en-IN"
                      ? "bg-blue-50 text-blue-600 border-blue-200"
                      : "text-gray-400 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setSttLang("kn-IN")}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition ${
                    sttLang === "kn-IN"
                      ? "bg-blue-50 text-blue-600 border-blue-200"
                      : "text-gray-400 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  ಕನ್ನಡ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Desktop PDF Viewer ── */}
      <div
        className={`hidden md:flex flex-col border-l border-gray-200 flex-shrink-0
                    transition-all duration-300 overflow-hidden
                    ${hasPdf ? "w-[420px]" : "w-0 border-0"}`}
      >
        {hasPdf && (
          <PDFViewer
            pdfSources={activePdfSources}
            activeTab={activePdfTab}
            onTabChange={setActivePdfTab}
          />
        )}
      </div>
    </div>
  );
}

// ─── Net Run Ratio Tab ────────────────────────────────────────
function NetRunRateTab() {
  const [teamAName, setTeamAName] = useState("Team 1");
  const [teamBName, setTeamBName] = useState("Team 2");
  const [teamAScore, setTeamAScore] = useState("");
  const [teamBScore, setTeamBScore] = useState("");
  const [chaseResult, setChaseResult] = useState<"win" | "loss">("loss");
  const [vjdPar, setVjdPar] = useState("");
  const [result, setResult] = useState<null | {
    parScoreB: number;
    rrrA: number;
    rrrB: number;
  }>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    setError("");
    setResult(null);
    const a = parseFloat(teamAScore);
    const b = parseFloat(teamBScore);
    if (isNaN(a) || a <= 0) {
      setError("Enter a valid score for the team batting first.");
      return;
    }
    if (isNaN(b) || b < 0) {
      setError("Enter a valid score for the chasing team.");
      return;
    }
    let parScoreB: number;
    if (chaseResult === "win") {
      const par = parseFloat(vjdPar);
      if (isNaN(par) || par <= 0) {
        setError(
          "Chasing team won — enter the VJD par score (from the KSCA VJD app) for their overs faced and wickets lost.",
        );
        return;
      }
      parScoreB = par;
    } else {
      parScoreB = a;
    }
    const rrrA = 1 - b / parScoreB;
    setResult({ parScoreB, rrrA, rrrB: -1 * rrrA });
  };

  const reset = () => {
    setTeamAScore("");
    setTeamBScore("");
    setVjdPar("");
    setChaseResult("loss");
    setResult(null);
    setError("");
  };
  const fmt = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(3);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Relative Run Ratio (RRR)
          </h3>
          <p className="text-sm text-gray-500">
            KSCA tie-breaker. Computes each team's RRR for one match. Sum a
            team's RRR across all tournament matches to get its Net RRR (NRRR).
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Team batting first
            </label>
            <input
              value={teamAName}
              onChange={(e) => setTeamAName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Chasing team
            </label>
            <input
              value={teamBName}
              onChange={(e) => setTeamBName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {teamAName || "Team 1"} score{" "}
              <span className="text-gray-400">(final / revised par)</span>
            </label>
            <input
              type="number"
              value={teamAScore}
              onChange={(e) => setTeamAScore(e.target.value)}
              placeholder="e.g. 278"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {teamBName || "Team 2"} actual score
            </label>
            <input
              type="number"
              value={teamBScore}
              onChange={(e) => setTeamBScore(e.target.value)}
              placeholder="e.g. 281"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Did the chasing team win?
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setChaseResult("loss")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border ${chaseResult === "loss" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"}`}
            >
              Lost / Tied
            </button>
            <button
              onClick={() => setChaseResult("win")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border ${chaseResult === "win" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"}`}
            >
              Won
            </button>
          </div>
        </div>
        {chaseResult === "win" && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <label className="block text-xs font-medium text-amber-800 mb-1">
              VJD par score for {teamBName || "chasing team"}
            </label>
            <input
              type="number"
              value={vjdPar}
              onChange={(e) => setVjdPar(e.target.value)}
              placeholder="e.g. 219"
              className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-xs text-amber-700 mt-1">
              Get this from the official KSCA VJD app — the par score for the
              overs faced and wickets lost when they passed the target.
            </p>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={calculate}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            Calculate RRR
          </button>
          <button
            onClick={reset}
            className="px-4 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            Reset
          </button>
        </div>
      </div>
      {result && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mt-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">Result</h4>
          <div className="text-sm text-gray-600">
            Par score for {teamBName || "chasing team"}:{" "}
            <span className="font-semibold text-gray-900">
              {result.parScoreB}
            </span>
            {chaseResult === "loss" && (
              <span className="text-gray-400">
                {" "}
                (= {teamAName || "Team 1"} score)
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500">
                {teamAName || "Team 1"}
              </div>
              <div
                className={`text-2xl font-bold ${result.rrrA >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {fmt(result.rrrA)}
              </div>
              <div className="text-[11px] text-gray-400">RRR this match</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500">
                {teamBName || "Team 2"}
              </div>
              <div
                className={`text-2xl font-bold ${result.rrrB >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {fmt(result.rrrB)}
              </div>
              <div className="text-[11px] text-gray-400">RRR this match</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
            <span className="font-medium text-gray-700">Formula:</span> RRR
            (batting first) = 1 − (chasing score ÷ par score) = 1 − (
            {teamBScore} ÷ {result.parScoreB}) = {fmt(result.rrrA)}. The other
            team's RRR is its negative. A team's <b>NRRR</b> is the sum of its
            RRR across all tournament matches.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Playing Conditions Config ────────────────────────────────
const PC_CONFIG: Record<
  string,
  {
    label: string;
    Z: number;
    X: number;
    maxOvers: number;
    minOvers: number;
    interval: number;
    bowlerDivisor: number;
    isT20: boolean;
  }
> = {
  PC2_F50_MENS: {
    label: "PC2 — F50 50 overs (Men's)",
    Z: 420,
    X: 4.2,
    maxOvers: 50,
    minOvers: 20,
    interval: 45,
    bowlerDivisor: 5,
    isT20: false,
  },
  PC2_F50_WOMENS: {
    label: "PC2 — F50 50 overs (Women's)",
    Z: 380,
    X: 3.8,
    maxOvers: 50,
    minOvers: 20,
    interval: 45,
    bowlerDivisor: 5,
    isT20: false,
  },
  PC3_30_BOYS: {
    label: "PC3 — 30 overs (Boys)",
    Z: 240,
    X: 4.0,
    maxOvers: 30,
    minOvers: 12,
    interval: 10,
    bowlerDivisor: 5,
    isT20: false,
  },
  PC3_30_GIRLS: {
    label: "PC3 — 30 overs (Girls)",
    Z: 228,
    X: 3.8,
    maxOvers: 30,
    minOvers: 12,
    interval: 10,
    bowlerDivisor: 5,
    isT20: false,
  },
  PC4_T20_MENS: {
    label: "PC4 — T20 20 overs (Men's)",
    Z: 170,
    X: 4.25,
    maxOvers: 20,
    minOvers: 5,
    interval: 20,
    bowlerDivisor: 5,
    isT20: true,
  },
  PC4_T20_WOMENS: {
    label: "PC4 — T20 20 overs (Women's)",
    Z: 150,
    X: 3.75,
    maxOvers: 20,
    minOvers: 5,
    interval: 20,
    bowlerDivisor: 5,
    isT20: true,
  },
};

// ─── Time Helpers ─────────────────────────────────────────────
function toMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function toTime(m: number): string {
  const h = Math.floor(m / 60);
  const mins = Math.round(m % 60);
  return `${String(h).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function toTime12(m: number): string {
  const totalMins = ((m % 1440) + 1440) % 1440;
  let h = Math.floor(totalMins / 60);
  const mins = Math.round(totalMins % 60);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(mins).padStart(2, "0")} ${period}`;
}

function to12Hour(time24: string): string {
  if (!time24 || !time24.includes(":")) return time24;
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${period}`;
}

function bowlerDist(I: number, divisor: number = 5): number[] {
  const base = Math.floor(I / divisor);
  const extra = I % divisor;
  return Array.from({ length: divisor }, (_, i) =>
    i < extra ? base + 1 : base,
  );
}

// ─── Powerplay helper ─────────────────────────────────────────
function calcPP(I: number, maxOvers: number, isT20: boolean) {
  if (isT20) {
    const pp = Math.ceil((I * 6) / maxOvers);
    return { pp, npp: I - pp };
  }
  const pp1 = Math.ceil((I * 10) / maxOvers);
  const pp2 = Math.round((I * 30) / maxOvers);
  const pp3 = I - pp1 - pp2;
  return { pp1, pp2, pp3: Math.max(0, pp3) };
}

function summarizeBowlerDist(
  dist: number[],
): { count: number; overs: number; total: number }[] {
  const counts = new Map<number, number>();
  for (const overs of dist) {
    counts.set(overs, (counts.get(overs) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([overs, count]) => ({ count, overs, total: count * overs }));
}

// ─── Shared UI primitives ─────────────────────────────────────
const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const labelCls =
  "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

function FormRow({
  rowId,
  description,
  value,
  computed,
  highlight,
  children,
}: {
  rowId: string;
  description: string;
  value?: string | number;
  computed?: boolean;
  highlight?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <tr className={`border-b border-gray-100 ${highlight ? "bg-blue-50" : ""}`}>
      <td className="py-2 px-3 text-xs font-bold text-blue-700 w-8 align-middle">
        ({rowId})
      </td>
      <td className="py-2 px-3 text-sm text-gray-700 align-middle">
        {description}
      </td>
      <td className="py-2 px-3 w-36 align-middle">
        {computed ? (
          <div
            className={`text-right font-mono text-sm px-2 py-1 rounded ${highlight ? "font-bold text-blue-700 text-base" : "text-gray-800"}`}
          >
            {value ?? "—"}
          </div>
        ) : (
          children
        )}
      </td>
    </tr>
  );
}

function TimeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  );
}

function NumInput({
  value,
  onChange,
  placeholder,
  min,
}: {
  value: string | number;
  onChange: (v: number) => void;
  placeholder?: string;
  min?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min ?? 0}
      placeholder={placeholder}
      onChange={(e) => onChange(Number(e.target.value))}
      className={inputCls}
    />
  );
}

function SignedNumInput({
  value,
  onChange,
  placeholder,
}: {
  value: string | number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(String(value ?? ""));

  useEffect(() => {
    setText(String(value ?? ""));
  }, [value]);

  const handleChange = (raw: string) => {
    if (raw === "" || raw === "-" || /^-?\d+$/.test(raw)) {
      setText(raw);
      if (raw !== "" && raw !== "-") onChange(Number(raw));
      else if (raw === "") onChange(0);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => {
          const n = (Number(text) || 0) - 1;
          setText(String(n));
          onChange(n);
        }}
        className="px-2 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="-?[0-9]*"
        value={text}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value)}
        className={inputCls + " text-center"}
      />
      <button
        type="button"
        onClick={() => {
          const n = (Number(text) || 0) + 1;
          setText(String(n));
          onChange(n);
        }}
        className="px-2 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
      >
        +
      </button>
    </div>
  );
}

function PPBadges({
  I,
  maxOvers,
  isT20,
}: {
  I: number;
  maxOvers: number;
  isT20: boolean;
}) {
  const pp = calcPP(I, maxOvers, isT20);
  if (isT20) {
    return (
      <div className="flex gap-2 text-xs">
        <span className="bg-green-100 text-green-800 rounded px-2 py-0.5 font-semibold">
          PP {(pp as { pp: number; npp: number }).pp} overs
        </span>
        <span className="bg-gray-100 text-gray-700 rounded px-2 py-0.5 font-semibold">
          NPP {(pp as { pp: number; npp: number }).npp} overs
        </span>
      </div>
    );
  }
  const { pp1, pp2, pp3 } = pp as { pp1: number; pp2: number; pp3: number };
  return (
    <div className="flex gap-2 text-xs flex-wrap">
      <span className="bg-green-100 text-green-800 rounded px-2 py-0.5 font-semibold">
        PP1 {pp1}
      </span>
      <span className="bg-yellow-100 text-yellow-800 rounded px-2 py-0.5 font-semibold">
        PP2 {pp2}
      </span>
      <span className="bg-orange-100 text-orange-800 rounded px-2 py-0.5 font-semibold">
        PP3 {pp3}
      </span>
    </div>
  );
}

// ─── TABLE 1 ─────────────────────────────────────────────────
function Table1({ pcKey }: { pcKey: string }) {
  const pc = PC_CONFIG[pcKey];
  const [B, setB] = useState("");
  const [C, setC] = useState("");
  const [D, setD] = useState(0);
  const [E, setE] = useState(0);
  const [mOverride, setMOverride] = useState<string | null>(null);
  const [J, setJ] = useState("");
  const [result, setResult] = useState<Record<string, string | number> | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setResult(null);
    setMOverride(null);
  }, [pcKey]);

  // Live computed values for rows that show before Calculate is pressed
  const Cv = parseInt(C) || 0;
  const Fv_live = Math.max(0, Cv - (D + E));
  const Gv_live = Math.max(0, pc.Z - Fv_live);
  const Hv_live = parseFloat((Gv_live / pc.X).toFixed(2));
  const Iv_live = Math.min(Math.ceil(Hv_live / 2), pc.maxOvers);
  const Kv_live = Math.ceil(Iv_live * pc.X);
  const hasBC = B !== "" && C !== "";
  const autoM = pc.interval - E;
  const effectiveM = mOverride !== null ? Number(mOverride) : autoM;

  const calculate = () => {
    const Bv = parseInt(B) || 0;
    const Fv = Math.max(0, Cv - (D + E));
    const Gv = Math.max(0, pc.Z - Fv);
    const Hv = parseFloat((Gv / pc.X).toFixed(2));
    let Iv = Math.min(Math.ceil(Hv / 2), pc.maxOvers);
    const Jm = toMins(J);
    const Kv = () => Math.ceil(Iv * pc.X);
    const Lv = () => Jm + Math.max(0, Kv() - Bv);
    const Mv = effectiveM;
    const Nv = () => Lv() + Mv;
    const Ov = () => Nv() + Kv();
    const scheduledClose = Jm + (pc.Z - Bv) + Mv - Fv;
    const origI = Iv;
    while (Ov() < scheduledClose && Iv < pc.maxOvers) Iv += 1;
    setResult({
      A: pc.Z,
      B: Bv,
      C: Cv,
      D,
      E,
      F: Fv,
      G: Gv,
      H: Hv,
      I: Iv,
      origI,
      bowlerLimit: Math.ceil(Iv / pc.bowlerDivisor),
      J,
      K: Kv(),
      L: toTime(Lv()),
      M: Mv,
      N: toTime(Nv()),
      O: toTime(Ov()),
      valid: Iv >= pc.minOvers ? 1 : 0,
      adjusted: Iv > origI ? 1 : 0,
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-xs text-blue-800">
        <strong>Table 1</strong> — Calculation sheet for use when a delay or
        interruption occurs in the <strong>First Innings</strong>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-2 px-3 text-left text-xs font-bold text-gray-500 w-8">
                Row
              </th>
              <th className="py-2 px-3 text-left text-xs font-bold text-gray-500">
                Description
              </th>
              <th className="py-2 px-3 text-left text-xs font-bold text-gray-500 w-36">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {/* FIX 1: Row A — exact PDF wording, no "(Z)" suffix */}
            <FormRow
              rowId="A"
              description="Net playing time available at start of the match"
              computed
              value={`${pc.Z} mins`}
            />

            {/* FIX 2: Row B — exact PDF wording, no extra hint */}
            <FormRow rowId="B" description="Time innings in progress">
              <NumInput
                value={B}
                onChange={(v) => setB(String(v))}
                placeholder="e.g. 73"
              />
            </FormRow>

            {/* FIX 3: Row C — exact PDF wording, no "(mins)" */}
            <FormRow rowId="C" description="Playing time lost">
              <NumInput
                value={C}
                onChange={(v) => setC(String(v))}
                placeholder="e.g. 57"
              />
            </FormRow>

            {/* FIX 4: Row D — exact PDF wording, no "(mins)" */}
            <FormRow rowId="D" description="Extra time available">
              <NumInput value={D} onChange={(v) => setD(v)} placeholder="0" />
            </FormRow>

            {/* FIX 5: Row E — exact PDF wording, no "(mins)" */}
            <FormRow rowId="E" description="Time made up from reduced interval">
              <SignedNumInput
                value={E}
                onChange={(v) => setE(v)}
                placeholder="0"
              />
            </FormRow>

            <FormRow
              rowId="F"
              description="Effective playing time lost [C – (D + E)]"
              computed
              value={hasBC ? `${Fv_live} mins` : "—"}
            />
            <FormRow
              rowId="G"
              description="Remaining playing time available (A - F)"
              computed
              value={hasBC ? `${Gv_live} mins` : "—"}
            />

            {/* FIX 6: Row H — "X" not pc.X value */}
            <FormRow
              rowId="H"
              description="G divided by X (to 2 decimal places)"
              computed
              value={hasBC ? Hv_live : "—"}
            />

            <FormRow
              rowId="I"
              description="Max overs per team [H/2] (round up fractions)"
              computed
              highlight
              value={hasBC ? `${Iv_live} overs` : "—"}
            />
            <tr className="border-b border-gray-100">
              <td className="py-2 px-3 text-xs font-bold text-blue-700 align-middle">
                (—)
              </td>
              <td className="py-2 px-3 text-sm text-gray-700 align-middle">
                Maximum overs per bowler [I / 5]
              </td>
              <td className="py-2 px-3 align-middle">
                {hasBC ? (
                  <div className="flex gap-1 flex-wrap justify-end">
                    {bowlerDist(Iv_live).map((n, i) => (
                      <span
                        key={i}
                        className="bg-gray-100 text-gray-800 rounded px-1.5 py-0.5 text-xs font-mono font-semibold"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-right font-mono text-sm text-gray-800">
                    —
                  </span>
                )}
              </td>
            </tr>

            <tr className="border-b border-gray-100 bg-green-50">
              <td className="py-2 px-3 text-xs font-bold text-green-700 align-middle">
                PP
              </td>
              <td className="py-2 px-3 text-sm text-gray-700 align-middle">
                Duration of Powerplay Overs (initial, batting side)
              </td>
              <td className="py-2 px-3 align-middle">
                {hasBC ? (
                  <PPBadges
                    I={Iv_live}
                    maxOvers={pc.maxOvers}
                    isT20={pc.isT20}
                  />
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </td>
            </tr>

            <tr className="bg-gray-100">
              <td
                colSpan={3}
                className="py-1.5 px-3 text-xs font-bold text-gray-600 uppercase tracking-wide"
              >
                Rescheduled Playing Hours
              </td>
            </tr>

            {/* FIX 7: Row J — exact PDF wording, no "(time)" */}
            <FormRow
              rowId="J"
              description="First session to commence or recommence"
            >
              <TimeInput value={J} onChange={setJ} />
            </FormRow>

            {/* FIX 8: Row K — "I x X" not "I × pc.X" */}
            <FormRow
              rowId="K"
              description="Length of innings [I x X] (round up fractions)"
              computed
              value={hasBC && J ? `${Kv_live} mins` : "—"}
            />
            <FormRow
              rowId="L"
              description="Rescheduled first innings cessation time [J + (K – B)]"
              computed
              highlight
              value={result ? (result.L as string) : "—"}
            />

            {/* FIX 9: Row M — auto-calculates from pc.interval − E; user can override */}
            <FormRow rowId="M" description="Length of interval">
              <NumInput
                value={mOverride !== null ? mOverride : autoM}
                onChange={(v) => setMOverride(String(v))}
                placeholder={`${autoM}`}
              />
            </FormRow>

            <FormRow
              rowId="N"
              description="Second innings commencement time [L + M]"
              computed
              highlight
              value={result ? (result.N as string) : "—"}
            />
            <FormRow
              rowId="O"
              description="Rescheduled second innings cessation time [N + K]"
              computed
              highlight
              value={result ? (result.O as string) : "—"}
            />
          </tbody>
        </table>
      </div>

      <button
        onClick={calculate}
        disabled={B === "" || C === "" || J === ""}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-40 transition"
      >
        Calculate
      </button>

      {result && (
        <div
          className={`rounded-xl p-4 ${result.valid ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">{pc.label}</p>
            <button
              onClick={() => {
                const overs = result.I as number;
                const dist = summarizeBowlerDist(bowlerDist(overs));
                const _pp = calcPP(overs, pc.maxOvers, pc.isT20);
                const ppLines: string[] = [];
                if (pc.isT20) {
                  const { pp: ppOv, npp } = _pp as { pp: number; npp: number };
                  ppLines.push(`  Powerplay: overs 1–${ppOv}`);
                  if (npp > 0)
                    ppLines.push(`  Non-powerplay: overs ${ppOv + 1}–${overs}`);
                } else {
                  const { pp1, pp2, pp3 } = _pp as {
                    pp1: number;
                    pp2: number;
                    pp3: number;
                  };
                  ppLines.push(`  PP1: overs 1–${pp1}`);
                  if (pp2 > 0)
                    ppLines.push(`  PP2: overs ${pp1 + 1}–${pp1 + pp2}`);
                  if (pp3 > 0)
                    ppLines.push(
                      `  PP3: overs ${pp1 + pp2 + 1}–${pp1 + pp2 + pp3}`,
                    );
                }
                navigator.clipboard.writeText(
                  [
                    `MATCH SUMMARY — ${pc.label}`,
                    `Overs per team: ${overs}`,
                    `1st inn ends: ${to12Hour(result.L as string)}`,
                    `2nd inn starts: ${to12Hour(result.N as string)}`,
                    `Match ends: ${to12Hour(result.O as string)}`,
                    ``,
                    `Bowler limit:`,
                    ...dist.map(
                      (g) =>
                        `  ${g.count} bowler${g.count > 1 ? "s" : ""} × ${g.overs} over${g.overs > 1 ? "s" : ""} = ${g.total} overs`,
                    ),
                    ``,
                    `Powerplays:`,
                    ...ppLines,
                  ].join("\n"),
                );
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
            >
              {copied ? "✓ Copied" : "📋 Copy"}
            </button>
          </div>
          <p className="text-6xl font-black text-gray-900 text-center">
            {result.I}
          </p>
          <p className="text-sm text-gray-500 mt-1 text-center">
            overs per team
          </p>
          {result.adjusted ? (
            <p className="text-xs text-amber-600 mt-1 text-center">
              ↑ Raised from {result.origI} (Clause 13.7.2)
            </p>
          ) : null}
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-1 text-sm text-left">
            <p className="font-semibold text-gray-700 mb-1">Bowler limit:</p>
            {summarizeBowlerDist(bowlerDist(result.I as number)).map((g, i) => (
              <p key={i} className="text-gray-700 pl-2">
                {g.count} bowler{g.count > 1 ? "s" : ""} × {g.overs} over
                {g.overs > 1 ? "s" : ""} = {g.total} overs
              </p>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-1 text-sm">
            <p className="text-gray-700">
              1st inn ends:{" "}
              <b className="text-gray-900">{to12Hour(result.L as string)}</b>
            </p>
            <p className="text-gray-700">
              2nd inn starts:{" "}
              <b className="text-gray-900">{to12Hour(result.N as string)}</b>
            </p>
            <p className="text-gray-700">
              Match ends:{" "}
              <b className="text-gray-900">{to12Hour(result.O as string)}</b>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-1.5">
            <p className="font-semibold text-gray-700 text-sm mb-1">
              Powerplays:
            </p>
            {(() => {
              const I = result.I as number;
              const pp = calcPP(I, pc.maxOvers, pc.isT20);
              if (pc.isT20) {
                const { pp: ppOvers, npp } = pp as { pp: number; npp: number };
                return (
                  <>
                    <div className="flex items-center gap-2 pl-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                        Powerplay
                      </span>
                      <span className="font-mono text-sm text-gray-800">
                        overs 1–{ppOvers}
                      </span>
                    </div>
                    {npp > 0 && (
                      <div className="flex items-center gap-2 pl-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          Non-powerplay
                        </span>
                        <span className="font-mono text-sm text-gray-800">
                          overs {ppOvers + 1}–{I}
                        </span>
                      </div>
                    )}
                  </>
                );
              }
              const { pp1, pp2, pp3 } = pp as {
                pp1: number;
                pp2: number;
                pp3: number;
              };
              const pp1End = pp1;
              const pp2End = pp1 + pp2;
              const pp3End = pp1 + pp2 + pp3;
              return (
                <>
                  <div className="flex items-center gap-2 pl-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                      PP1
                    </span>
                    <span className="font-mono text-sm text-gray-800">
                      overs 1–{pp1End}
                    </span>
                  </div>
                  {pp2 > 0 && (
                    <div className="flex items-center gap-2 pl-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                        PP2
                      </span>
                      <span className="font-mono text-sm text-gray-800">
                        overs {pp1End + 1}–{pp2End}
                      </span>
                    </div>
                  )}
                  {pp3 > 0 && (
                    <div className="flex items-center gap-2 pl-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                        PP3
                      </span>
                      <span className="font-mono text-sm text-gray-800">
                        overs {pp2End + 1}–{pp3End}
                      </span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          <p
            className={`text-sm font-semibold mt-4 pt-3 border-t border-gray-200 text-center ${result.valid ? "text-green-700" : "text-red-700"}`}
          >
            {result.valid
              ? `✅ Match valid (min ${pc.minOvers} overs)`
              : `❌ Below minimum ${pc.minOvers} overs — No result`}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── TABLE 2 ─────────────────────────────────────────────────
function Table2({ pcKey }: { pcKey: string }) {
  const pc = PC_CONFIG[pcKey];
  const [P, setP] = useState("");
  const [Q, setQ] = useState("");
  const [T, setT] = useState("");
  const [result, setResult] = useState<Record<
    string,
    string | number | boolean
  > | null>(null);

  const Rv_live = P && Q ? Math.max(0, toMins(Q) - toMins(P)) : null;
  const Sv_live =
    Rv_live !== null && Rv_live > 0
      ? Math.ceil(Rv_live / pc.X)
      : Rv_live !== null
        ? 0
        : null;

  const calculate = () => {
    const Pm = toMins(P);
    const Qm = toMins(Q);
    const Rv = Math.max(0, Qm - Pm);
    const Sv = Rv > 0 ? Math.ceil(Rv / pc.X) : 0;
    const Tv = parseInt(T);
    setResult({
      P: toTime(Pm),
      Q: toTime(Qm),
      R: Rv,
      S: Sv,
      T: Tv,
      terminated: Sv <= Tv,
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 text-xs text-orange-800">
        <strong>Table 2</strong> — Calculation sheet to check whether an
        interruption during the <strong>First Innings</strong> should terminate
        the innings
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-2 px-3 text-left text-xs font-bold text-gray-500 w-8">
                Row
              </th>
              <th className="py-2 px-3 text-left text-xs font-bold text-gray-500">
                Description
              </th>
              <th className="py-2 px-3 text-left text-xs font-bold text-gray-500 w-36">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            <FormRow rowId="P" description="Proposed re-start time">
              <TimeInput value={P} onChange={setP} />
            </FormRow>
            <FormRow
              rowId="Q"
              description="Rescheduled cut-off time allowing for full use of any extra time provision"
            >
              <TimeInput value={Q} onChange={setQ} />
            </FormRow>
            <FormRow
              rowId="R"
              description="Minutes between P and Q"
              computed
              value={Rv_live !== null ? `${Rv_live} mins` : "—"}
            />
            {/* FIX 10: Row S — "R / X" not "R / pc.X" */}
            <FormRow
              rowId="S"
              description="Potential overs to be bowled [R / X] (round up fractions)"
              computed
              highlight
              value={Sv_live !== null ? `${Sv_live} overs` : "—"}
            />
            <FormRow
              rowId="T"
              description="Number of complete overs faced to date in first innings"
            >
              <NumInput
                value={T}
                onChange={(v) => setT(String(v))}
                placeholder="e.g. 25"
              />
            </FormRow>
          </tbody>
        </table>
      </div>
      <button
        onClick={calculate}
        disabled={!P || !Q || !T}
        className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 disabled:opacity-40 transition"
      >
        Check Termination
      </button>
      {result && (
        <div
          className={`rounded-xl p-4 text-center ${result.terminated ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}
        >
          <p
            className={`text-xl font-bold ${result.terminated ? "text-red-700" : "text-green-700"}`}
          >
            {result.terminated
              ? "❌ First Innings TERMINATED"
              : "✅ First Innings CONTINUES"}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            S = {result.S} overs possible · T = {result.T} overs bowled
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {result.terminated
              ? "S ≤ T → Go to Table 3"
              : "S > T → Revert to Table 1"}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── TABLE 3 ─────────────────────────────────────────────────
function Table3({ pcKey }: { pcKey: string }) {
  const pc = PC_CONFIG[pcKey];
  const [A, setA] = useState("");
  const [C, setC] = useState("");
  const [result, setResult] = useState<Record<string, string | number> | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  const Av = parseInt(A) || 0;
  const Bv_live = A ? Math.ceil(Av * pc.X) : null;
  const Dv_live = A && C ? toTime(toMins(C) + Math.ceil(Av * pc.X)) : null;

  const calculate = () => {
    const Bv = Math.ceil(Av * pc.X);
    const Cm = toMins(C);
    setResult({
      A: Av,
      B: Bv,
      C: toTime(Cm),
      D: toTime(Cm + Bv),
      bowlerLimit: Math.ceil(Av / pc.bowlerDivisor),
      valid: Av >= pc.minOvers ? 1 : 0,
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 text-xs text-purple-800">
        <strong>Table 3</strong> — Calculation sheet for the start of the{" "}
        <strong>Second Innings</strong> (after first innings terminated)
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-2 px-3 text-left text-xs font-bold text-gray-500 w-8">
                Row
              </th>
              <th className="py-2 px-3 text-left text-xs font-bold text-gray-500">
                Description
              </th>
              <th className="py-2 px-3 text-left text-xs font-bold text-gray-500 w-36">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-gray-100">
              <td
                colSpan={3}
                className="py-1.5 px-3 text-xs font-bold text-gray-600 uppercase tracking-wide"
              >
                Maximum overs to be bowled
              </td>
            </tr>
            {/* FIX 11: Row A — exact PDF wording with parentheses and comma */}
            <FormRow
              rowId="A"
              description="(If first innings was terminated, S from Table 2)"
            >
              <NumInput
                value={A}
                onChange={(v) => setA(String(v))}
                placeholder="e.g. 33"
              />
            </FormRow>
            {/* FIX 12: Row B — "A x X" not "A × pc.X", colon retained */}
            <FormRow
              rowId="B"
              description="Scheduled length of innings: [A x X] (round up fractions)"
              computed
              value={Bv_live !== null ? `${Bv_live} mins` : "—"}
            />
            <FormRow rowId="C" description="Start time">
              <TimeInput value={C} onChange={setC} />
            </FormRow>
            <FormRow
              rowId="D"
              description="Scheduled cessation time [C + B]"
              computed
              highlight
              value={Dv_live ?? "—"}
            />
            <tr className="bg-gray-100">
              <td
                colSpan={3}
                className="py-1.5 px-3 text-xs font-bold text-gray-600 uppercase tracking-wide"
              >
                Overs per bowler and fielding restrictions
              </td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 px-3 text-xs font-bold text-blue-700 align-middle">
                (—)
              </td>
              <td className="py-2 px-3 text-sm text-gray-700 align-middle">
                Maximum overs per bowler [I / 5]
              </td>
              <td className="py-2 px-3 align-middle">
                {A ? (
                  <div className="flex gap-1 flex-wrap justify-end">
                    {bowlerDist(Av).map((n, i) => (
                      <span
                        key={i}
                        className="bg-gray-100 text-gray-800 rounded px-1.5 py-0.5 text-xs font-mono font-semibold"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-right font-mono text-sm text-gray-800">
                    —
                  </span>
                )}
              </td>
            </tr>
            <tr className="border-b border-gray-100 bg-green-50">
              <td className="py-2 px-3 text-xs font-bold text-green-700 align-middle">
                PP
              </td>
              <td className="py-2 px-3 text-sm text-gray-700 align-middle">
                Duration of Powerplay overs (initial, batting side)
              </td>
              <td className="py-2 px-3 align-middle">
                {A ? (
                  <PPBadges I={Av} maxOvers={pc.maxOvers} isT20={pc.isT20} />
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <button
        onClick={calculate}
        disabled={!A || !C}
        className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-purple-700 disabled:opacity-40 transition"
      >
        Calculate 2nd Innings
      </button>
      {result && (
        <div
          className={`rounded-xl p-4 ${result.valid ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">{pc.label}</p>
            <button
              onClick={() => {
                const overs = result.A as number;
                const dist = summarizeBowlerDist(bowlerDist(overs));
                const _pp = calcPP(overs, pc.maxOvers, pc.isT20);
                const ppLines: string[] = [];
                if (pc.isT20) {
                  const { pp: ppOv, npp } = _pp as { pp: number; npp: number };
                  ppLines.push(`  Powerplay: overs 1–${ppOv}`);
                  if (npp > 0)
                    ppLines.push(`  Non-powerplay: overs ${ppOv + 1}–${overs}`);
                } else {
                  const { pp1, pp2, pp3 } = _pp as {
                    pp1: number;
                    pp2: number;
                    pp3: number;
                  };
                  ppLines.push(`  PP1: overs 1–${pp1}`);
                  if (pp2 > 0)
                    ppLines.push(`  PP2: overs ${pp1 + 1}–${pp1 + pp2}`);
                  if (pp3 > 0)
                    ppLines.push(
                      `  PP3: overs ${pp1 + pp2 + 1}–${pp1 + pp2 + pp3}`,
                    );
                }
                navigator.clipboard.writeText(
                  [
                    `MATCH SUMMARY — ${pc.label}`,
                    `Overs per team: ${overs}`,
                    `Match ends: ${to12Hour(result.D as string)}`,
                    ``,
                    `Bowler limit:`,
                    ...dist.map(
                      (g) =>
                        `  ${g.count} bowler${g.count > 1 ? "s" : ""} × ${g.overs} over${g.overs > 1 ? "s" : ""} = ${g.total} overs`,
                    ),
                    ``,
                    `Powerplays:`,
                    ...ppLines,
                  ].join("\n"),
                );
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
            >
              {copied ? "✓ Copied" : "📋 Copy"}
            </button>
          </div>
          <p className="text-6xl font-black text-gray-900 text-center">
            {result.A}
          </p>
          <p className="text-sm text-gray-500 mt-1 text-center">
            overs per team
          </p>
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-1 text-sm text-left">
            <p className="font-semibold text-gray-700 mb-1">Bowler limit:</p>
            {summarizeBowlerDist(bowlerDist(result.A as number)).map((g, i) => (
              <p key={i} className="text-gray-700 pl-2">
                {g.count} bowler{g.count > 1 ? "s" : ""} × {g.overs} over
                {g.overs > 1 ? "s" : ""} = {g.total} overs
              </p>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-1 text-sm">
            <p className="text-gray-700">
              Match ends:{" "}
              <b className="text-gray-900">{to12Hour(result.D as string)}</b>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-1.5">
            <p className="font-semibold text-gray-700 text-sm mb-1">
              Powerplays:
            </p>
            {(() => {
              const I = result.A as number;
              const pp = calcPP(I, pc.maxOvers, pc.isT20);
              if (pc.isT20) {
                const { pp: ppOvers, npp } = pp as { pp: number; npp: number };
                return (
                  <>
                    <div className="flex items-center gap-2 pl-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                        Powerplay
                      </span>
                      <span className="font-mono text-sm text-gray-800">
                        overs 1–{ppOvers}
                      </span>
                    </div>
                    {npp > 0 && (
                      <div className="flex items-center gap-2 pl-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          Non-powerplay
                        </span>
                        <span className="font-mono text-sm text-gray-800">
                          overs {ppOvers + 1}–{I}
                        </span>
                      </div>
                    )}
                  </>
                );
              }
              const { pp1, pp2, pp3 } = pp as {
                pp1: number;
                pp2: number;
                pp3: number;
              };
              const pp1End = pp1;
              const pp2End = pp1 + pp2;
              const pp3End = pp1 + pp2 + pp3;
              return (
                <>
                  <div className="flex items-center gap-2 pl-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                      PP1
                    </span>
                    <span className="font-mono text-sm text-gray-800">
                      overs 1–{pp1End}
                    </span>
                  </div>
                  {pp2 > 0 && (
                    <div className="flex items-center gap-2 pl-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                        PP2
                      </span>
                      <span className="font-mono text-sm text-gray-800">
                        overs {pp1End + 1}–{pp2End}
                      </span>
                    </div>
                  )}
                  {pp3 > 0 && (
                    <div className="flex items-center gap-2 pl-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                        PP3
                      </span>
                      <span className="font-mono text-sm text-gray-800">
                        overs {pp2End + 1}–{pp3End}
                      </span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          <p
            className={`text-sm font-semibold mt-4 pt-3 border-t border-gray-200 text-center ${result.valid ? "text-green-700" : "text-red-700"}`}
          >
            {result.valid
              ? `✅ Match valid (min ${pc.minOvers} overs)`
              : `❌ Below minimum ${pc.minOvers} overs`}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── TABLE 4 ─────────────────────────────────────────────────
function Table4({ pcKey }: { pcKey: string }) {
  const pc = PC_CONFIG[pcKey];
  const [A, setA] = useState("");
  const [B, setB] = useState("");
  const [D, setD] = useState("");
  const [F, setF] = useState(0);
  const [H, setH] = useState("");
  const [prev, setPrev] = useState(0);
  const [result, setResult] = useState<Record<string, string | number> | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  // Live computed values
  const Cv_live = A && B ? Math.max(0, toMins(B) - toMins(A) - prev) : null;
  const Ev_live = B && D ? Math.max(0, toMins(D) - toMins(B)) + prev : null;

  const Gv_live = Ev_live !== null ? Math.max(0, Ev_live - F) : null;
  const Iv_live = Gv_live !== null && H ? Math.floor(Gv_live / pc.X) : null;
  const Jv_live =
    Iv_live !== null && H ? Math.max(0, parseInt(H) - Iv_live) : null;
  const Kv_live = Jv_live !== null ? Math.ceil(Jv_live * pc.X) : null;

  const calculate = () => {
    const Am = toMins(A);
    const Bm = toMins(B);
    const Cv = Math.max(0, Bm - Am - prev);
    const Dm = toMins(D);
    const Ev = Math.max(0, Dm - Bm) + prev;
    const Gv = Math.max(0, Ev - F);
    const Hv = parseInt(H);
    const Iv = Gv > 0 ? Math.floor(Gv / pc.X) : 0;
    const Jv = Math.max(0, Hv - Iv);
    const Kv = Math.ceil(Jv * pc.X);
    const Lm = Dm + Math.max(0, Kv - Cv);
    setResult({
      A: toTime(Am),
      B: toTime(Bm),
      C: Cv,
      D: toTime(Dm),
      E: Ev,
      F,
      G: Gv,
      H: Hv,
      I: Iv,
      J: Jv,
      K: Kv,
      L: toTime(Lm),
      bowlerLimit: Jv > 0 ? Math.ceil(Jv / pc.bowlerDivisor) : 0,
      valid: Jv >= pc.minOvers ? 1 : 0,
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-2 text-xs text-teal-800">
        <strong>Table 4</strong> — Calculation sheet for use when interruption
        occurs after the start of the <strong>Second Innings</strong>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-2 px-3 text-left text-xs font-bold text-gray-500 w-8">
                Row
              </th>
              <th className="py-2 px-3 text-left text-xs font-bold text-gray-500">
                Description
              </th>
              <th className="py-2 px-3 text-left text-xs font-bold text-gray-500 w-36">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-gray-100">
              <td
                colSpan={3}
                className="py-1.5 px-3 text-xs font-bold text-gray-600 uppercase tracking-wide"
              >
                Time
              </td>
            </tr>
            <FormRow rowId="A" description="Time at start of innings">
              <TimeInput value={A} onChange={setA} />
            </FormRow>

            <tr className="border-b border-gray-100 bg-amber-50">
              <td className="py-2 px-3 text-xs font-bold text-amber-700 align-middle">
                ←
              </td>
              <td className="py-2 px-3 text-sm text-gray-700 align-middle">
                Previous interruption time already accumulated (mins)
                <span className="block text-xs text-amber-600 mt-0.5">
                  Enter 0 for 1st interruption. For 2nd+ enter the E value from
                  the previous Table 4 result.
                </span>
              </td>
              <td className="py-2 px-3 align-middle">
                <NumInput value={prev} onChange={setPrev} placeholder="0" />
              </td>
            </tr>

            <FormRow rowId="B" description="Time at start of interruption">
              <TimeInput value={B} onChange={setB} />
            </FormRow>
            {/* FIX 13: Row C — exact PDF wording, no formula appended */}
            <FormRow
              rowId="C"
              description="Time innings in progress"
              computed
              value={Cv_live !== null ? `${Cv_live} mins` : "—"}
            />
            <FormRow rowId="D" description="Restart time">
              <TimeInput value={D} onChange={setD} />
            </FormRow>
            <FormRow
              rowId="E"
              description="Length of interruption [D – B]"
              computed
              value={Ev_live !== null ? `${Ev_live} mins` : "—"}
            />
            {/* FIX 14: Row F — exact PDF wording with "provision for" retained */}
            <FormRow
              rowId="F"
              description="Additional time available: (Any unused provision for 'Extra Time' or for earlier than scheduled start of second innings)"
            >
              <NumInput value={F} onChange={setF} placeholder="0" />
            </FormRow>
            <FormRow
              rowId="G"
              description="Total playing time lost [E – F]"
              computed
              value={Gv_live !== null ? `${Gv_live} mins` : "—"}
            />
            <tr className="bg-gray-100">
              <td
                colSpan={3}
                className="py-1.5 px-3 text-xs font-bold text-gray-600 uppercase tracking-wide"
              >
                Overs
              </td>
            </tr>
            <FormRow rowId="H" description="Maximum overs at start of innings">
              <NumInput
                value={H}
                onChange={(v) => setH(String(v))}
                placeholder="e.g. 50"
              />
            </FormRow>
            {/* FIX 10 (Table 4): Row I — "G / X" not "G / pc.X" */}
            <FormRow
              rowId="I"
              description="Overs lost [G / X] (rounded down)"
              computed
              value={Iv_live !== null ? `${Iv_live} overs` : "—"}
            />
            <FormRow
              rowId="J"
              description="Adjusted maximum length of innings [H – I]"
              computed
              highlight
              value={Jv_live !== null ? `${Jv_live} overs` : "—"}
            />
            {/* FIX 10 (Table 4): Row K — "J x X rounded up" not "J × pc.X" */}
            <FormRow
              rowId="K"
              description="Rescheduled length of innings [J x X rounded up]"
              computed
              value={Kv_live !== null ? `${Kv_live} mins` : "—"}
            />
            <FormRow
              rowId="L"
              description="Amended cessation time of innings [D + (K – C)]"
              computed
              highlight
              value={result ? (result.L as string) : "—"}
            />
            <tr className="bg-gray-100">
              <td
                colSpan={3}
                className="py-1.5 px-3 text-xs font-bold text-gray-600 uppercase tracking-wide"
              >
                Overs per bowler and Fielding Restrictions
              </td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 px-3 text-xs font-bold text-blue-700 align-middle">
                (—)
              </td>
              <td className="py-2 px-3 text-sm text-gray-700 align-middle">
                Maximum overs per bowler [I / 5]
              </td>
              <td className="py-2 px-3 align-middle">
                {Jv_live !== null ? (
                  <div className="flex gap-1 flex-wrap justify-end">
                    {bowlerDist(Jv_live).map((n, i) => (
                      <span
                        key={i}
                        className="bg-gray-100 text-gray-800 rounded px-1.5 py-0.5 text-xs font-mono font-semibold"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-right font-mono text-sm text-gray-800">
                    —
                  </span>
                )}
              </td>
            </tr>
            <tr className="border-b border-gray-100 bg-green-50">
              <td className="py-2 px-3 text-xs font-bold text-green-700 align-middle">
                PP
              </td>
              <td className="py-2 px-3 text-sm text-gray-700 align-middle">
                Duration of Powerplay overs (initial, batting side)
              </td>
              <td className="py-2 px-3 align-middle">
                {Jv_live !== null ? (
                  <PPBadges
                    I={Jv_live}
                    maxOvers={pc.maxOvers}
                    isT20={pc.isT20}
                  />
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <button
        onClick={calculate}
        disabled={!A || !B || !D || !H}
        className="w-full bg-teal-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-teal-700 disabled:opacity-40 transition"
      >
        Calculate Revised 2nd Innings
      </button>
      {result && (
        <div
          className={`rounded-xl p-4 ${result.valid ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">{pc.label}</p>
            <button
              onClick={() => {
                const overs = result.J as number;
                const dist = summarizeBowlerDist(bowlerDist(overs));
                const _pp = calcPP(overs, pc.maxOvers, pc.isT20);
                const ppLines: string[] = [];
                if (pc.isT20) {
                  const { pp: ppOv, npp } = _pp as { pp: number; npp: number };
                  ppLines.push(`  Powerplay: overs 1–${ppOv}`);
                  if (npp > 0)
                    ppLines.push(`  Non-powerplay: overs ${ppOv + 1}–${overs}`);
                } else {
                  const { pp1, pp2, pp3 } = _pp as {
                    pp1: number;
                    pp2: number;
                    pp3: number;
                  };
                  ppLines.push(`  PP1: overs 1–${pp1}`);
                  if (pp2 > 0)
                    ppLines.push(`  PP2: overs ${pp1 + 1}–${pp1 + pp2}`);
                  if (pp3 > 0)
                    ppLines.push(
                      `  PP3: overs ${pp1 + pp2 + 1}–${pp1 + pp2 + pp3}`,
                    );
                }
                navigator.clipboard.writeText(
                  [
                    `MATCH SUMMARY — ${pc.label}`,
                    `Revised overs: ${overs} (${result.I} overs lost)`,
                    `Match ends: ${to12Hour(result.L as string)}`,
                    ``,
                    `Bowler limit:`,
                    ...dist.map(
                      (g) =>
                        `  ${g.count} bowler${g.count > 1 ? "s" : ""} × ${g.overs} over${g.overs > 1 ? "s" : ""} = ${g.total} overs`,
                    ),
                    ``,
                    `Powerplays:`,
                    ...ppLines,
                  ].join("\n"),
                );
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
            >
              {copied ? "✓ Copied" : "📋 Copy"}
            </button>
          </div>
          <p className="text-6xl font-black text-gray-900 text-center">
            {result.J}
          </p>
          <p className="text-sm text-gray-500 mt-1 text-center">
            revised overs
          </p>
          <p className="text-xs text-red-600 text-center">
            {result.I} overs lost
          </p>
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-1 text-sm text-left">
            <p className="font-semibold text-gray-700 mb-1">Bowler limit:</p>
            {summarizeBowlerDist(bowlerDist(result.J as number)).map((g, i) => (
              <p key={i} className="text-gray-700 pl-2">
                {g.count} bowler{g.count > 1 ? "s" : ""} × {g.overs} over
                {g.overs > 1 ? "s" : ""} = {g.total} overs
              </p>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-1 text-sm">
            <p className="text-gray-700">
              Match ends:{" "}
              <b className="text-gray-900">{to12Hour(result.L as string)}</b>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-1.5">
            <p className="font-semibold text-gray-700 text-sm mb-1">
              Powerplays:
            </p>
            {(() => {
              const I = result.J as number;
              const pp = calcPP(I, pc.maxOvers, pc.isT20);
              if (pc.isT20) {
                const { pp: ppOvers, npp } = pp as { pp: number; npp: number };
                return (
                  <>
                    <div className="flex items-center gap-2 pl-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                        Powerplay
                      </span>
                      <span className="font-mono text-sm text-gray-800">
                        overs 1–{ppOvers}
                      </span>
                    </div>
                    {npp > 0 && (
                      <div className="flex items-center gap-2 pl-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          Non-powerplay
                        </span>
                        <span className="font-mono text-sm text-gray-800">
                          overs {ppOvers + 1}–{I}
                        </span>
                      </div>
                    )}
                  </>
                );
              }
              const { pp1, pp2, pp3 } = pp as {
                pp1: number;
                pp2: number;
                pp3: number;
              };
              const pp1End = pp1;
              const pp2End = pp1 + pp2;
              const pp3End = pp1 + pp2 + pp3;
              return (
                <>
                  <div className="flex items-center gap-2 pl-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                      PP1
                    </span>
                    <span className="font-mono text-sm text-gray-800">
                      overs 1–{pp1End}
                    </span>
                  </div>
                  {pp2 > 0 && (
                    <div className="flex items-center gap-2 pl-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                        PP2
                      </span>
                      <span className="font-mono text-sm text-gray-800">
                        overs {pp1End + 1}–{pp2End}
                      </span>
                    </div>
                  )}
                  {pp3 > 0 && (
                    <div className="flex items-center gap-2 pl-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                        PP3
                      </span>
                      <span className="font-mono text-sm text-gray-800">
                        overs {pp2End + 1}–{pp3End}
                      </span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          <p
            className={`text-sm font-semibold mt-4 pt-3 border-t border-gray-200 text-center ${result.valid ? "text-green-700" : "text-red-700"}`}
          >
            {result.valid
              ? `✅ Match valid (min ${pc.minOvers} overs)`
              : `❌ Below minimum ${pc.minOvers} overs`}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Revised Overs Tab ────────────────────────────────────────
function RevisedOversTab() {
  const [pcKey, setPcKey] = useState("PC2_F50_MENS");
  const [subTab, setSubTab] = useState<"t1" | "t2" | "t3" | "t4">("t1");

  const activeColors: Record<string, string> = {
    t1: "bg-blue-600 text-white border-blue-600",
    t2: "bg-orange-500 text-white border-orange-500",
    t3: "bg-purple-600 text-white border-purple-600",
    t4: "bg-teal-600 text-white border-teal-600",
  };

  const subDescriptions: Record<string, string> = {
    t1: "1st innings delay / interruption",
    t2: "Should 1st innings be terminated?",
    t3: "Start of 2nd innings (after termination)",
    t4: "Interruption during 2nd innings",
  };

  return (
    <div className="p-4 overflow-y-auto h-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-0.5">
        Revised Overs
      </h2>
      <p className="text-xs text-gray-400 mb-3">
        KSCA Appendix E — Rain / interruption calculations
      </p>
      <div className="mb-4">
        <label className={labelCls}>Playing Condition</label>
        <select
          value={pcKey}
          onChange={(e) => setPcKey(e.target.value)}
          className={inputCls}
        >
          {Object.entries(PC_CONFIG).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Z = {PC_CONFIG[pcKey].Z} mins · X = {PC_CONFIG[pcKey].X} mins/over ·
          Max = {PC_CONFIG[pcKey].maxOvers} overs · Min ={" "}
          {PC_CONFIG[pcKey].minOvers} overs
        </p>
      </div>
      <div className="flex gap-1.5 mb-1">
        {(["t1", "t2", "t3", "t4"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${
              subTab === t
                ? activeColors[t]
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Table {t[1]}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mb-3">{subDescriptions[subTab]}</p>
      {subTab === "t1" && <Table1 pcKey={pcKey} />}
      {subTab === "t2" && <Table2 pcKey={pcKey} />}
      {subTab === "t3" && <Table3 pcKey={pcKey} />}
      {subTab === "t4" && <Table4 pcKey={pcKey} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function UmpireAssistPage() {
  const [tab, setTab] = useState<"chat" | "nrr" | "revised">("chat");

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] sm:h-[calc(100vh-120px)] w-full max-w-5xl mx-auto">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-semibold text-gray-900">
          🏏 Umpire Assist ·{" "}
          <span className="font-extrabold text-blue-600">OnField</span>
        </h1>
        <p className="text-sm text-gray-500">
          KSCA · MCC · ICC · BCCI — explained and calculated
        </p>
        <p className="text-xs text-gray-400 italic mt-0.5">
          Know the law. Get the call right.
        </p>
      </div>
      <div className="flex border-b border-gray-200 px-4">
        {(["chat", "nrr", "revised"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "chat"
              ? "Ask a Rule"
              : t === "nrr"
                ? "Net Run Ratio"
                : "Revised Overs"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === "chat" && <ChatTab />}
        {tab === "nrr" && (
          <div className="h-full overflow-y-auto p-4">
            <NetRunRateTab />
          </div>
        )}
        {tab === "revised" && <RevisedOversTab />}
      </div>
    </div>
  );
}
