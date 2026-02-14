import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

const AUTO_NEXT_DELAY = 1200;

function shuffle(items) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function toQuestion(item, index) {
  const correct = item.meaning || '';
  const options = Array.isArray(item.options) ? item.options : [];
  const normalized = shuffle(options).slice(0, 4);

  if (correct && !normalized.includes(correct)) {
    if (normalized.length < 4) normalized.push(correct);
    else normalized[0] = correct;
  }

  return {
    id: `${item.word || 'word'}-${index}`,
    word: item.word,
    category: item.category || 'Vocabulary',
    correct,
    options: normalized
  };
}

function ProgressBar({ value }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export default function QuizEngine({ words = [], onComplete }) {
  const questions = useMemo(
    () => words.map(toQuestion).filter((q) => q.word && q.correct && q.options.length === 4),
    [words]
  );

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    setCurrentQuestion(0);
    setScore(0);
    setHistory([]);
    setSelectedOption(null);
  }, [questions.length]);

  const active = questions[currentQuestion];
  const progress = questions.length ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  useEffect(() => {
    if (!active || selectedOption === null) return undefined;

    const timer = setTimeout(() => {
      const isLast = currentQuestion >= questions.length - 1;
      if (isLast) {
        onComplete?.({ score, total: questions.length, history });
        return;
      }

      setCurrentQuestion((prev) => prev + 1);
      setSelectedOption(null);
    }, AUTO_NEXT_DELAY);

    return () => clearTimeout(timer);
  }, [active, currentQuestion, history, onComplete, questions.length, score, selectedOption]);

  const handleOptionClick = (option) => {
    if (!active || selectedOption !== null) return;

    setSelectedOption(option);
    const isCorrect = option === active.correct;

    if (isCorrect) setScore((prev) => prev + 1);

    setHistory((prev) => [
      ...prev,
      {
        word: active.word,
        selected: option,
        correct: active.correct,
        isCorrect,
        answeredAt: new Date().toISOString()
      }
    ]);
  };

  if (!questions.length) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-[12px]">
        <p className="text-sm text-zinc-300">No quiz-ready words yet. Import a file to start.</p>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-[12px]">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-300">
          <span>Question {currentQuestion + 1}/{questions.length}</span>
          <span>Score {score}</span>
        </div>
        <ProgressBar value={progress} />
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-indigo-300">{active.category}</p>
        <h3 className="mt-1 text-xl font-semibold text-zinc-100">{active.word}</h3>
      </div>

      <div className="grid gap-3">
        {active.options.map((option) => {
          const isCorrect = option === active.correct;
          const isSelected = option === selectedOption;
          const wrongSelected = selectedOption !== null && isSelected && !isCorrect;
          const showCorrect = selectedOption !== null && isCorrect;

          return (
            <button
              key={option}
              type="button"
              disabled={selectedOption !== null}
              onClick={() => handleOptionClick(option)}
              className={clsx(
                'w-full rounded-xl border px-4 py-3 text-left text-sm transition',
                'border-white/10 bg-zinc-900/60 text-zinc-100',
                wrongSelected && 'border-rose-500/80 bg-rose-500/20 text-rose-100',
                showCorrect && 'border-emerald-500/70 bg-emerald-500/15 text-emerald-100',
                selectedOption !== null && !wrongSelected && !showCorrect && 'opacity-70'
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </section>
  );
}
