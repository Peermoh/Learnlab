// Progress lives in localStorage only (no accounts yet).
// Levels: 0 new · 1 seen · 2 practised · 3 mastered

const KEY = 'swar.v1';
let state = { mastery: {} };

try {
  const raw = localStorage.getItem(KEY);
  if (raw) state = { ...state, ...JSON.parse(raw) };
} catch {
  /* storage blocked: progress simply won't persist */
}

const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
};

export const getLevel = (id) => state.mastery[id] || 0;

export function raiseLevel(id, level) {
  if (level > getLevel(id)) {
    state.mastery[id] = level;
    save();
    return true;
  }
  return false;
}

export function resetProgress() {
  state = { mastery: {} };
  save();
}

export function progressOf(items) {
  const mastered = items.filter((i) => getLevel(i.id) >= 3).length;
  const started = items.filter((i) => getLevel(i.id) >= 1).length;
  return { mastered, started, total: items.length, pct: items.length ? Math.round((mastered / items.length) * 100) : 0 };
}
