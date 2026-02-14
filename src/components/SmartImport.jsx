import { useRef, useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, Sparkles, UploadCloud } from 'lucide-react';
import { saveWords } from '../services/storageService';

const ACCEPTED = ['.pdf', '.docx', '.xlsx'];

export default function SmartImport({ onImported }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('Drop your file to unlock AI-crafted quiz words.');

  const upload = async (file) => {
    if (!file) return;

    const valid = ACCEPTED.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!valid) {
      setStatus('error');
      setMessage('Invalid file type. Please upload PDF, DOCX, or XLSX.');
      return;
    }

    setStatus('processing');
    setMessage('AI Data Extraction in progress...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Import failed.');
      }

      const incoming = payload.words || [];
      saveWords(incoming);
      onImported?.(incoming);
      setStatus('success');
      setMessage('Words added successfully to localStorage.');
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Something went wrong during import.');
    }
  };

  const onDrop = async (event) => {
    event.preventDefault();
    setDragging(false);
    const [file] = Array.from(event.dataTransfer.files || []);
    await upload(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={clsx(
        'rounded-2xl p-[1px] transition',
        'bg-gradient-to-r from-indigo-500/60 via-violet-500/60 to-emerald-500/60',
        dragging && 'scale-[1.01]'
      )}
    >
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center backdrop-blur-[12px]">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED.join(',')}
          onChange={async (e) => {
            const [file] = Array.from(e.target.files || []);
            await upload(file);
            e.target.value = '';
          }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-100 transition hover:border-indigo-400/50"
        >
          <UploadCloud className="h-4 w-4" />
          Choose File
        </button>

        <p className={clsx('mt-4 text-sm text-zinc-300 transition', status === 'processing' && 'animate-pulse text-indigo-300')}>
          {message}
        </p>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-400">
          <Sparkles className="h-3.5 w-3.5" />
          Supports PDF, DOCX, XLSX
        </div>

        {status === 'success' && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-200">
            <CheckCircle2 className="h-4 w-4" /> Imported Successfully
          </div>
        )}
      </div>
    </div>
  );
}
