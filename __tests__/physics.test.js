import { describe, it, expect } from "vitest";
import { calculateTargetSpeed, lerpSpeed } from "../lib/game/physics.js";

// ─── calculateTargetSpeed ────────────────────────────────────────────────────

describe("calculateTargetSpeed", () => {
  it("returns 0 when called with no arguments", () => {
    expect(calculateTargetSpeed()).toBe(0);
  });

  it("returns 0 when wpm is 0", () => {
    expect(calculateTargetSpeed({ wpm: 0 })).toBe(0);
  });

  it("returns 0 when wpm is negative", () => {
    expect(calculateTargetSpeed({ wpm: -10 })).toBe(0);
  });

  it("calculates base speed as wpm * 0.95 without bonuses", () => {
    // accuracy=90 (no bonus), combo=0 (no bonus), nitro off
    const speed = calculateTargetSpeed({ wpm: 60, accuracy: 90, combo: 0 });
    expect(speed).toBeCloseTo(60 * 0.95, 5);
  });

  it("applies 15% accuracy bonus when accuracy >= 98", () => {
    const base = 60 * 0.95;
    const expected = base + base * 0.15;
    expect(calculateTargetSpeed({ wpm: 60, accuracy: 98, combo: 0 })).toBeCloseTo(expected, 5);
  });

  it("applies 8% accuracy bonus when accuracy >= 95 but < 98", () => {
    const base = 60 * 0.95;
    const expected = base + base * 0.08;
    expect(calculateTargetSpeed({ wpm: 60, accuracy: 95, combo: 0 })).toBeCloseTo(expected, 5);
  });

  it("applies no accuracy bonus when accuracy < 95", () => {
    const base = 60 * 0.95;
    expect(calculateTargetSpeed({ wpm: 60, accuracy: 94, combo: 0 })).toBeCloseTo(base, 5);
  });

  it("applies 8% combo bonus when combo >= 10 but < 20", () => {
    const base = 60 * 0.95;
    const expected = base + base * 0.08;
    expect(calculateTargetSpeed({ wpm: 60, accuracy: 90, combo: 10 })).toBeCloseTo(expected, 5);
  });

  it("applies 15% combo bonus when combo >= 20 but < 30", () => {
    const base = 60 * 0.95;
    const expected = base + base * 0.15;
    expect(calculateTargetSpeed({ wpm: 60, accuracy: 90, combo: 20 })).toBeCloseTo(expected, 5);
  });

  it("applies 25% combo bonus when combo >= 30", () => {
    const base = 60 * 0.95;
    const expected = base + base * 0.25;
    expect(calculateTargetSpeed({ wpm: 60, accuracy: 90, combo: 30 })).toBeCloseTo(expected, 5);
  });

  it("applies nitro multiplier (1.65x) when isNitroActive is true", () => {
    const base = 60 * 0.95;
    const expected = base * 1.65;
    expect(
      calculateTargetSpeed({ wpm: 60, accuracy: 90, combo: 0, isNitroActive: true })
    ).toBeCloseTo(expected, 5);
  });

  it("caps speed at 240", () => {
    // Very high WPM should be capped
    expect(
      calculateTargetSpeed({ wpm: 999, accuracy: 100, combo: 50, isNitroActive: true })
    ).toBe(240);
  });

  it("never returns a negative value", () => {
    expect(calculateTargetSpeed({ wpm: 0, accuracy: 100, combo: 30 })).toBeGreaterThanOrEqual(0);
  });

  it("uses safe defaults when optional fields are omitted", () => {
    // Only wpm provided; accuracy defaults to 100, combo defaults to 0
    const speed = calculateTargetSpeed({ wpm: 50 });
    // accuracy=100 triggers 15% bonus; combo=0 no bonus; no nitro
    const base = 50 * 0.95;
    const expected = base + base * 0.15;
    expect(speed).toBeCloseTo(expected, 5);
  });
});

// ─── lerpSpeed ───────────────────────────────────────────────────────────────

describe("lerpSpeed", () => {
  it("returns targetSpeed when dtSeconds is large enough to fully close the gap", () => {
    // factor = min(1, 10 * 3.5) = 1 → result = target
    expect(lerpSpeed(0, 100, 10)).toBe(100);
  });

  it("interpolates between currentSpeed and targetSpeed when accelerating", () => {
    // dt=0.1, accelRate=3.5 → factor=0.35 → 0 + (100-0)*0.35 = 35
    expect(lerpSpeed(0, 100, 0.1)).toBeCloseTo(35, 5);
  });

  it("decelerates at a slower rate (decelRate) when target < current", () => {
    // dt=0.1, decelRate=2.0 → factor=0.2 → 100 + (0-100)*0.2 = 80
    expect(lerpSpeed(100, 0, 0.1)).toBeCloseTo(80, 5);
  });

  it("returns currentSpeed when dtSeconds is 0 (no time has passed)", () => {
    // factor = min(1, 0*3.5) = 0 → currentSpeed + 0 = currentSpeed
    expect(lerpSpeed(60, 100, 0)).toBeCloseTo(60, 5);
  });

  it("returns currentSpeed when dtSeconds is negative", () => {
    expect(lerpSpeed(60, 100, -1)).toBeCloseTo(60, 5);
  });

  it("handles equal currentSpeed and targetSpeed (no change)", () => {
    expect(lerpSpeed(50, 50, 0.5)).toBeCloseTo(50, 5);
  });

  it("accepts custom accelRate and decelRate", () => {
    // accelRate=10, dt=0.1 → factor=min(1,1)=1 → reaches target immediately
    expect(lerpSpeed(0, 80, 0.1, 10, 2.0)).toBeCloseTo(80, 5);
  });

  it("defaults to 0 when called with no arguments", () => {
    expect(lerpSpeed()).toBe(0);
  });
});
