import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getCareerStats, saveRaceResult } from "../lib/game/statsStorage.js";

// ─── localStorage mock ───────────────────────────────────────────────────────
// statsStorage.js guards with `typeof window === "undefined"`, so we need to
// make `window` and `localStorage` available in the Node test environment.

const STORAGE_KEY = "typeracer_career_stats";

const DEFAULT_STATS = {
  bestWpm: 0,
  totalRaces: 0,
  wins: 0,
  losses: 0,
  bestAccuracy: 0,
  bestCombo: 0,
  history: [],
};

function makeLocalStorageMock() {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    _store: () => store,
  };
}

// Attach window + localStorage globals before each test and restore after.
let localStorageMock;

beforeEach(() => {
  localStorageMock = makeLocalStorageMock();
  // Expose `window` so the `typeof window === "undefined"` guard passes.
  globalThis.window = globalThis;
  globalThis.localStorage = localStorageMock;
});

afterEach(() => {
  delete globalThis.window;
  delete globalThis.localStorage;
  vi.restoreAllMocks();
});

// ─── getCareerStats ───────────────────────────────────────────────────────────

describe("getCareerStats", () => {
  it("returns DEFAULT_STATS when localStorage is empty", () => {
    expect(getCareerStats()).toEqual(DEFAULT_STATS);
  });

  it("returns DEFAULT_STATS when window is undefined (SSR mode)", () => {
    delete globalThis.window;
    expect(getCareerStats()).toEqual(DEFAULT_STATS);
  });

  it("returns merged stats when valid JSON exists in localStorage", () => {
    const saved = { bestWpm: 120, totalRaces: 5, wins: 3, losses: 2, bestAccuracy: 98, bestCombo: 25, history: [] };
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(saved));
    const stats = getCareerStats();
    expect(stats.bestWpm).toBe(120);
    expect(stats.totalRaces).toBe(5);
  });

  it("fills in missing fields from DEFAULT_STATS via spread merge", () => {
    // Stored object missing some keys
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify({ bestWpm: 50 }));
    const stats = getCareerStats();
    expect(stats.totalRaces).toBe(0);
    expect(stats.history).toEqual([]);
  });

  it("returns DEFAULT_STATS when localStorage contains corrupted JSON syntax", () => {
    localStorageMock.setItem(STORAGE_KEY, "NOT_VALID_JSON{{{{");
    expect(getCareerStats()).toEqual(DEFAULT_STATS);
  });

  it("returns DEFAULT_STATS when localStorage contains null bytes / garbage", () => {
    localStorageMock.setItem(STORAGE_KEY, "\0\0\0");
    expect(getCareerStats()).toEqual(DEFAULT_STATS);
  });

  it("returns DEFAULT_STATS when localStorage contains a non-object JSON array", () => {
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3]));
    expect(getCareerStats()).toEqual(DEFAULT_STATS);
  });

  it("returns DEFAULT_STATS when localStorage contains a JSON primitive number", () => {
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(12345));
    expect(getCareerStats()).toEqual(DEFAULT_STATS);
  });

  it("returns DEFAULT_STATS when localStorage contains a JSON string primitive", () => {
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify("corrupted-string"));
    expect(getCareerStats()).toEqual(DEFAULT_STATS);
  });

  it("returns DEFAULT_STATS when localStorage contains JSON null literal", () => {
    localStorageMock.setItem(STORAGE_KEY, "null");
    expect(getCareerStats()).toEqual(DEFAULT_STATS);
  });

  it("returns DEFAULT_STATS when localStorage.getItem throws", () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error("Storage quota exceeded");
    });
    expect(getCareerStats()).toEqual(DEFAULT_STATS);
  });
});

// ─── saveRaceResult ───────────────────────────────────────────────────────────

describe("saveRaceResult", () => {
  const baseResult = {
    wpm: 80,
    accuracy: 95,
    position: 1,
    maxCombo: 20,
    difficulty: "normal",
    time: 45.2,
  };

  it("increments totalRaces on each call", () => {
    saveRaceResult(baseResult);
    const { stats } = saveRaceResult(baseResult);
    expect(stats.totalRaces).toBe(2);
  });

  it("increments wins when position === 1", () => {
    const { stats } = saveRaceResult({ ...baseResult, position: 1 });
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(0);
  });

  it("increments losses when position !== 1", () => {
    const { stats } = saveRaceResult({ ...baseResult, position: 2 });
    expect(stats.losses).toBe(1);
    expect(stats.wins).toBe(0);
  });

  it("updates bestWpm when new wpm is higher", () => {
    saveRaceResult({ ...baseResult, wpm: 60 });
    const { stats } = saveRaceResult({ ...baseResult, wpm: 100 });
    expect(stats.bestWpm).toBe(100);
  });

  it("does not lower bestWpm when new wpm is lower", () => {
    saveRaceResult({ ...baseResult, wpm: 100 });
    const { stats } = saveRaceResult({ ...baseResult, wpm: 60 });
    expect(stats.bestWpm).toBe(100);
  });

  it("signals isNewBest only when position === 1 and wpm > current bestWpm", () => {
    const { isNewBest } = saveRaceResult({ ...baseResult, wpm: 90, position: 1 });
    expect(isNewBest).toBe(true);
  });

  it("does NOT signal isNewBest when position !== 1 even if wpm is higher", () => {
    const { isNewBest } = saveRaceResult({ ...baseResult, wpm: 200, position: 2 });
    expect(isNewBest).toBe(false);
  });

  it("keeps history limited to last 20 entries", () => {
    // Save 25 races
    for (let i = 0; i < 25; i++) {
      saveRaceResult({ ...baseResult, wpm: i + 1 });
    }
    const { stats } = saveRaceResult(baseResult);
    expect(stats.history.length).toBeLessThanOrEqual(20);
  });

  it("prepends the newest result to history", () => {
    saveRaceResult({ ...baseResult, wpm: 50 });
    const { stats } = saveRaceResult({ ...baseResult, wpm: 75 });
    expect(stats.history[0].wpm).toBe(75);
  });

  it("returns DEFAULT_STATS gracefully when result is null/undefined", () => {
    const { isNewBest, stats } = saveRaceResult(null);
    expect(isNewBest).toBe(false);
    expect(stats).toEqual(DEFAULT_STATS);
  });

  it("returns DEFAULT_STATS gracefully when window is undefined (SSR mode)", () => {
    delete globalThis.window;
    const { isNewBest, stats } = saveRaceResult(baseResult);
    expect(isNewBest).toBe(false);
    expect(stats).toEqual(DEFAULT_STATS);
  });

  it("returns DEFAULT_STATS gracefully when localStorage.setItem throws", () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    const { isNewBest, stats } = saveRaceResult(baseResult);
    expect(isNewBest).toBe(false);
    expect(stats).toEqual(DEFAULT_STATS);
  });

  it("updates bestAccuracy when new accuracy is higher", () => {
    saveRaceResult({ ...baseResult, accuracy: 85 });
    const { stats } = saveRaceResult({ ...baseResult, accuracy: 99 });
    expect(stats.bestAccuracy).toBe(99);
  });

  it("updates bestCombo when new maxCombo is higher", () => {
    saveRaceResult({ ...baseResult, maxCombo: 10 });
    const { stats } = saveRaceResult({ ...baseResult, maxCombo: 40 });
    expect(stats.bestCombo).toBe(40);
  });
});
