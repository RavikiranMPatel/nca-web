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

      // ✅ Redirect ONLY if user was logged in
      if (token) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userId");
        localStorage.removeItem("playerId");
        localStorage.removeItem("playerName");
        localStorage.removeItem("userRole");

        // ✅ Set session expired flag
        sessionStorage.setItem("sessionExpired", "true");
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
