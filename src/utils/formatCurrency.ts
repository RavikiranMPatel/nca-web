/**
 * Format a numeric amount using the academy's configured currency.
 * Uses Intl.NumberFormat — INR gets Indian grouping (₹1,00,000),
 * all others use standard grouping ($1,000 / £1,000 / etc.)
 */
export function formatCurrency(
  amount: number,
  currencyCode = "INR",
  opts?: { decimals?: number }
): string {
  const locale = currencyCode === "INR" ? "en-IN" : "en";
  const decimals = opts?.decimals ?? 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Return just the currency symbol character (e.g. ₹, $, £).
 * Used in form field labels like "Amount (₹) *".
 */
export function getCurrencySymbol(currencyCode = "INR"): string {
  return (
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? currencyCode
  );
}
