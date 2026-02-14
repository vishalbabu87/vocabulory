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
const WORDS_KEY = 'vocabforge.words';
const RESULTS_KEY = 'vocabforge.results';
const WEAK_WORDS_KEY = 'vocabforge.weakWords';

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;

const readJson = (key, fallback) => {
  if (!canUseStorage()) return fallback;
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
};

const writeJson = (key, value) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const normalizeWord = (item) => ({
  word: String(item?.word || '').trim(),
  meaning: String(item?.meaning || '').trim(),
  options: Array.isArray(item?.options) ? item.options.map((x) => String(x).trim()).filter(Boolean).slice(0, 4) : [],
  category: String(item?.category || 'Vocabulary').trim() || 'Vocabulary'
});

export const getWords = () => readJson(WORDS_KEY, []);
export const getResults = () => readJson(RESULTS_KEY, []);
export const getWeakWordsMap = () => readJson(WEAK_WORDS_KEY, {});

export function saveWords(words) {
  const existing = getWords();
  const incoming = (Array.isArray(words) ? words : []).map(normalizeWord).filter((w) => w.word && w.meaning && w.options.length === 4);

  const byWord = new Map(existing.map((w) => [String(w.word || '').toLowerCase(), normalizeWord(w)]));
  incoming.forEach((item) => {
    byWord.set(item.word.toLowerCase(), item);
  });

  const merged = Array.from(byWord.values());
  writeJson(WORDS_KEY, merged);
  return merged;
}

export function saveResult(result) {
  const entry = {
  const existing = getResults();
  const record = {
    ...result,
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
  const updated = [record, ...existing];
  writeJson(RESULTS_KEY, updated);

  const weakWords = { ...getWeakWordsMap() };
  record.history.forEach((entry) => {
    const key = String(entry?.word || '').toLowerCase();
    if (!key) return;

    if (!weakWords[key]) {
      weakWords[key] = { word: entry.word, misses: 0, lastMissedAt: null };
    }

    if (!entry?.isCorrect) {
      weakWords[key].misses += 1;
      weakWords[key].lastMissedAt = new Date().toISOString();
    }
  });

  write(KEYS.weakWords, weakWords);
  return entry;
  writeJson(WEAK_WORDS_KEY, weakWords);
  return updated;
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
  const weak = getWeakWordsMap();

  const scored = words.map((word) => {
    const key = String(word.word || '').toLowerCase();
    const weakness = weak[key]?.misses || 0;
    return { ...word, __priority: weakness };
  });

  return scored
    .sort((a, b) => b.__priority - a.__priority)
    .slice(0, limit)
    .map(({ __priority, ...rest }) => rest);
}
