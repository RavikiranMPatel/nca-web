#!/usr/bin/env node
/**
 * Register hygiene for docs/testing/t20-scoring/BUGS-FOUND.md.
 *
 * The register has drifted three times, and each time the same way: an entry is
 * added or fixed in the body and its index row is left behind, so the first
 * thing a new session reads disagrees with the file it is reading. The index
 * once stopped at BUG-33 while the file ran to BUG-42 — a critical cross-tenant
 * bug that appeared nowhere in the index at all. BUG-11 was fixed on 2026-09-13
 * and its row still said "open" the next day.
 *
 * The failure mode is never "someone could not find the convention". It is that
 * nothing checks. So this checks, and it is the thing that has to pass:
 *
 *   1. every body entry states a Status (the BUG-11 failure)
 *   2. every body entry has an index row, and every index row has a body entry
 *      (the BUG-42 failure)
 *   3. the index's fixed/open verdict matches the body's (the BUG-11 failure)
 *   4. the index's severity matches the body's, where the body states one
 *   5. no duplicate ids in either, and the index is in ascending id order
 *
 * Deliberately dependency-free and server-free: it must be runnable in one
 * command by someone who has just cloned the repo and has no backend up.
 *
 *   npm run register:check
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(HERE, "../docs/testing/t20-scoring/BUGS-FOUND.md");

const SEVERITIES = ["critical", "high", "medium", "low"];

/** Reduce a status phrase to `fixed` or `open`.
 *  Order matters: "reported, **not fixed**" must not read as "fixed". */
function classify(phrase) {
  const s = phrase.toLowerCase();
  if (/\bnot fixed\b|\bopen\b|\breported\b/.test(s)) return "open";
  if (/\bfixed\b/.test(s)) return "fixed";
  return null;
}

function severityOf(text) {
  // Only the declared severity field, not the word appearing in prose.
  const m = text.match(/\*\*Severity:\*\*\s*([a-z]+)/i);
  return m ? m[1].toLowerCase() : null;
}

const raw = readFileSync(FILE, "utf8");
const lines = raw.split("\n");

// ── Index rows: | BUG-nn | title | severity | status | ───────────────────────
const index = new Map();
const indexOrder = [];
lines.forEach((line, n) => {
  const m = line.match(/^\|\s*(BUG-\d+)\s*\|(.*)\|(.*)\|(.*)\|\s*$/);
  if (!m) return;
  const [, id, title, severity, status] = m;
  indexOrder.push(id);
  index.set(id, {
    id,
    line: n + 1,
    title: title.trim(),
    severity: severity.trim().toLowerCase(),
    status: status.trim(),
    verdict: classify(status),
  });
});

// ── Body entries: ## BUG-nn — title, then a front-matter paragraph ───────────
const body = new Map();
const headings = [];
lines.forEach((line, n) => {
  const m = line.match(/^## (BUG-\d+)\b(.*)$/);
  if (m) headings.push({ id: m[1], title: m[2].replace(/^\s*[—-]\s*/, "").trim(), at: n });
});
headings.forEach(({ id, title, at }, i) => {
  const end = i + 1 < headings.length ? headings[i + 1].at : lines.length;
  // front matter = first contiguous run of non-empty lines after the heading
  let j = at + 1;
  while (j < end && !lines[j].trim()) j++;
  const front = [];
  while (j < end && lines[j].trim()) front.push(lines[j]), j++;
  const frontText = front.join(" ");
  const statusMatch = frontText.match(/\*\*Status[:\s]*([^*]*)\*\*([^.]*)|(\*\*Status:\*\*\s*[^.]*)/i);
  body.set(id, {
    id,
    line: at + 1,
    title,
    frontText,
    hasStatus: /\*\*Status/i.test(frontText),
    verdict: /\*\*Status/i.test(frontText)
      ? classify(frontText.slice(frontText.search(/\*\*Status/i)))
      : null,
    severity: severityOf(frontText),
  });
});

// ── Checks ───────────────────────────────────────────────────────────────────
const problems = [];
const fail = (id, line, msg) => problems.push({ id, line, msg });

// 1. duplicates
const dupes = (arr) => arr.filter((v, i) => arr.indexOf(v) !== i);
dupes(indexOrder).forEach((id) => fail(id, index.get(id)?.line, "duplicate index row"));
dupes(headings.map((h) => h.id)).forEach((id) => fail(id, body.get(id)?.line, "duplicate body entry"));

// 2. completeness, both directions
for (const id of body.keys())
  if (!index.has(id)) fail(id, body.get(id).line, "body entry has NO index row — the BUG-42 failure");
for (const id of index.keys())
  if (!body.has(id)) fail(id, index.get(id).line, "index row has NO body entry");

// 3. every body entry states a Status
for (const [id, b] of body)
  if (!b.hasStatus) fail(id, b.line, "body entry states no Status — cannot tell if it is open or fixed");
  else if (!b.verdict) fail(id, b.line, `body Status is unclassifiable: "${b.frontText.slice(0, 80)}"`);

// 4. index verdict must match body verdict
for (const [id, b] of body) {
  const i = index.get(id);
  if (!i || !b.verdict || !i.verdict) continue;
  if (i.verdict !== b.verdict)
    fail(id, i.line, `index says "${i.verdict}" but body says "${b.verdict}" — index row is stale`);
}

// 5. severity agreement and vocabulary
for (const [id, i] of index) {
  if (!SEVERITIES.includes(i.severity))
    fail(id, i.line, `index severity "${i.severity}" is not one of ${SEVERITIES.join("/")}`);
  const b = body.get(id);
  if (b?.severity && b.severity !== i.severity)
    fail(id, i.line, `index severity "${i.severity}" != body severity "${b.severity}"`);
}

// 6. index ordered ascending by id
const nums = indexOrder.map((id) => Number(id.slice(4)));
for (let i = 1; i < nums.length; i++)
  if (nums[i] < nums[i - 1])
    fail(indexOrder[i], index.get(indexOrder[i]).line, `index out of order (after ${indexOrder[i - 1]})`);

// ── Report ───────────────────────────────────────────────────────────────────
const rel = "docs/testing/t20-scoring/BUGS-FOUND.md";
console.log(`register: ${body.size} body entries, ${index.size} index rows — ${rel}`);
if (problems.length === 0) {
  const open = [...body.values()].filter((b) => b.verdict === "open").length;
  console.log(`register: OK — ${open} open, ${body.size - open} fixed, index agrees with body throughout`);
  process.exit(0);
}
problems.sort((a, b) => Number(a.id.slice(4)) - Number(b.id.slice(4)));
console.error(`\nregister: ${problems.length} problem(s)\n`);
for (const p of problems) console.error(`  ${rel}:${p.line}  ${p.id}: ${p.msg}`);
console.error("");
process.exit(1);
