export function calculateWpm(correctChars, elapsedMs) {
  if (!elapsedMs || elapsedMs < 500 || correctChars <= 0) return 0;
  const elapsedMinutes = elapsedMs / 60000;
  const rawWpm = correctChars / 5 / elapsedMinutes;
  return Math.round(Math.min(300, Math.max(0, rawWpm)));
}

export function calculateAccuracy(correctChars, totalKeystrokes) {
  if (totalKeystrokes <= 0) return 100;
  const acc = (correctChars / totalKeystrokes) * 100;
  return Math.max(0, Math.min(100, Math.round(acc * 10) / 10));
}

export function smoothMetric(currentSmoothed, rawValue, alpha = 0.25) {
  if (currentSmoothed === 0) return rawValue;
  return Math.round((alpha * rawValue + (1 - alpha) * currentSmoothed) * 10) / 10;
}

export function buildCharacterStream(text = "", typedText = "", errorIndices = new Set()) {
  if (!text) return [];
  const safeTyped = typedText || "";
  const safeErrors = errorIndices instanceof Set ? errorIndices : new Set(errorIndices || []);
  const chars = [];
  for (let i = 0; i < text.length; i++) {
    const expectedChar = text[i];
    let status = "untyped";
    let typedChar = null;

    if (i < safeTyped.length) {
      typedChar = safeTyped[i];
      if (typedChar === expectedChar && !safeErrors.has(i)) {
        status = "correct";
      } else {
        status = "incorrect";
      }
    } else if (i === safeTyped.length) {
      status = "current";
    }

    chars.push({
      index: i,
      char: expectedChar,
      typedChar,
      status,
      isSpace: expectedChar === " ",
    });
  }
  return chars;
}
