/**
 * Image URL Utility - Proxy Setup
 *
 * Since both Vite (dev) and Nginx (prod) proxy the /uploads/ path,
 * we simply return relative URLs as-is.
 */

/**
 * Get image URL (returns as-is for proxy routing)
 * @param relativeUrl - Relative URL from backend (e.g., "/uploads/logos/abc123.png")
 * @returns Same URL (proxy handles routing)
 */
export const getImageUrl = (
  relativeUrl: string | undefined | null,
): string | null => {
  if (!relativeUrl) return null;
  if (relativeUrl.startsWith("http")) return relativeUrl;
  return relativeUrl; // Proxy handles routing
};

/**
 * Get image URL with fallback
 * @param relativeUrl - Relative URL from backend
 * @param fallbackUrl - Fallback URL if relative URL is empty
 * @returns URL or fallback
 */
export const getImageUrlWithFallback = (
  relativeUrl: string | undefined | null,
  fallbackUrl: string,
): string => {
  return getImageUrl(relativeUrl) || fallbackUrl;
};
