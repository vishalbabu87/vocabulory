import { useMemo, useState } from 'react';
import { getResults, getWords, saveWords } from '../services/storageService';

export default function Dashboard({ onWordsImported }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const wordsLearned = useMemo(() => getWords().length, []);
  const accuracy = useMemo(() => {
    const results = getResults();
    if (!results.length) return 0;

    const totals = results.reduce(
      (acc, result) => {
        acc.score += Number(result.score || 0);
        acc.total += Number(result.total || 0);
        return acc;
      },
      { score: 0, total: 0 }
    );

    if (!totals.total) return 0;
    return Math.round((totals.score / totals.total) * 100);
  }, []);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to process file.');

      const incomingWords = payload.words || [];
      saveWords(incomingWords);
      onWordsImported?.(incomingWords);
    } catch (uploadError) {
      setError(uploadError.message || 'Upload failed.');
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-lg">
        <h2 className="text-lg font-semibold text-zinc-100">Statistics</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <article className="rounded-xl border border-white/10 bg-zinc-900/40 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Accuracy</p>
            <p className="mt-2 text-2xl font-bold text-emerald-300">{accuracy}%</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-zinc-900/40 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Total Words Learned</p>
            <p className="mt-2 text-2xl font-bold text-indigo-300">{wordsLearned}</p>
          </article>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-lg">
        <h2 className="text-lg font-semibold text-zinc-100">Smart Import</h2>
        <p className="mt-1 text-sm text-zinc-400">Upload PDF, DOCX, or XLSX to generate advanced vocabulary quizzes.</p>

        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-zinc-900/40 px-4 py-8 text-center transition hover:border-white/40">
          <span className="text-sm text-zinc-200">Drop file here or click to browse</span>
          <span className="mt-1 text-xs text-zinc-400">AI-powered extraction with Gemini 1.5 Flash</span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.docx,.xlsx"
            onChange={handleUpload}
            disabled={isProcessing}
          />
        </label>

        {isProcessing && (
          <p className="mt-3 animate-pulse text-sm text-indigo-300 transition">Processing...</p>
        )}
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      </div>
    </section>
  );
}
