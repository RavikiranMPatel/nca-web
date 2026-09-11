import { execFileSync } from "node:child_process";
import { config } from "./env";

/**
 * Direct access to the local test database, for the few things the API cannot do.
 *
 * Used only for assertions and for teardown of rows with no delete endpoint. The
 * Playwright config refuses to start against anything but localhost, so this can
 * never reach a deployed environment.
 */
export function dbOne(sql: string): string {
  const { db } = config();
  return execFileSync("psql", ["-h", db.host, "-p", db.port, "-U", db.user,
    "-d", db.name, "-tAc", sql], { encoding: "utf8" }).trim();
}

export function dbExec(sql: string): void {
  const { db } = config();
  execFileSync("psql", ["-h", db.host, "-p", db.port, "-U", db.user,
    "-d", db.name, "-v", "ON_ERROR_STOP=1", "-c", sql], { encoding: "utf8" });
}

export function dbCount(sql: string): number {
  return Number(dbOne(sql));
}
