import { useMemo, useState } from 'react';
import { BookOpenCheck, BrainCircuit, Flame, Sparkles } from 'lucide-react';
import QuizEngine from '../components/QuizEngine';
import SmartImport from '../components/SmartImport';
import { useQuiz } from '../context/QuizContext';
import { getPrioritizedWords, getResults, getWords, saveResult } from '../services/storageService';

const categories = ['Vocabulary', 'Idioms', 'Phrasal Verbs', 'Custom'];

export default function DashboardPage() {
  const { importWords } = useQuiz();
  const [refreshKey, setRefreshKey] = useState(0);

  const words = useMemo(() => getWords(), [refreshKey]);
  const prioritizedWords = useMemo(() => getPrioritizedWords(20), [refreshKey]);

  const stats = useMemo(() => {
    const results = getResults();
    const totals = results.reduce(
      (acc, result) => {
        acc.score += Number(result.score || 0);
        acc.total += Number(result.total || 0);
        return acc;
      },
      { score: 0, total: 0 }
    );

    const accuracy = totals.total ? Math.round((totals.score / totals.total) * 100) : 0;
    return {
      accuracy,
      wordsMastered: words.length
    };
  }, [words.length, refreshKey]);

  const onImported = (incomingWords) => {
    importWords(incomingWords);
    setRefreshKey((prev) => prev + 1);
  };

  const onQuizComplete = (result) => {
    saveResult(result);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-[12px]">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" /> VocabForge
          </p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Midnight Aurora Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-400">Beautiful, modern vocabulary training with AI extraction and adaptive weak-word learning.</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-[12px]">
            <div className="inline-flex rounded-lg bg-indigo-500/20 p-2 text-indigo-300"><BrainCircuit className="h-5 w-5" /></div>
            <p className="mt-3 text-xs uppercase tracking-widest text-zinc-400">Accuracy</p>
            <p className="mt-1 text-3xl font-bold text-zinc-100">{stats.accuracy}%</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-[12px]">
            <div className="inline-flex rounded-lg bg-emerald-500/20 p-2 text-emerald-300"><BookOpenCheck className="h-5 w-5" /></div>
            <p className="mt-3 text-xs uppercase tracking-widest text-zinc-400">Words Mastered</p>
            <p className="mt-1 text-3xl font-bold text-zinc-100">{stats.wordsMastered}</p>
          </article>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-[12px]">
          <h2 className="text-lg font-semibold">Smart Import</h2>
          <p className="mt-1 text-sm text-zinc-400">Drop files to generate high-quality MCQs with Gemini 1.5 Flash.</p>
          <div className="mt-4">
            <SmartImport onImported={onImported} />
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-[12px]">
          <h2 className="text-lg font-semibold">Categories</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className="rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:border-violet-400/50 hover:bg-violet-500/20"
              >
                {category}
              </button>
            ))}
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-200">
            <Flame className="h-3.5 w-3.5" /> Weak words are prioritized automatically.
          </div>
        </section>

        <QuizEngine words={prioritizedWords} onComplete={onQuizComplete} />
      </div>
    </main>
  );
}
