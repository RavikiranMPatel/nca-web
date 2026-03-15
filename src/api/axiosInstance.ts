import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:8080",
});

// Add request interceptor to include JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ✅ Only set Content-Type for non-FormData requests
    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }
    // If it's FormData, browser will set correct Content-Type with boundary

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Add response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear all the same keys AuthContext.logout() clears
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userPublicId");
      localStorage.removeItem("academyId");
      localStorage.removeItem("academyName");
      localStorage.removeItem("branchId");
      localStorage.removeItem("branchName");
      localStorage.removeItem("userId");
      localStorage.removeItem("playerId");
      localStorage.removeItem("playerName");

      // Set flag so Login.tsx shows the yellow banner
      sessionStorage.setItem("sessionExpired", "true");
      sessionStorage.setItem(
        "redirectAfterLogin",
        window.location.pathname + window.location.search,
      );
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
