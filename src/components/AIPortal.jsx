import { useMemo, useState } from 'react';
import { Loader2, Sparkles, UploadCloud } from 'lucide-react';
import clsx from 'clsx';
import { useQuiz } from '../context/QuizContext';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.xlsx'];

const isValidFile = (file) => {
  const lowerName = file.name.toLowerCase();
  return (
    ACCEPTED_TYPES.includes(file.type) ||
    ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  );
};

export default function AIPortal() {
  const { importWords } = useQuiz();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const supportedLabel = useMemo(() => ACCEPTED_EXTENSIONS.join(', ').toUpperCase(), []);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 2500);
  };

  const uploadFile = async (file) => {
    if (!file || !isValidFile(file)) {
      setError(`Invalid file type. Upload one of: ${supportedLabel}`);
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Upload failed.');
      }

      importWords(payload.words || []);
      showToast('Words Imported Successfully');
    } catch (uploadError) {
      setError(uploadError.message || 'Something went wrong during import.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setIsDragging(false);
    const [file] = Array.from(event.dataTransfer.files || []);
    await uploadFile(file);
  };

  const handleInputChange = async (event) => {
    const [file] = Array.from(event.target.files || []);
    await uploadFile(file);
    event.target.value = '';
  };

  return (
    <div className="relative space-y-4">
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-4 py-3 text-sm font-medium text-emerald-100 backdrop-blur-md">
          {toast}
        </div>
      )}

      <label
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={clsx(
          'group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/10 p-8 text-center shadow-xl backdrop-blur-md transition-all',
          isDragging ? 'scale-[1.01] border-indigo-300/60 bg-indigo-400/20' : 'hover:border-white/40 hover:bg-white/15'
        )}
      >
        <input type="file" className="hidden" onChange={handleInputChange} accept={ACCEPTED_EXTENSIONS.join(',')} />

        {isLoading ? (
          <div className="space-y-2 text-indigo-100">
            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            <p className="text-sm font-semibold tracking-wide">AI is Thinking...</p>
            <p className="text-xs text-zinc-300">Analyzing your document for advanced vocabulary</p>
          </div>
        ) : (
          <>
            <div className="mb-3 rounded-full bg-indigo-500/20 p-3 text-indigo-200">
              <UploadCloud className="h-7 w-7" />
            </div>
            <p className="text-base font-semibold text-zinc-100">Drag & drop your file here</p>
            <p className="mt-1 text-sm text-zinc-300">or tap to browse from device</p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-zinc-950/30 px-3 py-1 text-xs text-zinc-300">
              <Sparkles className="h-3.5 w-3.5" /> Supports {supportedLabel}
            </p>
          </>
        )}
      </label>

      {error && <p className="text-sm text-rose-300">{error}</p>}
    </div>
  );
}
