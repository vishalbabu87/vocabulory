// File: src/App.jsx
import React, { useState, useEffect } from 'react';
import { Upload, BrainCircuit, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';

export default function App() {
  const [words, setWords] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load from local storage (Phone/Browser memory)
  useEffect(() => {
    const saved = localStorage.getItem('vocab_data');
    if (saved) setWords(JSON.parse(saved));
  }, []);

  const handleOptionClick = (idx) => {
    setSelectedOption(idx);
    // Auto-next logic: Wait 1.2 seconds after selection
    setTimeout(() => {
      setSelectedOption(null);
      if (currentIdx < words.length - 1) setCurrentIdx(currentIdx + 1);
      else setCurrentIdx(null);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-8 bg-gradient-to-r from-indigo-400 to-violet-500 bg-clip-text text-transparent">
          VocabForge
        </h1>

        {currentIdx === null ? (
          <div className="space-y-6">
            {/* Smart Import Card */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md text-center">
              <div className={`w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 ${loading ? 'animate-pulse' : ''}`}>
                <Upload className="text-indigo-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Smart Import</h2>
              <p className="text-zinc-400 text-sm mb-6">Upload PDF/DOCX to generate AI quizzes</p>
              <button className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-xl transition-all font-medium">
                Choose File
              </button>
            </div>

            {/* Start Session */}
            {words.length > 0 && (
              <button 
                onClick={() => setCurrentIdx(0)}
                className="w-full p-4 bg-violet-600 rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                Start Practice ({words.length} words) <ChevronRight />
              </button>
            )}
          </div>
        ) : (
          /* Quiz Engine UI */
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl">
            <div className="h-1 w-full bg-white/10 rounded-full mb-6 overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-500" 
                style={{ width: `${((currentIdx + 1) / words.length) * 100}%` }}
              />
            </div>
            
            <h2 className="text-3xl font-bold mb-8 text-center">{words[currentIdx].word}</h2>
            
            <div className="grid gap-3">
              {words[currentIdx].options.map((opt, i) => {
                const isCorrect = i === words[currentIdx].correctIndex;
                const isSelected = selectedOption === i;
                
                let btnStyle = "bg-white/5 border-white/10";
                if (selectedOption !== null) {
                  if (isCorrect) btnStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-400";
                  else if (isSelected) btnStyle = "bg-rose-500/20 border-rose-500 text-rose-400";
                }

                return (
                  <button
                    key={i}
                    disabled={selectedOption !== null}
                    onClick={() => handleOptionClick(i)}
                    className={`w-full p-4 text-left rounded-2xl border transition-all ${btnStyle}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
