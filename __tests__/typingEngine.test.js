import { describe, it, expect } from "vitest";
import {
  calculateWpm,
  calculateAccuracy,
  smoothMetric,
  buildCharacterStream,
} from "../lib/game/typingEngine.js";

// ─── calculateWpm ────────────────────────────────────────────────────────────

describe("calculateWpm", () => {
  it("returns 0 when elapsedMs is 0", () => {
    expect(calculateWpm(100, 0)).toBe(0);
  });

  it("returns 0 when elapsedMs is falsy (undefined)", () => {
    expect(calculateWpm(100, undefined)).toBe(0);
  });

  it("returns 0 when elapsedMs is less than 500 ms (debounce guard)", () => {
    expect(calculateWpm(100, 499)).toBe(0);
  });

  it("returns 0 when correctChars is 0", () => {
    expect(calculateWpm(0, 60000)).toBe(0);
  });

  it("returns 0 when correctChars is negative", () => {
    expect(calculateWpm(-5, 60000)).toBe(0);
  });

  it("calculates correct WPM for standard input (100 chars in 1 minute)", () => {
    // 100 chars / 5 = 20 words, elapsed = 60 000 ms = 1 min → 20 WPM
    expect(calculateWpm(100, 60000)).toBe(20);
  });

  it("calculates correct WPM for 250 chars in 1 minute", () => {
    // 250 / 5 = 50 words in 1 min → 50 WPM
    expect(calculateWpm(250, 60000)).toBe(50);
  });

  it("caps WPM at 300", () => {
    // An absurd amount of chars in a short time should be capped at 300
    expect(calculateWpm(999999, 60000)).toBe(300);
  });

  it("returns a whole number", () => {
    const wpm = calculateWpm(123, 45000);
    expect(Number.isInteger(wpm)).toBe(true);
  });
});

// ─── calculateAccuracy ───────────────────────────────────────────────────────

describe("calculateAccuracy", () => {
  it("returns 100 when totalKeystrokes is 0 (no typing yet)", () => {
    expect(calculateAccuracy(0, 0)).toBe(100);
  });

  it("returns 100 when all keystrokes are correct", () => {
    expect(calculateAccuracy(50, 50)).toBe(100);
  });

  it("returns 0 when correctChars is 0 and there are keystrokes", () => {
    expect(calculateAccuracy(0, 20)).toBe(0);
  });

  it("calculates a mid-range accuracy value correctly", () => {
    // 75 correct out of 100 → 75.0
    expect(calculateAccuracy(75, 100)).toBe(75);
  });

  it("rounds to one decimal place", () => {
    // 1 correct out of 3 → 33.3...% should be 33.3
    expect(calculateAccuracy(1, 3)).toBe(33.3);
  });

  it("never exceeds 100", () => {
    expect(calculateAccuracy(200, 100)).toBeLessThanOrEqual(100);
  });

  it("never goes below 0", () => {
    expect(calculateAccuracy(-50, 100)).toBeGreaterThanOrEqual(0);
  });
});

// ─── smoothMetric ────────────────────────────────────────────────────────────

describe("smoothMetric", () => {
  it("returns rawValue when currentSmoothed is 0 (first reading)", () => {
    expect(smoothMetric(0, 80)).toBe(80);
  });

  it("applies exponential smoothing correctly with default alpha 0.25", () => {
    // alpha=0.25 → 0.25*80 + 0.75*60 = 20 + 45 = 65.0
    expect(smoothMetric(60, 80)).toBe(65);
  });

  it("applies exponential smoothing with a custom alpha", () => {
    // alpha=0.5 → 0.5*100 + 0.5*50 = 75.0
    expect(smoothMetric(50, 100, 0.5)).toBe(75);
  });

  it("returns a value rounded to one decimal place", () => {
    const result = smoothMetric(33, 67, 0.3);
    const decimals = (result.toString().split(".")[1] || "").length;
    expect(decimals).toBeLessThanOrEqual(1);
  });
});

// ─── buildCharacterStream ────────────────────────────────────────────────────

describe("buildCharacterStream", () => {
  it("returns an empty array for an empty text", () => {
    expect(buildCharacterStream("", "")).toEqual([]);
  });

  it("marks all chars beyond the cursor as untyped when nothing has been typed", () => {
    const stream = buildCharacterStream("hello", "");
    // Index 0 is the cursor position (status = "current").
    // All subsequent characters should be "untyped".
    expect(stream[0].status).toBe("current");
    expect(stream.slice(1).every((c) => c.status === "untyped")).toBe(true);
  });

  it("marks the character at the cursor position as current", () => {
    const stream = buildCharacterStream("hello", "he");
    expect(stream[2].status).toBe("current");
  });

  it("marks correct characters as correct", () => {
    const stream = buildCharacterStream("hello", "hel");
    expect(stream[0].status).toBe("correct");
    expect(stream[1].status).toBe("correct");
    expect(stream[2].status).toBe("correct");
  });

  it("marks wrong characters as incorrect", () => {
    const stream = buildCharacterStream("hello", "hxllo");
    expect(stream[1].status).toBe("incorrect");
  });

  it("marks a character as incorrect when it is in errorIndices", () => {
    const errorIndices = new Set([0]);
    const stream = buildCharacterStream("hello", "hello", errorIndices);
    expect(stream[0].status).toBe("incorrect");
  });

  it("sets isSpace correctly for space characters", () => {
    const stream = buildCharacterStream("a b", "");
    expect(stream[1].isSpace).toBe(true);
    expect(stream[0].isSpace).toBe(false);
  });

  it("includes index, char, typedChar fields in each entry", () => {
    const stream = buildCharacterStream("ab", "a");
    expect(stream[0]).toMatchObject({ index: 0, char: "a", typedChar: "a" });
    expect(stream[1]).toMatchObject({ index: 1, char: "b", typedChar: null });
  });

  it("handles text longer than typedText gracefully", () => {
    const stream = buildCharacterStream("hello world", "hello");
    expect(stream).toHaveLength(11);
  });
});
