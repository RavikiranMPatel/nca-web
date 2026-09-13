import { test, expect } from "@playwright/test";
import { makeTagger, newPhoneTrunk, fixturePhone } from "../fixtures/tag";

/**
 * BUG-54 — the shared fixture tag must be unique across WORKERS, not just within
 * one.
 *
 * `createScoredTournament` tags every row it creates and `removeEverything`
 * deletes by matching on that tag, so the tag is the entire boundary between one
 * worker's teardown and another worker's data. It was
 * `Date.now() % 1000000` plus a counter held in MODULE state — and module state
 * is per process, so every worker's counter starts at 0. Two projects starting in
 * the same millisecond therefore produced byte-identical tags, and the first
 * teardown deleted the other's rows: seen as a 404 adding a player to a squad
 * that had just been created, and as a foreign-key error deleting a match another
 * project's fixture still referenced.
 *
 * Two independent taggers reading the same clock IS two workers starting
 * together. That is the whole bug, and it needs no subprocess to state.
 */
test.describe("BUG-54 — fixture tags", () => {
  test("two workers starting in the same millisecond get different tags", () => {
    const frozen = () => 1_757_000_000_000; // one instant, both workers
    const workerA = makeTagger(frozen);
    const workerB = makeTagger(frozen);

    const a = workerA();
    const b = workerB();

    expect(
      a,
      "two workers that start together must not tag their rows identically — " +
        "teardown matches on this, so equal tags means one worker deletes the other's data",
    ).not.toBe(b);
  });

  test("a worker's own tags never repeat", () => {
    const tag = makeTagger();
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) seen.add(tag());
    expect(seen.size, "every tag from one worker must be distinct").toBe(5000);
  });

  test("tags stay distinct across many simultaneous workers", () => {
    const frozen = () => 1_757_000_000_000;
    const first = Array.from({ length: 64 }, () => makeTagger(frozen)());
    expect(new Set(first).size, "64 workers starting together must get 64 distinct tags")
      .toBe(64);
  });
});

/**
 * The same fixture's phone numbers, which had a quieter version of the same
 * defect: they were built from the tag and then truncated to ten characters,
 * which cut off the player index. Twenty-two players shared three numbers.
 *
 * Nothing enforced phone uniqueness on players, so this never failed — it simply
 * meant the fixture's "22 distinct players" were not distinct in the one field a
 * uniqueness constraint would key on.
 */
test.describe("BUG-54 — fixture phone numbers", () => {
  test("every player in a fixture gets a distinct, valid phone", () => {
    const trunk = newPhoneTrunk();
    const phones = Array.from({ length: 22 }, (_, i) => fixturePhone(trunk, i));

    expect(new Set(phones).size, "22 players must get 22 distinct phones").toBe(22);
    for (const phone of phones) {
      expect(phone, `${phone} must be 10 digits starting 9`).toMatch(/^9\d{9}$/);
    }
  });

  test("two fixtures running together do not share a phone trunk", () => {
    const trunks = new Set(Array.from({ length: 200 }, () => newPhoneTrunk()));
    // 7 random digits: 200 draws from 9,000,000 collide vanishingly rarely.
    expect(trunks.size, "phone trunks must not be drawn from a per-process clock")
      .toBeGreaterThan(195);
  });
});
