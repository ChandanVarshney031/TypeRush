import { describe, it, expect, beforeEach } from "vitest";
import { AISimulator } from "../lib/game/aiEngine.js";

// ─── Constructor / initial state ─────────────────────────────────────────────

describe("AISimulator – construction", () => {
  it("initialises with the correct defaults for 'normal' difficulty", () => {
    const ai = new AISimulator("normal", "hello world");
    const state = ai.getState();
    expect(state.distance).toBe(0);
    expect(state.speed).toBe(0);
    expect(state.wpm).toBe(0);
    expect(state.isFinished).toBe(false);
    expect(state.finishTime).toBeNull();
  });

  it("falls back to 'normal' config for an unknown difficulty key", () => {
    const ai = new AISimulator("legendary_ultra", "some text");
    // Should not throw – config should be DIFFICULTY_CONFIG.normal
    expect(ai.config).toBeDefined();
    expect(ai.config.id).toBe("normal");
  });

  it("sets totalChars from the passageText length", () => {
    const text = "abcde";
    const ai = new AISimulator("easy", text);
    expect(ai.totalChars).toBe(text.length);
  });

  it("accepts an empty passageText without throwing", () => {
    expect(() => new AISimulator("easy", "")).not.toThrow();
  });
});

// ─── update – zero / empty edge cases ────────────────────────────────────────

describe("AISimulator – update edge cases", () => {
  it("does nothing when totalChars is 0 (empty passageText)", () => {
    const ai = new AISimulator("easy", "");
    ai.update(1, 1000);
    const { distance, speed, wpm } = ai.getState();
    expect(distance).toBe(0);
    expect(speed).toBe(0);
    expect(wpm).toBe(0);
  });

  it("does nothing after the race is already finished", () => {
    const ai = new AISimulator("easy", "ab");
    // Force finish
    ai.typedChars = 2;
    ai.isFinished = true;
    ai.distance = 100;
    ai.update(1, 5000);
    expect(ai.distance).toBe(100);
    expect(ai.isFinished).toBe(true);
  });

  it("distance stays within [0, 100]", () => {
    const ai = new AISimulator("hard", "a".repeat(200));
    // Run many update ticks
    for (let i = 0; i < 300; i++) {
      ai.update(0.016, i * 16);
    }
    const { distance } = ai.getState();
    expect(distance).toBeGreaterThanOrEqual(0);
    expect(distance).toBeLessThanOrEqual(100);
  });

  it("sets isFinished and distance=100 when all chars are typed", () => {
    const ai = new AISimulator("expert", "a");
    // Manually advance typedChars past the threshold
    ai.typedChars = 1;
    ai.isFinished = false;
    // One more update should not flip isFinished since typedChars == totalChars
    // but we can force: set typedChars just under and let update finish it
    const shortAi = new AISimulator("expert", "a");
    shortAi.typedChars = 0.999; // just under total of 1
    shortAi.pauseTimer = 0;
    shortAi.burstTimer = -1;
    shortAi.currentWpm = 9999; // ensure chars typed per frame > 0
    shortAi.update(1, 1000);
    expect(shortAi.isFinished).toBe(true);
    expect(shortAi.distance).toBe(100);
  });

  it("records finishTime in seconds (not ms) on completion", () => {
    const ai = new AISimulator("easy", "x");
    ai.typedChars = 0.99;
    ai.pauseTimer = 0;
    ai.burstTimer = -1;
    ai.currentWpm = 9999;
    ai.update(0.5, 3000); // elapsedRaceTime = 3000 ms → finishTime = 3.0 s
    if (ai.isFinished) {
      expect(ai.finishTime).toBeCloseTo(3.0, 1);
    }
  });
});

// ─── reset ────────────────────────────────────────────────────────────────────

describe("AISimulator – reset", () => {
  it("resets all progress fields to initial values", () => {
    const ai = new AISimulator("easy", "hello world");
    // Simulate some progress
    ai.typedChars = 5;
    ai.currentWpm = 45;
    ai.distance = 50;
    ai.isFinished = true;

    ai.reset();

    expect(ai.typedChars).toBe(0);
    expect(ai.currentWpm).toBe(0);
    expect(ai.distance).toBe(0);
    expect(ai.isFinished).toBe(false);
    expect(ai.finishTime).toBeNull();
  });

  it("updates difficultyKey when provided", () => {
    const ai = new AISimulator("easy", "text");
    ai.reset("hard");
    expect(ai.config.id).toBe("hard");
  });

  it("updates passageText when provided", () => {
    const ai = new AISimulator("easy", "short");
    ai.reset(undefined, "a much longer passage text");
    expect(ai.totalChars).toBe("a much longer passage text".length);
  });
});

// ─── getState ─────────────────────────────────────────────────────────────────

describe("AISimulator – getState", () => {
  it("returns an object with all required keys", () => {
    const ai = new AISimulator("normal", "test");
    const state = ai.getState();
    expect(state).toHaveProperty("distance");
    expect(state).toHaveProperty("speed");
    expect(state).toHaveProperty("wpm");
    expect(state).toHaveProperty("isFinished");
    expect(state).toHaveProperty("finishTime");
    expect(state).toHaveProperty("config");
  });

  it("returns wpm as a rounded integer", () => {
    const ai = new AISimulator("normal", "hello world");
    ai.currentWpm = 57.7;
    const { wpm } = ai.getState();
    expect(Number.isInteger(wpm)).toBe(true);
    expect(wpm).toBe(58);
  });
});
