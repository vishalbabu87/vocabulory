const KEYS = {
  words: 'vocabforge.words',
  results: 'vocabforge.results',
  weakWords: 'vocabforge.weakWords'
};

function hasStorage() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function read(key, fallback) {
  if (!hasStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  if (!hasStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function sanitizeWord(item) {
  return {
    word: String(item?.word || '').trim(),
    meaning: String(item?.meaning || '').trim(),
    options: Array.isArray(item?.options)
      ? item.options.map((value) => String(value).trim()).filter(Boolean).slice(0, 4)
      : [],
    category: String(item?.category || 'Vocabulary').trim() || 'Vocabulary'
  };
}

export function getWords() {
  return read(KEYS.words, []);
}

export function getResults() {
  return read(KEYS.results, []);
}

export function getWeakWords() {
  return read(KEYS.weakWords, {});
}

export function saveWords(words) {
  const current = getWords();
  const incoming = (Array.isArray(words) ? words : [])
    .map(sanitizeWord)
    .filter((item) => item.word && item.meaning && item.options.length === 4);

  const map = new Map();
  current.forEach((item) => map.set(String(item.word || '').toLowerCase(), sanitizeWord(item)));
  incoming.forEach((item) => map.set(item.word.toLowerCase(), item));

  const merged = Array.from(map.values());
  write(KEYS.words, merged);
  return merged;
}

export function saveResult(result) {
  const entry = {
    score: Number(result?.score || 0),
    total: Number(result?.total || 0),
    history: Array.isArray(result?.history) ? result.history : [],
    timestamp: new Date().toISOString()
  };

  const results = [entry, ...getResults()];
  write(KEYS.results, results);

  const weakWords = { ...getWeakWords() };
  entry.history.forEach((row) => {
    const word = String(row?.word || '').trim();
    if (!word) return;
    const key = word.toLowerCase();

    if (!weakWords[key]) {
      weakWords[key] = { word, misses: 0, lastMissedAt: null };
    }

    if (!row?.isCorrect) {
      weakWords[key].misses += 1;
      weakWords[key].lastMissedAt = new Date().toISOString();
    }
  });

  write(KEYS.weakWords, weakWords);
  return entry;
}

export function getPrioritizedWords(limit = 20) {
  const words = getWords();
  const weak = getWeakWords();

  return [...words]
    .sort((a, b) => {
      const aMiss = weak[String(a.word || '').toLowerCase()]?.misses || 0;
      const bMiss = weak[String(b.word || '').toLowerCase()]?.misses || 0;
      return bMiss - aMiss;
    })
    .slice(0, limit);
}
