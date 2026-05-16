import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { SavedNote } from '../types';
import { audio } from '../lib/audio';

export function VocabularyTest({ notes, onComplete, onClose }: { notes: SavedNote[], onComplete: (results: { id: string, correct: boolean }[]) => void, onClose: () => void }) {
  const [step, setStep] = useState<'intro' | 'active' | 'results'>('intro');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [testItems, setTestItems] = useState<SavedNote[]>([]);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [results, setResults] = useState<{ id: string, correct: boolean }[]>([]);

  useEffect(() => {
    const now = new Date();
    
    const sortedPool = [...notes].sort((a, b) => {
      const aNext = a.nextReview ? new Date(a.nextReview) : new Date(0);
      const bNext = b.nextReview ? new Date(b.nextReview) : new Date(0);
      
      const aDue = aNext <= now;
      const bDue = bNext <= now;
      
      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;
      
      const aMastery = a.masteryLevel || 0;
      const bMastery = b.masteryLevel || 0;
      if (aMastery !== bMastery) return aMastery - bMastery;
      
      return aNext.getTime() - bNext.getTime();
    });

    const selectionSize = Math.min(notes.length, 5);
    const poolSize = Math.min(notes.length, 10);
    const pool = sortedPool
      .slice(0, poolSize)
      .sort(() => Math.random() - 0.5)
      .slice(0, selectionSize);
      
    setTestItems(pool);
  }, [notes]);

  useEffect(() => {
    if (testItems[currentQuestion]) {
      const correct = testItems[currentQuestion].term;
      const mastery = testItems[currentQuestion].masteryLevel || 0;
      const distractorCount = mastery > 50 ? 5 : 3;
      
      const distractors = notes
        .filter(n => n.term !== correct)
        .sort(() => Math.random() - 0.5)
        .slice(0, distractorCount)
        .map(n => n.term);
      
      const combined = [correct, ...distractors].sort(() => Math.random() - 0.5);
      setShuffledOptions(combined);
    }
  }, [currentQuestion, testItems, notes]);

  const handleAnswer = (option: string) => {
    const isCorrect = option === testItems[currentQuestion].term;
    const newResults = [...results, { id: testItems[currentQuestion].id, correct: isCorrect }];
    setResults(newResults);
    
    if (isCorrect) {
      setScore(s => s + 1);
    }
    
    if (currentQuestion < testItems.length - 1) {
      setCurrentQuestion(q => q + 1);
    } else {
      setStep('results');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="w-full max-w-4xl flex flex-col items-center py-20"
    >
      <div className="w-full bg-cream rounded-[40px] p-8 md:p-14 text-navy shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-olive/5 rounded-bl-[100%] pointer-events-none" />
        
        <button onClick={() => {
          audio.thud();
          onClose();
        }} className="absolute top-4 right-4 md:top-6 md:right-6 p-2.5 md:p-3 bg-navy hover:bg-navy/80 rounded-full transition-all group shadow-xl z-20">
          <X className="w-4 h-4 md:w-5 md:h-5 text-cream group-hover:rotate-90 transition-transform" />
        </button>

        <div className="flex items-center gap-2 md:hidden absolute top-6 left-6">
           <button 
             onClick={onClose}
             className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-navy/40 hover:text-navy transition-colors"
           >
             <ChevronLeft className="w-3 h-3" />
             Back
           </button>
        </div>

        {step === 'intro' && (
          <div className="flex flex-col items-center text-center max-w-lg mx-auto">
            <div className="w-16 h-16 bg-olive/10 border border-olive/20 rounded-2xl flex items-center justify-center mb-6 rotate-3">
               <Trophy className="w-8 h-8 text-olive" />
            </div>
            <span className="text-[10px] tracking-[0.6em] uppercase text-olive font-bold mb-4 block">Evaluation</span>
            <h2 className="text-3xl md:text-5xl font-serif italic mb-6 leading-none">Internalization Ritual</h2>
            <p className="text-navy/60 text-base font-light leading-relaxed mb-8">
              True mastery lies not in collection, but in retrieval. Let us verify the semantic pathways you've built.
            </p>
            <button 
              onClick={() => {
                audio.success();
                setStep('active');
              }}
              className="bg-navy text-cream px-10 py-4 rounded-[2rem] font-bold uppercase tracking-widest text-[9px] hover:scale-105 active:scale-95 transition-all shadow-2xl"
            >
              Initiate Session
            </button>
          </div>
        )}

        {step === 'active' && testItems[currentQuestion] && (
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="flex-1 text-left">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-olive py-1.5 px-3 bg-olive/10 rounded-full">Phase 0{currentQuestion + 1}</span>
                <span className={`text-[7px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${testItems[currentQuestion].masteryLevel! > 50 ? 'border-amber-500/20 text-amber-600 bg-amber-50' : 'border-blue-500/10 text-blue-500 bg-blue-50'}`}>
                  {testItems[currentQuestion].masteryLevel! > 50 ? 'Advanced' : 'Foundation'}
                </span>
                <div className="h-px flex-1 bg-navy/10" />
              </div>
              
              <span className="text-[9px] uppercase tracking-[0.3em] text-navy/30 mb-3 block font-black">Definition —</span>
              <h3 className="text-xl md:text-2xl font-serif italic mb-8 leading-relaxed min-h-[120px]">
                "{testItems[currentQuestion].meaning}"
              </h3>
              
              <div className="flex gap-4">
                 <div className="h-1.5 flex-1 bg-navy/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentQuestion + 1) / testItems.length) * 100}%` }}
                      className="h-full bg-olive"
                    />
                 </div>
              </div>
            </div>
            
            <div className={`w-full lg:w-[600px] grid ${shuffledOptions.length > 4 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-3`}>
              {shuffledOptions.map((option, i) => (
                <button
                  key={i}
                  onClick={() => {
                    audio.tap();
                    handleAnswer(option);
                  }}
                  className={`p-5 text-left border border-navy/5 rounded-[2rem] bg-white/40 hover:bg-navy hover:text-cream hover:border-navy transition-all group relative overflow-hidden flex items-center justify-between ${shuffledOptions.length > 4 ? 'p-4' : 'p-6'}`}
                >
                  <span className={`${shuffledOptions.length > 4 ? 'text-base' : 'text-lg'} font-serif italic`}>{option}</span>
                  <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center opacity-20 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'results' && (
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-olive blur-[40px] opacity-20 animate-pulse" />
              <div className="relative w-32 h-32 rounded-full border-[6px] border-olive flex flex-col items-center justify-center bg-cream shadow-inner">
                <span className="text-3xl font-serif font-black italic">{score} / {testItems.length}</span>
                <span className="text-[9px] uppercase font-bold tracking-widest text-navy/40 mt-0.5">Score</span>
              </div>
            </div>
            
            <span className="text-[10px] tracking-[0.6em] uppercase text-olive font-bold mb-4 block">Succession</span>
            <h2 className="text-3xl font-serif italic mb-6">Discipline Logged</h2>
            <p className="text-navy/60 text-sm font-light leading-relaxed mb-8 max-w-sm">
              {score === testItems.length 
                ? "Total synthesis achieved. Your linguistic reach continues to expand with absolute precision." 
                : "Continuous iteration is the only path to profound mastery. Your recent gaps have been flagged for review."}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => onComplete(results)}
                className="bg-navy text-cream px-10 py-4 rounded-[2rem] font-bold uppercase tracking-widest text-[9px] hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-2"
              >
                Sync Progress
                <div className="w-1.5 h-1.5 bg-olive rounded-full" />
              </button>
              <button 
                onClick={() => {
                  audio.thud();
                  onClose();
                }}
                className="px-10 py-4 rounded-[2rem] border border-navy/10 text-navy font-bold uppercase tracking-widest text-[9px] hover:bg-navy/5 transition-all"
              >
                Archive Session
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
