import axios from "axios";

/**
 * PUBLIC API CLIENT
 * -----------------
 * Use this for:
 * - Public pages (Home, Landing pages)
 * - Sliders, banners
 * - Any endpoint that should NOT require login
 *
 * ❌ No JWT attached
 * ❌ No auto-redirect on 401
 * ✅ Safe for anonymous users
 */

const publicApi = axios.create({
  baseURL: "/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Optional: response interceptor
 * Purpose:
 * - Normalize errors
 * - Log if needed
 * - NEVER redirect user
 */
publicApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Optional: console logging for debugging
    console.warn("Public API error:", error?.response?.status);

    return Promise.reject(error);
  },
);

export default publicApi;
