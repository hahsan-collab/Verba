import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Brain, CheckCircle2, ChevronLeft } from 'lucide-react';
import { SavedNote } from '../types';
import { audio } from '../lib/audio';

export function PracticeMode({ notes, onClose }: { notes: SavedNote[], onClose: () => void }) {
  const [step, setStep] = useState<'intro' | 'active' | 'summary'>('intro');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [questions, setQuestions] = useState<any[]>([]);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  useEffect(() => {
    if (notes.length < 3) return;

    const generateQuestions = () => {
      const shuffledNotes = [...notes].sort(() => Math.random() - 0.5).slice(0, 5);
      return shuffledNotes.map(note => {
        const types = ['DEFINITION_TO_TERM', 'TERM_TO_DEFINITION', 'FILL_IN_BLANK'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        let displayContent = '';
        let correctAnswer = '';
        let options: string[] = [];

        if (type === 'DEFINITION_TO_TERM') {
          displayContent = note.meaning;
          correctAnswer = note.term;
          options = [note.term, ...notes.filter(n => n.term !== note.term).sort(() => Math.random() - 0.5).slice(0, 3).map(n => n.term)].sort(() => Math.random() - 0.5);
        } else if (type === 'TERM_TO_DEFINITION') {
          displayContent = note.term;
          correctAnswer = note.meaning;
          options = [note.meaning, ...notes.filter(n => n.id !== note.id).sort(() => Math.random() - 0.5).slice(0, 3).map(n => n.meaning)].sort(() => Math.random() - 0.5);
        } else if (type === 'FILL_IN_BLANK') {
          const example = note.examples[Math.floor(Math.random() * note.examples.length)] || "Study the usage of current term.";
          displayContent = example.replace(new RegExp(note.term, 'gi'), '__________');
          correctAnswer = note.term;
          options = [note.term, ...notes.filter(n => n.term !== note.term).sort(() => Math.random() - 0.5).slice(0, 3).map(n => n.term)].sort(() => Math.random() - 0.5);
        }

        return { type, displayContent, correctAnswer, options, note };
      });
    };

    setQuestions(generateQuestions());
  }, [notes]);

  const handleAnswer = (option: string) => {
    if (isAnswered) return;
    
    setSelectedOption(option);
    setIsAnswered(true);
    
    if (option === questions[currentQuestionIdx].correctAnswer) {
      setScore(s => s + 1);
      audio.success();
    } else {
      audio.thud();
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(idx => idx + 1);
      setIsAnswered(false);
      setSelectedOption(null);
      audio.pop();
    } else {
      setStep('summary');
      audio.ding();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-4xl mx-auto py-8 md:py-12"
    >
      <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[48px] md:rounded-[60px] p-6 md:p-12 relative overflow-hidden text-cream shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
        <div className="absolute top-0 right-0 w-64 h-64 bg-olive/5 rounded-bl-[100%] pointer-events-none" />
        
        <button onClick={onClose} className="absolute top-4 right-4 md:top-8 md:right-8 p-3 md:p-4 bg-white/5 hover:bg-navy rounded-full transition-all group border border-white/10 z-10">
          <X className="w-4 h-4 md:w-5 md:h-5 text-cream group-hover:rotate-90 transition-transform" />
        </button>

        <div className="flex items-center gap-2 md:hidden absolute top-6 left-6">
           <button 
             onClick={onClose}
             className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-cream/20 hover:text-cream transition-colors"
           >
             <ChevronLeft className="w-3 h-3" />
             Back
           </button>
        </div>

        {step === 'intro' && (
          <div className="text-center py-12 md:py-20">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-olive/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <Brain className="w-8 h-8 md:w-10 md:h-10 text-olive" />
            </div>
            <h2 className="text-4xl md:text-5xl font-serif italic mb-6">Active Recall Practice</h2>
            <p className="text-cream/40 text-base md:text-lg mb-10 max-w-md mx-auto">Strengthen the neural pathways between term and meaning through varied active testing.</p>
            <button 
              onClick={() => setStep('active')}
              className="bg-cream text-navy px-10 py-4 md:px-12 md:py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl"
            >
              Start Session
            </button>
          </div>
        )}

        {step === 'active' && questions[currentQuestionIdx] && (
          <div className="max-w-2xl mx-auto py-8">
            <div className="flex justify-between items-center mb-8">
              <span className="text-[10px] font-black uppercase tracking-widest text-olive">Question {currentQuestionIdx + 1} of {questions.length}</span>
              <div className="flex gap-2">
                {questions.map((_, i) => (
                  <div key={i} className={`w-6 h-1 rounded-full transition-all ${i === currentQuestionIdx ? 'bg-olive' : i < currentQuestionIdx ? 'bg-olive/40' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>

            <div className="mb-10">
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-cream/20 mb-3 block">
                {questions[currentQuestionIdx].type.replace(/_/g, ' ')}
              </span>
              <h3 className="text-2xl md:text-4xl font-serif italic leading-relaxed min-h-[100px] md:min-h-[140px]">
                {questions[currentQuestionIdx].displayContent}
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {questions[currentQuestionIdx].options.map((option: string, i: number) => (
                <button
                  key={i}
                  disabled={isAnswered}
                  onClick={() => handleAnswer(option)}
                  className={`p-5 md:p-6 rounded-2xl text-left border transition-all relative overflow-hidden group flex items-center justify-between ${
                    isAnswered 
                    ? option === questions[currentQuestionIdx].correctAnswer 
                      ? 'bg-olive border-olive text-navy font-bold' 
                      : option === selectedOption 
                        ? 'bg-red-500/20 border-red-500 text-red-500' 
                        : 'bg-white/5 border-white/5 opacity-40'
                    : 'bg-white/5 border-white/5 hover:border-olive/50 hover:bg-white/10'
                  }`}
                >
                  <span className="text-sm md:text-base font-serif italic">{option}</span>
                  {isAnswered && option === questions[currentQuestionIdx].correctAnswer && <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
              ))}
            </div>

            {isAnswered && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={nextQuestion}
                className="mt-12 w-full py-5 bg-cream text-navy rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-white shadow-2xl transition-all"
              >
                {currentQuestionIdx < questions.length - 1 ? 'Next Challenge' : 'Complete Session'}
              </motion.button>
            )}
          </div>
        )}

        {step === 'summary' && (
          <div className="text-center py-20">
            <div className="relative inline-block mb-12">
              <div className="absolute inset-0 bg-olive blur-3xl opacity-20" />
              <div className="relative w-32 h-32 rounded-full border-4 border-olive flex items-center justify-center text-4xl font-serif italic text-white">
                {score}/{questions.length}
              </div>
            </div>
            <h2 className="text-5xl font-serif italic mb-6">Discipline Reinforced</h2>
            <p className="text-cream/40 mb-12">Your recall capabilities are expanding. Consistency is the key to deep linguistic roots.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button 
                onClick={() => {
                  setStep('intro');
                  setCurrentQuestionIdx(0);
                  setScore(0);
                  setIsAnswered(false);
                  setSelectedOption(null);
                  setQuestions([...questions].sort(() => Math.random() - 0.5));
                }}
                className="bg-cream text-navy px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl"
              >
                Refine Further
              </button>
              <button 
                onClick={onClose}
                className="bg-white/5 border border-white/10 text-cream px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all"
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
