import { createContext, useContext, useMemo, useState } from 'react';
import { getWords, saveWords } from '../services/storageService';

const QuizContext = createContext(null);

const defaultWords = [
  {
    word: 'Ubiquitous',
    meaning: 'Present, appearing, or found everywhere',
    options: ['Present, appearing, or found everywhere', 'Rarely seen', 'Emotionally distant', 'Unclear and vague'],
    category: 'Vocabulary'
  },
  {
    word: 'Break the ice',
    meaning: 'To initiate social interaction and reduce tension',
    options: ['To initiate social interaction and reduce tension', 'To avoid all discussion', 'To postpone a conversation', 'To end a friendship'],
    category: 'Idioms'
  }
];

export function QuizProvider({ children }) {
  const [words, setWords] = useState(() => {
    const stored = getWords();
    return stored.length ? stored : defaultWords;
  });

  const importWords = (incoming) => {
    const merged = saveWords(incoming);
    setWords(merged.length ? merged : defaultWords);
  };

  const value = useMemo(() => ({ words, importWords }), [words]);

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuiz() {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used inside QuizProvider');
  }
  return context;
}
