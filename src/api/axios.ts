import axios from "axios";

/**
 * Default request timeout, 30s.
 *
 * There was none, so a request on a dead connection hung until the browser's own TCP
 * timeout — tens of seconds to minutes. On LiveScorerPage that froze the whole pad,
 * because every scoring control is disabled while a post is in flight.
 *
 * 30s is chosen against what the server actually allows: nginx gives /api/ a
 * proxy_read_timeout of 300s, so 30s is well inside the ceiling and is not going to cut
 * off a request the backend would have answered. No ordinary list, report or CRUD call
 * here takes anywhere near it, and one still running at 30s on a phone at a ground is
 * not going to finish usefully — the useful thing at that point is to stop waiting and
 * ask the server what is true.
 *
 * Two kinds of request want different patience and override this per call:
 *   - scoring writes, SCORING_WRITE_TIMEOUT_MS below — the scorer needs an answer fast
 *   - PDF downloads, PDF_TIMEOUT_MS — generation is genuinely slow and nginx gives the
 *     receipt-pdf route 300s of its own
 */
export const DEFAULT_TIMEOUT_MS = 30_000;

const api = axios.create({
  baseURL: "/api",
  timeout: DEFAULT_TIMEOUT_MS,
});

/**
 * 12s for a ball, a wicket or an undo.
 *
 * Short on purpose, and only safe because the caller reconciles: LiveScorerPage answers
 * a failed write by asking GET /state what the server actually holds and saying whether
 * the ball landed. Without that, a short timeout would just produce the old ambiguity
 * sooner. With it, the scorer gets a correct answer in about twelve seconds instead of a
 * frozen pad for a minute.
 */
export const SCORING_WRITE_TIMEOUT_MS = 12_000;

/** PDF generation is slow by nature; nginx allows the receipt-pdf route 300s. */
export const PDF_TIMEOUT_MS = 120_000;

// 🔐 Attach JWT to every request
// NEW
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn(
        "[axios request] No token for",
        config.method?.toUpperCase(),
        config.url,
      );
    }

    // File downloads get the long budget without every call site asking for it —
    // there are a dozen of them and any new one should inherit this rather than
    // silently take the 30s default and fail on a big plan statement.
    // An explicit per-call timeout still wins.
    // Compared against the default, not undefined: axios merges the instance default
    // into config.timeout BEFORE request interceptors run, so an undefined check here
    // would never fire and every download would have quietly kept the 30s budget.
    // A caller that passes its own value differs from the default and is left alone.
    if (config.responseType === "blob" && config.timeout === DEFAULT_TIMEOUT_MS) {
      config.timeout = PDF_TIMEOUT_MS;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// 🚪 Auto logout on 401 (TOKEN-AWARE)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // NEW
    if (error.response?.status === 401) {
      const token = localStorage.getItem("accessToken");
      console.error("[401 interceptor]", {
        url: error.config?.url,
        method: error.config?.method,
        hasToken: !!token,
        tokenPrefix: token ? token.substring(0, 20) + "…" : "null",
        responseData: error.response?.data,
        headers: error.config?.headers,
      });

      // ✅ Skip logout for blob requests (PDF/file downloads)
      const isFileDownload = error.config?.responseType === "blob";
      if (isFileDownload) {
        return Promise.reject(error);
      }

      // ✅ Skip logout for requests that explicitly opt out
      if (error.config?.skipAuthError) {
        return Promise.reject(error);
      }

      // ✅ Redirect ONLY if user was logged in
      if (token) {
        const message = error.response?.data?.message || "";
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userId");
        localStorage.removeItem("playerId");
        localStorage.removeItem("playerName");
        localStorage.removeItem("userRole");

        localStorage.removeItem("userName");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userPublicId");
        localStorage.removeItem("academyId");
        localStorage.removeItem("academyName");
        localStorage.removeItem("branchId");
        localStorage.removeItem("branchName");

        if (message.includes("Session expired")) {
          sessionStorage.setItem("sessionExpired", "another_device");
        } else {
          sessionStorage.setItem("sessionExpired", "true");
        }

        sessionStorage.setItem(
          "redirectAfterLogin",
          window.location.pathname + window.location.search,
        );
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
