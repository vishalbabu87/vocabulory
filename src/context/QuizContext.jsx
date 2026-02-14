import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'vocabforge.quiz.words';

const defaultWords = [
  {
    word: 'Ubiquitous',
    meaning: 'Present, appearing, or found everywhere',
    options: ['Rarely seen', 'Present everywhere', 'Highly technical', 'Difficult to understand'],
    category: 'Vocabulary'
  },
  {
    word: 'Break the ice',
    meaning: 'To initiate social interaction and reduce tension',
    options: ['Cause an argument', 'Start a conversation', 'End a meeting quickly', 'Ignore an awkward moment'],
    category: 'Idioms'
  }
];

const QuizContext = createContext(null);

const normalizeWord = (item) => ({
  word: item.word || '',
  meaning: item.meaning || '',
  options: Array.isArray(item.options) ? item.options.slice(0, 4) : [],
  category: item.category || 'General'
});

export function QuizProvider({ children }) {
  const [customWords, setCustomWords] = useState([]);
  const [importedWords, setImportedWords] = useState([]);

  useEffect(() => {
    try {
      const persisted = localStorage.getItem(STORAGE_KEY);
      if (!persisted) return;

      const parsed = JSON.parse(persisted);
      setCustomWords(Array.isArray(parsed.customWords) ? parsed.customWords : []);
      setImportedWords(Array.isArray(parsed.importedWords) ? parsed.importedWords : []);
    } catch (error) {
      console.warn('Failed to restore quiz words from storage.', error);
    }
  }, []);

  useEffect(() => {
    const payload = JSON.stringify({ customWords, importedWords });
    localStorage.setItem(STORAGE_KEY, payload);
  }, [customWords, importedWords]);

  const addCustomWord = (word) => {
    setCustomWords((prev) => [...prev, normalizeWord(word)]);
  };

  const importWords = (words) => {
    const safeWords = (Array.isArray(words) ? words : []).map(normalizeWord).filter((item) => item.word && item.meaning);
    setImportedWords((prev) => [...prev, ...safeWords]);
  };

  const clearImportedWords = () => setImportedWords([]);

  const words = useMemo(() => [...defaultWords, ...customWords, ...importedWords], [customWords, importedWords]);

  const value = useMemo(
    () => ({
      words,
      defaultWords,
      customWords,
      importedWords,
      addCustomWord,
      importWords,
      clearImportedWords
    }),
    [words, customWords, importedWords]
  );

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuiz() {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within QuizProvider');
  }
  return context;
}
