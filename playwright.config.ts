import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "./e2e/fixtures/env";

const env = loadEnv();

// ── Hard safety gate ────────────────────────────────────────────────────────
// CLAUDE.md hard rule 5: testing never runs against production. This suite
// creates, scores and deletes matches, so a non-local target would be writing
// destructive test data into a live tenant. Fail at config load, before any
// browser starts, rather than trusting a reviewer to notice a bad env var.
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
for (const [name, url] of [
  ["E2E_WEB_BASE", env.webBase],
  ["E2E_API_BASE", env.apiBase],
] as const) {
  if (!LOCAL.test(url)) {
    throw new Error(
      `REFUSING TO RUN: ${name} is "${url}", which is not localhost.\n` +
        `The T20 scoring suite creates and deletes matches. It must never be ` +
        `pointed at rkmpcrease.com or any deployed environment (CLAUDE.md hard rule 5).`,
    );
  }
}

export default defineConfig({
  testDir: "./e2e/specs",
  outputDir: "./e2e/.artifacts",
  fullyParallel: false,       // scoring is stateful per match; keep runs deterministic
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: 0,                 // a flaky scoring assertion is a finding, not something to paper over
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "e2e/report", open: "never" }],
    ["json", { outputFile: "e2e/report/results.json" }],
  ],
  use: {
    baseURL: env.webBase,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  // Vite dev server, pointed at the TEST backend (8081), not the everyday one.
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: env.webBase,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_API_PROXY_TARGET: env.apiBase },
  },

  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 14"] },   // WebKit
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },     // Chromium
    },
  ],
});
