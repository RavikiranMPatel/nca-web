/**
 * Idempotency keys for scoring writes, and the record of a write in flight.
 *
 * A scorer whose post times out cannot tell whether the ball landed. Tapping again wrote
 * a second delivery that did not even look like a duplicate. The key lets the server
 * recognise the retry and return the state it already holds (V74).
 */

const PENDING_PREFIX = "nca_pending_ball_";

/**
 * A v4 uuid that works on plain HTTP.
 *
 * crypto.randomUUID() is gated to secure contexts. Measured in headless Chrome:
 *
 *   http://127.0.0.1:8777   isSecureContext true   randomUUID -> "21ee3132-d412-4e5c-…"
 *   http://192.168.1.16:8777 isSecureContext false  randomUUID -> TypeError:
 *                                                    crypto.randomUUID is not a function
 *
 * A scorer at a ground reaching the laptop over the LAN by IP is on plain HTTP, so the
 * direct call throws at tap time — the worst possible place. getRandomValues is NOT
 * gated and works in both, so it is the fallback. Note dev on localhost is a secure
 * context and would never reproduce this, which is how it would have shipped.
 */
export function newBallId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();

  const b = new Uint8Array(16);
  c.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10x
  const h = [...b].map((x) => x.toString(16).padStart(2, "0"));
  return (
    h.slice(0, 4).join("") + "-" + h.slice(4, 6).join("") + "-" +
    h.slice(6, 8).join("") + "-" + h.slice(8, 10).join("") + "-" +
    h.slice(10, 16).join("")
  );
}

export type PendingBall = { ballId: string; at: number };

/**
 * Written before the POST, cleared on success. Survives a refresh, which is the point:
 * component state dies exactly when it is needed, because refresh-after-a-hang is the
 * likeliest route to a re-tap.
 *
 * localStorage can throw (private mode, blocked site data), and a scorer must never lose
 * a ball to a storage error — every access is guarded and degrades to today's behaviour.
 */
export function rememberPendingBall(matchId: string, ballId: string): void {
  try {
    localStorage.setItem(
      PENDING_PREFIX + matchId,
      JSON.stringify({ ballId, at: Date.now() } satisfies PendingBall),
    );
  } catch {
    /* no key persisted; the post still carries one, only the refresh case is lost */
  }
}

export function readPendingBall(matchId: string): PendingBall | null {
  try {
    const raw = localStorage.getItem(PENDING_PREFIX + matchId);
    return raw ? (JSON.parse(raw) as PendingBall) : null;
  } catch {
    return null;
  }
}

export function clearPendingBall(matchId: string): void {
  try {
    localStorage.removeItem(PENDING_PREFIX + matchId);
  } catch {
    /* nothing to do */
  }
}
