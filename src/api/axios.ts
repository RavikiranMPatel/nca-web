import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

// 🔐 Attach JWT to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 🚪 Auto logout on 401 (TOKEN-AWARE)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem("accessToken");

      // ✅ Skip logout for blob requests (PDF/file downloads)
      const isFileDownload = error.config?.responseType === "blob";
      if (isFileDownload) {
        return Promise.reject(error); // caught in handleDownloadReceipt's catch block
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
