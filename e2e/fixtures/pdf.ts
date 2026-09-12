import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * The text inside a generated PDF.
 *
 * A PDF assertion that checks `%PDF` and a byte count proves the endpoint
 * returned *a* file. It cannot tell a correct report from one with every table
 * empty, the wrong champion, or a filter that was ignored — which are exactly
 * the ways a report goes wrong. So the bytes are parsed and the TEXT is
 * asserted.
 *
 * `pdftotext -layout` (poppler) rather than a JS library: it is the reference
 * implementation, it preserves column order so a table row reads left to right,
 * and it is the tool a human would reach for to check the same thing by hand.
 *
 * ESM: `require` is not defined in a Playwright spec, so the Node builtins are
 * imported at the top — gotchas.md records this one.
 */
export function pdfText(bytes: Buffer | Uint8Array): string {
  const dir = mkdtempSync(path.join(tmpdir(), "nca-pdf-"));
  const file = path.join(dir, "report.pdf");
  try {
    writeFileSync(file, bytes);
    return execFileSync("pdftotext", ["-layout", file, "-"], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Text with runs of whitespace collapsed, for asserting a table row whose
 * column spacing is a layout detail rather than a fact about the data.
 */
export function flat(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** True when poppler is installed. Lets a spec skip loudly rather than fail. */
export function pdftotextAvailable(): boolean {
  try {
    execFileSync("pdftotext", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
