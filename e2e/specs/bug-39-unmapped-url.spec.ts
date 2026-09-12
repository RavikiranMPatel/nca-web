import { test, expect } from "@playwright/test";
import { Api } from "../fixtures/api";
import { config } from "../fixtures/env";

/**
 * BUG-39 — an unmapped URL returned 500 instead of 404.
 *
 * Spring Boot 3.2 sends a request that matches no controller to the
 * static-resource handler, which raises `NoResourceFoundException`.
 * `GlobalExceptionHandler` had no handler for it, so it fell through to the
 * `@ExceptionHandler(Exception.class)` catch-all and every mistyped URL came
 * back as `500 Something went wrong`.
 *
 * Found in Slice 5 while confirming BUG-35's deleted endpoint really was gone:
 * the 500 made a *removed* endpoint indistinguishable from a *broken* one, which
 * is exactly the confusion it must not cause.
 *
 * Reported then rather than fixed, because it changes the response of every
 * unmapped URL in the application. Nothing in the suite asserted 500 for one —
 * checked before the change, the only `500` in `e2e/specs` is
 * `section-05.spec.ts:282`'s `toBeLessThan(500)`, which this can only help.
 *
 * Desktop only: an HTTP contract with no viewport dimension.
 */

const cases: Array<[string, string]> = [
  ["an unmapped path under /api", "/api/admin/cricket/no-such-endpoint-bug39"],
  ["an unmapped path outside /api", "/not-a-route-bug39"],
  ["a real controller with a path it does not map", "/api/admin/cricket/matches/x/y/z/bug39"],
];

test("BUG-39 an unmapped URL returns 404 with the standard error body",
  async ({ }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "HTTP contract, no viewport dimension");

  const api = await Api.login(config().a);

  for (const [what, path] of cases) {
    const res = await api.raw("get", path);

    expect(res.status, `${what}: ${path}`).toBe(404);

    // The standard body every other handler in GlobalExceptionHandler returns.
    // A bare Spring 404 would carry a different shape, and a client parsing
    // `message` should not need a second one.
    const body = res.body as Record<string, unknown>;
    expect(body.status, `${what}: status in the body`).toBe(404);
    expect(body.error, `${what}: error phrase`).toBe("Not Found");
    expect(body.message, `${what}: a message the caller can read`)
      .toBe("The requested resource was not found");
    expect(body.timestamp, `${what}: timestamped like every other error`).toBeTruthy();

    // The regression itself, stated plainly: this is the string the catch-all
    // used to return, and seeing it again means the handler stopped matching.
    expect(body.message, "the 500 catch-all must not be what answered")
      .not.toBe("Something went wrong");
  }

  await api.dispose();
});
