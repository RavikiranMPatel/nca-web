export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Null-safe formatDate. The admin subscription API sends "" (not null) for
 * missing dates, and new Date("") / new Date("—") both yield "Invalid Date".
 */
export function formatDateOrDash(date?: string | null): string {
  if (!date) return "—";
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? "—" : formatDate(date);
}
