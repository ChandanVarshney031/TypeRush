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

export function getCareerStats() {
  if (typeof window === "undefined") return DEFAULT_STATS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATS;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return DEFAULT_STATS;
    }
    return { ...DEFAULT_STATS, ...parsed };
  } catch {
    return DEFAULT_STATS;
  }
}

export function saveRaceResult(result) {
  if (typeof window === "undefined" || !result) return { isNewBest: false, stats: DEFAULT_STATS };
  try {
    const current = getCareerStats();
    const isNewBest = result.wpm > current.bestWpm && result.position === 1;

    const updated = {
      bestWpm: Math.max(current.bestWpm, result.wpm),
      totalRaces: current.totalRaces + 1,
      wins: result.position === 1 ? current.wins + 1 : current.wins,
      losses: result.position !== 1 ? current.losses + 1 : current.losses,
      bestAccuracy: Math.max(current.bestAccuracy, result.accuracy),
      bestCombo: Math.max(current.bestCombo, result.maxCombo),
      history: [
        {
          date: new Date().toISOString(),
          wpm: result.wpm,
          accuracy: result.accuracy,
          position: result.position,
          difficulty: result.difficulty,
          time: result.time,
        },
        ...current.history.slice(0, 19),
      ],
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return { isNewBest, stats: updated };
  } catch {
    return { isNewBest: false, stats: DEFAULT_STATS };
  }
}
