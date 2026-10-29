import { DIFFICULTY_CONFIG } from "./constants";

export class AISimulator {
  constructor(difficultyKey = "normal", passageText = "") {
    this.config = DIFFICULTY_CONFIG[difficultyKey] || DIFFICULTY_CONFIG.normal;
    this.passageText = passageText || "";
    this.totalChars = this.passageText.length;
    
    this.typedChars = 0;
    this.currentWpm = 0;
    this.targetWpm = this.config.targetWpm;
    this.speed = 0;
    this.distance = 0;
    this.isFinished = false;
    this.finishTime = null;

    this.burstTimer = 0;
    this.burstMultiplier = 1.0;
    this.pauseTimer = 0;
  }

  reset(difficultyKey, passageText) {
    if (difficultyKey) {
      this.config = DIFFICULTY_CONFIG[difficultyKey] || DIFFICULTY_CONFIG.normal;
    }
    if (passageText !== undefined) {
      this.passageText = passageText || "";
      this.totalChars = this.passageText.length;
    }
    this.typedChars = 0;
    this.currentWpm = 0;
    this.targetWpm = this.config.targetWpm;
    this.speed = 0;
    this.distance = 0;
    this.isFinished = false;
    this.finishTime = null;
    this.burstTimer = 0;
    this.burstMultiplier = 1.0;
    this.pauseTimer = 0;
  }

  update(dtSeconds = 0, elapsedRaceTime = 0) {
    if (this.isFinished || this.totalChars <= 0 || !dtSeconds || dtSeconds <= 0) return;

    if (this.pauseTimer > 0) {
      this.pauseTimer -= dtSeconds;
      this.currentWpm = Math.max(0, this.currentWpm - dtSeconds * 30);
      this.speed = Math.max(0, this.speed - dtSeconds * 20);
      return;
    }

    if (Math.random() < this.config.errorRate * dtSeconds) {
      this.pauseTimer = 0.2 + Math.random() * 0.4;
      return;
    }

    this.burstTimer -= dtSeconds;
    if (this.burstTimer <= 0) {
      this.burstTimer = 1.5 + Math.random() * 2.5;
      const isBurst = Math.random() < this.config.burstChance;
      this.burstMultiplier = isBurst ? 1.15 + Math.random() * 0.15 : 0.9 + Math.random() * 0.2;
    }

    const dynamicTargetWpm =
      (this.config.minWpm + (this.config.maxWpm - this.config.minWpm) * 0.5) * this.burstMultiplier;

    this.currentWpm += (dynamicTargetWpm - this.currentWpm) * Math.min(1, dtSeconds * 2.0);

    const charsPerSec = (this.currentWpm * 5) / 60;
    const charsTypedThisFrame = charsPerSec * dtSeconds;
    this.typedChars = Math.min(this.totalChars, this.typedChars + charsTypedThisFrame);

    this.distance = (this.typedChars / this.totalChars) * 100;
    this.speed = this.currentWpm * 0.95;

    if (this.typedChars >= this.totalChars && !this.isFinished) {
      this.isFinished = true;
      this.distance = 100;
      this.finishTime = elapsedRaceTime / 1000;
    }
  }

  getState() {
    return {
      distance: this.distance,
      speed: this.speed,
      wpm: Math.round(this.currentWpm),
      isFinished: this.isFinished,
      finishTime: this.finishTime,
      config: this.config,
    };
  }
}
