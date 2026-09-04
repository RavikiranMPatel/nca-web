#!/usr/bin/env node
/**
 * Regenerates docs/testing/t20-scoring/TEST-RESULTS.md from the Playwright JSON
 * reporter output — never from memory.
 *
 *   npx playwright test            # writes e2e/report/results.json
 *   node e2e/tools/build-results.mjs
 *
 * Scenario mapping: a spec title claims workbook scenarios by naming their IDs,
 * e.g. `test("T20-011 one run rotates strike", ...)`. Every T20-xxx / EDGE-xx
 * token found in a title (or in its describe path) is credited with that test's
 * result for the project it ran under.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const REPORT = path.join(ROOT, "e2e/report/results.json");
const DOCS = path.join(ROOT, "docs/testing/t20-scoring");
const MATRIX = path.join(DOCS, "COVERAGE-MATRIX.md");
const OUT = path.join(DOCS, "TEST-RESULTS.md");

const ID_RE = /\b(?:T20-\d{3}|EDGE-\d{2})\b/g;

// ── classifications, read back out of the coverage matrix ───────────────────
const matrix = fs.readFileSync(MATRIX, "utf8");
const scenarios = new Map(); // id -> { title, cls }
for (const line of matrix.split("\n")) {
  const m = line.match(/^\|\s*`((?:T20-\d{3}|EDGE-\d{2}))`\s*\|\s*(.+?)\s*\|\s*([A-Z-]+)\s*\|/);
  if (m) scenarios.set(m[1], { title: m[2], cls: m[3] });
}
if (!scenarios.size) throw new Error(`No scenarios parsed from ${MATRIX}`);

// ── playwright results ──────────────────────────────────────────────────────
if (!fs.existsSync(REPORT)) {
  console.error(`Missing ${REPORT}. Run "npx playwright test" first.`);
  process.exit(1);
}
const report = JSON.parse(fs.readFileSync(REPORT, "utf8"));

const results = new Map(); // id -> { project -> {status, spec, test} }
const harness = [];        // tests that claim no scenario id

function walk(suite, trail) {
  const here = [...trail, suite.title].filter(Boolean);
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const project = t.projectName;
      const r = t.results?.[t.results.length - 1];
      // A test.fail()-marked test reports status "expected" with
      // expectedStatus "failed" — it is a KNOWN app bug still reproducing, not a
      // pass. Surfacing it as PASS would hide the very thing it documents.
      const status =
        t.expectedStatus === "failed"
          ? (r?.status === "failed" ? "EXPECTED-FAIL (app bug)" : "UNEXPECTED-PASS — bug may be fixed")
          : t.status === "skipped"
            ? "SKIPPED"
            : (t.status === "expected" || r?.status === "passed") ? "PASS" : "FAIL";
      const label = [...here, spec.title].join(" › ");
      const ids = [...new Set(label.match(ID_RE) ?? [])];
      // Capture the skip reason so the report can group them.
      const skipReason = (r?.errors ?? []).map((e) => e.message ?? "").join(" ")
        || (t.annotations ?? []).find((a) => a.type === "skip")?.description
        || "";
      // An @ambiguous test asserts what the app actually does where the workbook
      // says something else, so its green is a pin on current behaviour, not
      // agreement with the workbook. Track it so the summary can say so.
      const pinned = /@ambiguous/.test(label);
      const entry = { status, spec: spec.file ?? suite.file, test: spec.title, skipReason, pinned };
      if (!ids.length) { harness.push({ ...entry, project, label }); continue; }
      // A scenario can be claimed by more than one test — typically a workbook
      // assertion marked test.fail() alongside an @ambiguous test pinning current
      // behaviour. Collect them all; combineStatus() decides what the cell says.
      // Last-wins here would let the passing companion mask the failing one.
      for (const id of ids) {
        if (!results.has(id)) results.set(id, {});
        const byProject = results.get(id);
        (byProject[project] ??= []).push(entry);
      }
    }
  }
  for (const child of suite.suites ?? []) walk(child, here);
}
for (const s of report.suites ?? []) walk(s, []);

// ── render ──────────────────────────────────────────────────────────────────
const PROJECTS = ["desktop", "mobile", "mobile-chrome"];

// Worst-first: a red or known-broken result must never be hidden by a green one
// claiming the same scenario.
// PASS outranks SKIPPED deliberately: section 16 cross-references scenarios that
// other specs assert, and a reference-skip must not mask the passing test it points
// at. A red or known-broken result still outranks everything.
const PRIORITY = [
  "FAIL",
  "UNEXPECTED-PASS — bug may be fixed",
  "EXPECTED-FAIL (app bug)",
  "PASS",
  "SKIPPED",
];
const combineStatus = (entries) => {
  for (const p of PRIORITY) if (entries.some((e) => e.status === p)) return p;
  return entries[0]?.status ?? "\u2014";
};

// A scenario whose only green comes from @ambiguous tests is reported as
// AMBIGUOUS-PINNED, never as a plain PASS: the app was observed and pinned, the
// workbook's stated expectation was not met. A scenario that also has a
// non-ambiguous passing test is a real PASS.
const resolveCell = (entries) => {
  const combined = combineStatus(entries);
  if (combined !== "PASS") return combined;
  const greens = entries.filter((e) => e.status === "PASS");
  return greens.length && greens.every((e) => e.pinned) ? "AMBIGUOUS-PINNED" : "PASS";
};

const cellFor = (id, project) => {
  const got = results.get(id)?.[project];
  if (got?.length) return resolveCell(got);
  const cls = scenarios.get(id)?.cls;
  if (cls === "NOT-IMPLEMENTED") return "SKIPPED-NOT-IMPLEMENTED";
  if (cls === "AMBIGUOUS") return "AMBIGUOUS";
  return "—";
};

const counts = {};
for (const id of scenarios.keys()) {
  const c = cellFor(id, "desktop");
  counts[c] = (counts[c] ?? 0) + 1;
}

const L = [];
L.push("# T20 Scoring — Test Results\n");
L.push("**Generated by `node e2e/tools/build-results.mjs` from the Playwright JSON");
L.push("reporter (`e2e/report/results.json`). Do not hand-edit — regenerate it.**\n");
L.push(`Run recorded: ${report.stats?.startTime ?? "unknown"} · ` +
       `duration ${Math.round((report.stats?.duration ?? 0) / 100) / 10}s · ` +
       `${report.stats?.expected ?? 0} passed, ${report.stats?.unexpected ?? 0} failed, ` +
       `${report.stats?.flaky ?? 0} flaky, ${report.stats?.skipped ?? 0} skipped.\n`);
L.push("Result values: `PASS` · `FAIL` · `BLOCKED` · `SKIPPED-NOT-IMPLEMENTED` · `AMBIGUOUS` · `—` (not yet written).\n");
L.push("`—` means no spec claims that scenario ID yet. `SKIPPED-NOT-IMPLEMENTED`");
L.push("and `AMBIGUOUS` are carried over from `COVERAGE-MATRIX.md`: the feature does");
L.push("not exist, or the app defines the rule differently, so no spec is written.\n");

L.push("## Summary\n");
const pass = counts["PASS"] ?? 0;
const skipNI = (counts["SKIPPED"] ?? 0) + (counts["SKIPPED-NOT-IMPLEMENTED"] ?? 0);
const ambiguous = (counts["AMBIGUOUS"] ?? 0) + (counts["AMBIGUOUS-PINNED"] ?? 0);
const expFail = counts["EXPECTED-FAIL (app bug)"] ?? 0;
const unclaimed = counts["\u2014"] ?? 0;
L.push(`**${pass} PASS / ${skipNI} SKIPPED-NOT-IMPLEMENTED / ${ambiguous} AMBIGUOUS-PINNED` +
       `${expFail ? ` / ${expFail} EXPECTED-FAIL` : " — zero expected-fail"}` +
       `${unclaimed ? ` / ${unclaimed} not yet claimed by a spec` : ""}.**\n`);
L.push("| Result | Scenarios |");
L.push("|--------|-----------|");
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) L.push(`| ${k} | ${v} |`);
L.push(`| **Total** | **${scenarios.size}** |\n`);

// ── grouped skip reasons ────────────────────────────────────────────────────
const skipped = [];
for (const [id, byProject] of results) {
  const entries = Object.values(byProject)[0] ?? [];
  for (const e of entries) {
    if (e.status === "SKIPPED") { skipped.push({ id, test: e.test, reason: e.skipReason }); break; }
  }
}
if (skipped.length) {
  L.push("## Skipped scenarios, grouped by reason\n");
  L.push("Every skip carries the reason it was skipped, taken from the spec itself.\n");
  const groups = new Map();
  for (const s of skipped) {
    const key = (s.reason || "no reason recorded").replace(/\s+/g, " ").trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s.id);
  }
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [reason, ids] of sorted) {
    L.push(`- **${ids.sort().join(", ")}** — ${reason}`);
  }
  L.push("");
}

if (harness.length) {
  L.push("## Harness tests (no workbook scenario)\n");
  L.push("| Test | Project | Result |");
  L.push("|------|---------|--------|");
  for (const h of harness.sort((a, b) => (a.label + a.project).localeCompare(b.label + b.project)))
    L.push(`| ${h.label} | ${h.project} | ${h.status} |`);
  L.push("");
}

L.push("## Scenario results\n");
L.push("| ID | Title | Classification | desktop | mobile | mobile-chrome | Evidence | Notes |");
L.push("|----|-------|----------------|---------|--------|---------------|----------|-------|");
for (const [id, meta] of scenarios) {
  const any = results.get(id);
  const entries = any ? Object.values(any)[0] : null;
  const ev = entries
    ? `\`${entries[0].spec}\`<br>` +
      entries.map((e) => `${e.status === "PASS" ? "" : "**"}${e.test}${e.status === "PASS" ? "" : "**"}`).join("<br>")
    : "";
  L.push(
    `| \`${id}\` | ${meta.title} | ${meta.cls} | ` +
      PROJECTS.map((p) => cellFor(id, p)).join(" | ") +
      ` | ${ev} |  |`,
  );
}
L.push("");
fs.writeFileSync(OUT, L.join("\n"));
console.log(`Wrote ${OUT}: ${scenarios.size} scenarios, ${harness.length} harness rows.`);
