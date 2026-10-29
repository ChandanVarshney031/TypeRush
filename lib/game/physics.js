import { NITRO_CONFIG } from "./constants";

export function calculateTargetSpeed({
  wpm = 0,
  accuracy = 100,
  combo = 0,
  isNitroActive = false,
} = {}) {
  if (wpm <= 0) return 0;

  const baseSpeed = wpm * 0.95;
  const accuracyBonus = accuracy >= 98 ? baseSpeed * 0.15 : accuracy >= 95 ? baseSpeed * 0.08 : 0;
  const comboBonus = combo >= 30 ? baseSpeed * 0.25 : combo >= 20 ? baseSpeed * 0.15 : combo >= 10 ? baseSpeed * 0.08 : 0;
  const nitroMultiplier = isNitroActive ? NITRO_CONFIG.BOOST_MULTIPLIER : 1.0;

  const totalSpeed = (baseSpeed + accuracyBonus + comboBonus) * nitroMultiplier;
  return Math.min(240, Math.max(0, totalSpeed));
}

export function lerpSpeed(currentSpeed = 0, targetSpeed = 0, dtSeconds = 0, accelRate = 3.5, decelRate = 2.0) {
  if (dtSeconds <= 0) return currentSpeed;
  const rate = targetSpeed > currentSpeed ? accelRate : decelRate;
  const factor = Math.min(1, Math.max(0, dtSeconds * rate));
  return currentSpeed + (targetSpeed - currentSpeed) * factor;
}
