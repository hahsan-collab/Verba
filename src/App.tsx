import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Bookmark, 
  ChevronRight, 
  Trophy, 
  X, 
  ChevronLeft,
  Sparkles,
  Layers,
  Link as LinkIcon,
  Quote,
  CheckCircle2,
  Brain,
  Search,
  Volume2,
  Flame,
  Loader2,
  Plus,
  Bot,
  Settings
} from 'lucide-react';
import { DailyContent, DailyItem, SavedNote } from './types';
import { audio } from './lib/audio';
import { VocabularyTest } from './components/VocabularyTest';
import { PracticeMode } from './components/PracticeMode';
import { ChatBot } from './components/ChatBot';
import { TroubleshooterChatBot } from './components/SystemTroubleshooter';

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  const handleClick = () => {
    audio.tap();
    onClick();
  };

  return (
    <button 
      onClick={handleClick}
      className={`flex items-center gap-2 px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl transition-all duration-500 ease-out whitespace-nowrap ${
        active 
        ? 'bg-cream text-navy shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)]' 
        : 'text-cream/40 hover:text-cream hover:bg-white/5'
      }`}
    >
      <motion.span 
        animate={{ scale: active ? 1.1 : 1 }}
        className={`${active ? 'text-navy' : 'text-olive'} transition-colors`}
      >
        {icon}
      </motion.span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden sm:block">{label}</span>
    </button>
  );
}

function App() {
  const [content, setContent] = useState<DailyContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<'daily' | 'notes' | 'test' | 'practice'>('daily');
  const [activeSection, setActiveSection] = useState<'word' | 'connector' | 'phrase' | 'idiom' | 'exploration'>('word');
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'word' | 'connector' | 'phrase' | 'idiom'>('all');
  
  const [selectedGenre, setSelectedGenre] = useState<string | null>(localStorage.getItem('lexiflow_genre'));
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [genreSearch, setGenreSearch] = useState('');
  const [showGenrePicker, setShowGenrePicker] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showNav, setShowNav] = useState(true);
  const lastScrollY = useRef(0);
  const [sessionId] = useState(() => Math.random().toString(16).substring(2, 10).toUpperCase() + '-' + Math.random().toString(16).substring(2, 6).toUpperCase());
  const [speakingState, setSpeakingState] = useState<{text: string, type: 'UK' | 'US'} | null>(null);
  
  const [historyItem, setHistoryItem] = useState<DailyItem | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [expansionItem, setExpansionItem] = useState<{ item: DailyItem, type: 'word' | 'connector' | 'phrase' | 'idiom' } | null>(null);
  const [isExpansionModalOpen, setIsExpansionModalOpen] = useState(false);
  const [loadingRelated, setLoadingRelated] = useState<string | null>(null);

  const [selectedDerivative, setSelectedDerivative] = useState<any | null>(null);

  const [activeJump, setActiveJump] = useState<string>('hero');
  const [streak, setStreak] = useState<number>(0);
  const [sessionHistory, setSessionHistory] = useState<DailyItem[]>([]);
  const [chatTerm, setChatTerm] = useState<string | null>(null);
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);

  useEffect(() => {
    const savedHistory = sessionStorage.getItem('lexiflow_session_history');
    if (savedHistory) {
      try {
        setSessionHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load session history");
      }
    }
  }, []);

  const addToHistory = (item: DailyItem) => {
    setSessionHistory(prev => {
      const filtered = prev.filter(h => h.term !== item.term);
      const updated = [item, ...filtered].slice(0, 10);
      sessionStorage.setItem('lexiflow_session_history', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    const savedStreak = localStorage.getItem('lexiflow_streak');
    const lastDate = localStorage.getItem('lexiflow_last_date');
    
    if (savedStreak && lastDate) {
      const last = new Date(lastDate);
      const today = new Date();
      
      // Reset times to midnight for day comparison
      const lastReset = new Date(last);
      lastReset.setHours(0, 0, 0, 0);
      const todayReset = new Date(today);
      todayReset.setHours(0, 0, 0, 0);
      
      const diffTime = todayReset.getTime() - lastReset.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0 || diffDays === 1) {
        // Today or yesterday, keep streak
        setStreak(parseInt(savedStreak));
      } else {
        // Missed more than one day
        setStreak(0);
        localStorage.setItem('lexiflow_streak', '0');
      }
    }
  }, []);

  const updateStreak = () => {
    const lastDateString = localStorage.getItem('lexiflow_last_date');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (lastDateString) {
      const last = new Date(lastDateString);
      const lastMidnight = new Date(last);
      lastMidnight.setHours(0, 0, 0, 0);
      
      if (today.getTime() > lastMidnight.getTime()) {
        const diffTime = today.getTime() - lastMidnight.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        let newStreak;
        if (diffDays === 1) {
           newStreak = streak + 1;
        } else {
           // If they missed days, they start over at 1 today
           newStreak = 1;
        }
        
        setStreak(newStreak);
        localStorage.setItem('lexiflow_streak', newStreak.toString());
        localStorage.setItem('lexiflow_last_date', new Date().toISOString());
        setShowNotification(`Streak Active: Day ${newStreak}`);
        setTimeout(() => setShowNotification(null), 3000);
      }
    } else {
      setStreak(1);
      localStorage.setItem('lexiflow_streak', '1');
      localStorage.setItem('lexiflow_last_date', new Date().toISOString());
      setShowNotification("Encryption Streak Started: Day 1");
      setTimeout(() => setShowNotification(null), 3000);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 50);
      
      // Hide nav if scrolling down and away from top
      if (currentScrollY > lastScrollY.current && currentScrollY > 150) {
        setShowNav(false);
      } else {
        setShowNav(true);
      }
      
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetchGenres();
    const saved = localStorage.getItem('lexiflow_notes');
    if (saved) {
      try {
        setSavedNotes(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to parse saved notes", err);
        localStorage.removeItem('lexiflow_notes');
        setSavedNotes([]);
      }
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveJump(entry.target.id);
          }
        });
      },
      { threshold: 0.1 }
    );

    const sections = document.querySelectorAll('section[id], div[id="hero"], div[id="expansion"]');
    sections.forEach((s) => observer.observe(s));
    return () => sections.forEach((s) => observer.unobserve(s));
  }, [content, activeLayer]);

  const scrollTo = (id: string) => {
    audio.swoosh();
    const el = document.getElementById(id);
    if (!el) return;

    // Check if it's a carousel section
    if (id.startsWith('section-')) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else {
      const offset = 120;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    fetchDailyContent();
  }, [selectedGenre]);

  const fetchGenres = async () => {
    try {
      const res = await fetch('/api/genres');
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAvailableGenres(data);
    } catch (err) {
      console.error("Failed to fetch genres", err);
      // Fallback genres if API fails
      setAvailableGenres([
        "Science", "Arts", "Technology", "Nature", "Philosophy", 
        "History", "Psychology", "Economics", "Literature"
      ]);
    }
  };

  const fetchDailyContent = async () => {
    try {
      const dateStr = new Date().toDateString();
      const cacheKey = `lexiflow_content_${dateStr}_${selectedGenre || 'default'}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          setContent(JSON.parse(cached));
          setLoading(false);
          // Still fetch in background to refresh if needed, but show cached immediately
          const url = selectedGenre ? `/api/daily-content?genre=${encodeURIComponent(selectedGenre)}` : '/api/daily-content';
          fetch(url).then(res => res.json()).then(data => {
            setContent(data);
            localStorage.setItem(cacheKey, JSON.stringify(data));
          }).catch(console.error);
          return;
        } catch (e) {
          localStorage.removeItem(cacheKey);
        }
      }

      setLoading(true);
      setError(null);
      const url = selectedGenre ? `/api/daily-content?genre=${encodeURIComponent(selectedGenre)}` : '/api/daily-content';
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${res.status}`);
      }
      const data = await res.json();
      setContent(data);
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to establish secure link with linguistic core.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenreChange = (genre: string) => {
    audio.success();
    setSelectedGenre(genre);
    localStorage.setItem('lexiflow_genre', genre);
    setGenreSearch('');
    setShowGenrePicker(false);
    setShowNotification(`Discipline Refined: ${genre}`);
    setTimeout(() => setShowNotification(null), 3000);
    
    // Smooth transition to top after selection
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const speak = async (text: string, type: 'UK' | 'US') => {
    setSpeakingState({ text, type });
    try {
      const langCode = type === 'UK' ? 'en-GB' : 'en-US';
      const isPhrase = text.trim().includes(' ');

      // Use the High-Fidelity Gemini TTS first
      try {
        const voice = type === 'UK' ? 'Puck' : 'Kore'; // Map US to Kore and UK to Puck as a distinction
        const cacheKey = `tts_${voice}_${text}`;
        
        // 1. Cache Audio responses for faster playback and reduced API calls
        const cachedAudio = sessionStorage.getItem(cacheKey);
        if (cachedAudio) {
          const audioObj = new Audio(`data:audio/wav;base64,${cachedAudio}`);
          audioObj.onended = () => setSpeakingState(null);
          audioObj.onerror = () => setSpeakingState(null);
          await audioObj.play();
          return;
        }

        // 2. High-fidelity TTS generation
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, type, voice })
        });
        
        if (res.ok) {
          const { audio } = await res.json();
          try {
            sessionStorage.setItem(cacheKey, audio);
          } catch(e) {
            // sessionStorage might be full, safe to ignore
          }
          const audioObj = new Audio(`data:audio/wav;base64,${audio}`);
          audioObj.onended = () => setSpeakingState(null);
          audioObj.onerror = () => setSpeakingState(null);
          await audioObj.play();
          return;
        }
      } catch (err) {
        console.warn("High-Fidelity TTS failed, falling back to dictionary", err);
      }

      // API 1: Free Dictionary API (High quality recordings) - Only for single words
      if (!isPhrase) {
        try {
          const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${text.toLowerCase().trim()}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data[0].phonetics) {
              const phonetic = data[0].phonetics.find((p: any) => p.audio && (type === 'UK' ? p.audio.includes('-uk') : p.audio.includes('-us'))) 
                            || data[0].phonetics.find((p: any) => p.audio);
              if (phonetic?.audio) {
                const audioObj = new Audio(phonetic.audio);
                audioObj.onended = () => setSpeakingState(null);
                audioObj.onerror = () => setSpeakingState(null);
                await audioObj.play();
                return;
              }
            }
          }
        } catch (err) {
          console.warn("Dictionary API failed");
        }

        // API 2: Wiktionary Human Audio Search (Rich repository of human voices)
        try {
          const wikRes = await fetch(`https://en.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(text.toLowerCase().trim())}&prop=revisions&rvprop=content&format=json&origin=*`);
          const wikData = await wikRes.json();
          const pages = wikData.query.pages;
          const pageId = Object.keys(pages)[0];
          const content = pages[pageId]?.revisions?.[0]?.['*'];
          
          if (content) {
            const audioMatches = content.match(/Audio\|(.*?)[\|}]/g);
            if (audioMatches) {
              let fileTitle = "";
              if (type === 'UK') {
                fileTitle = audioMatches.find((m: string) => m.toLowerCase().includes('uk') || m.toLowerCase().includes('gb'))?.split('|')[1]?.replace('}', '') || "";
              } else {
                fileTitle = audioMatches.find((m: string) => m.toLowerCase().includes('us'))?.split('|')[1]?.replace('}', '') || "";
              }
              
              if (!fileTitle && audioMatches.length > 0) {
                fileTitle = audioMatches[0].split('|')[1]?.replace('}', '');
              }

              if (fileTitle) {
                const fileRes = await fetch(`https://en.wiktionary.org/w/api.php?action=query&titles=File:${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url&format=json&origin=*`);
                const fileData = await fileRes.json();
                const fPages = fileData.query.pages;
                const fPageId = Object.keys(fPages)[0];
                const audioUrl = fPages[fPageId]?.imageinfo?.[0]?.url;
                if (audioUrl) {
                  const audioObj = new Audio(audioUrl);
                  audioObj.onended = () => setSpeakingState(null);
                  audioObj.onerror = () => setSpeakingState(null);
                  await audioObj.play();
                  return;
                }
              }
            }
          }
        } catch (err) {
          console.warn("Wiktionary lookup failed");
        }
      }

      // API 3: Microsoft Edge TTS (Public Neural voices - High variety and robustness)
      try {
        const edgeVoice = type === 'UK' ? 'en-GB-SoniaNeural' : 'en-US-AriaNeural';
        const edgeUrl = `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D3849FA9FC&VoiceName=${edgeVoice}&Text=${encodeURIComponent(text)}`;
        const audioObj = new Audio(edgeUrl);
        audioObj.onended = () => setSpeakingState(null);
        audioObj.onerror = () => setSpeakingState(null);
        await audioObj.play();
        return;
      } catch (err) {
        console.warn("Edge TTS failed, falling back to Google");
      }

      // API 4: Google Translate TTS (Reliable fallback for phrases)
      try {
        const audioObj = new Audio(`https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${langCode}&client=tw-ob`);
        audioObj.onended = () => setSpeakingState(null);
        audioObj.onerror = () => setSpeakingState(null);
        await audioObj.play();
        return;
      } catch (err2) {
        console.warn("Google TTS failed, falling back to browser synthesis");
      }

      // API 5: Browser Web Speech API (Final fallback)
      if (!window.speechSynthesis) {
        setSpeakingState(null);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      const preferredVoiceObj = voices.find(v => v.lang.startsWith(langCode) && (v.name.includes('Neural') || v.name.includes('Online'))) 
                          || voices.find(v => v.lang.startsWith(langCode));
      
      if (preferredVoiceObj) utterance.voice = preferredVoiceObj;

      utterance.onend = () => setSpeakingState(null);
      utterance.onerror = () => setSpeakingState(null);
      window.speechSynthesis.speak(utterance);
    } catch (finalErr) {
      console.error("All pronunciation APIs failed:", finalErr);
      setSpeakingState(null);
    }
  };
  const handleTestComplete = (results: { id: string, correct: boolean }[]) => {
    const now = new Date();
    const updatedNotes = savedNotes.map(note => {
      const result = results.find(r => r.id === note.id);
      if (result) {
        const currentLevel = note.masteryLevel || 0;
        const newLevel = result.correct ? Math.min(100, currentLevel + 20) : Math.max(0, currentLevel - 10);
        
        // Spaced Repetition Interval Calculation
        let daysToAdd = 1;
        if (result.correct) {
          if (newLevel >= 100) daysToAdd = 90;
          else if (newLevel >= 80) daysToAdd = 30;
          else if (newLevel >= 60) daysToAdd = 14;
          else if (newLevel >= 40) daysToAdd = 7;
          else if (newLevel >= 20) daysToAdd = 3;
          else daysToAdd = 1;
        } else {
          daysToAdd = 0; // Review again today/tomorrow
        }

        const nextDate = new Date(now);
        nextDate.setDate(nextDate.getDate() + daysToAdd);
        
        return { 
          ...note, 
          masteryLevel: newLevel,
          lastReviewed: now.toISOString(),
          nextReview: nextDate.toISOString()
        };
      }
      return note;
    });
    setSavedNotes(updatedNotes);
    localStorage.setItem('lexiflow_notes', JSON.stringify(updatedNotes));
    updateStreak();
    setActiveLayer('daily');
    setShowNotification("Mastery levels updated");
    setTimeout(() => setShowNotification(null), 2000);
  };

  const saveNote = (item: DailyItem, type: 'word' | 'connector' | 'phrase' | 'idiom') => {
    if (savedNotes.some(n => n.term === item.term)) {
      audio.pop();
      setShowNotification("Already in your lexicon");
      setTimeout(() => setShowNotification(null), 2000);
      
      // Open expansion modal even if already saved
      setExpansionItem({ item, type });
      setIsExpansionModalOpen(true);
      return;
    }

    const newNote: SavedNote = {
      id: Math.random().toString(36).substr(2, 9),
      term: item.term,
      meaning: item.meaning,
      examples: item.examples,
      nuance: item.nuance,
      phonetic: item.phonetic,
      relatedTerms: item.relatedTerms,
      antonyms: item.antonyms,
      derivatives: item.derivatives,
      type,
      dateSaved: new Date().toISOString(),
      masteryLevel: 0,
      lastReviewed: new Date().toISOString(),
      nextReview: new Date().toISOString()
    };
    const updated = [newNote, ...savedNotes];
    audio.success();
    setSavedNotes(updated);
    localStorage.setItem('lexiflow_notes', JSON.stringify(updated));
    updateStreak();
    setShowNotification("Saved to notes");
    setTimeout(() => setShowNotification(null), 2000);

    // Open expansion modal
    setExpansionItem({ item, type });
    setIsExpansionModalOpen(true);
  };

  const saveRelated = async (term: string, relation: 'synonym' | 'antonym') => {
    // Check if it's already saved anywhere (top level or as expansion)
    const isAlreadySaved = savedNotes.some(n => 
      n.term.toLowerCase() === term.toLowerCase() || 
      n.expansions?.some(e => e.term.toLowerCase() === term.toLowerCase())
    );

    if (isAlreadySaved) {
      audio.pop();
      setShowNotification("Already in lexicon");
      setTimeout(() => setShowNotification(null), 2000);
      return;
    }

    setLoadingRelated(term);
    try {
      const res = await fetch(`/api/word-info?term=${encodeURIComponent(term)}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch info");
      }
      
      const expansionNote: SavedNote = {
        id: Math.random().toString(36).substr(2, 9),
        ...data,
        relation,
        type: 'word',
        dateSaved: new Date().toISOString(),
        masteryLevel: 0,
        lastReviewed: new Date().toISOString(),
        nextReview: new Date().toISOString()
      };

      // Find parent note to append to
      if (expansionItem) {
        const parentTerm = expansionItem.item.term;
        setSavedNotes(prev => {
          const updated = prev.map(note => {
            if (note.term.toLowerCase() === parentTerm.toLowerCase()) {
              return {
                ...note,
                expansions: [...(note.expansions || []), expansionNote]
              };
            }
            return note;
          });
          localStorage.setItem('lexiflow_notes', JSON.stringify(updated));
          return updated;
        });
      } else {
        // Fallback: save as top level if no identified parent
        setSavedNotes(prev => {
          const updated = [expansionNote, ...prev];
          localStorage.setItem('lexiflow_notes', JSON.stringify(updated));
          return updated;
        });
      }
      
      audio.success();
      setShowNotification(`Archived as ${relation}: ${term.toUpperCase()}`);
    } catch (err: any) {
      console.error(err);
      setShowNotification(err.message || "Encryption channel noisy. Try again.");
    } finally {
      setLoadingRelated(null);
      setTimeout(() => setShowNotification(null), 3000);
    }
  };

  const currentItem = content ? content[activeSection] : null;

  useEffect(() => {
    if (currentItem && activeLayer === 'daily') {
      addToHistory(currentItem);
    }
  }, [currentItem, activeLayer]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-navy gap-8">
        <motion.div 
          animate={{ 
            scale: [1, 1.02, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center border border-olive/30 relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-tr from-olive/10 to-tan/10 animate-pulse" />
             <Sparkles className="text-olive w-10 h-10 relative z-10 group-hover:rotate-12 transition-transform duration-700" />
             <div className="absolute bottom-1 right-1">
               <div className="w-1.5 h-1.5 bg-olive rounded-full animate-ping" />
             </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.5em] text-tan font-black">Decrypting Daily Stream</span>
            <div className="flex gap-1.5">
              <span className="text-[8px] font-mono text-olive/30 animate-pulse">[ESTABLISHING_LINK]</span>
              <span className="text-[8px] font-mono text-olive/30 animate-pulse delay-75">[VERIFYING_SHA]</span>
              <span className="text-[8px] font-mono text-olive/30 animate-pulse delay-150">[BUFFERING_DATA]</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-navy px-6 text-center">
        <div className="w-20 h-20 mb-8 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center">
          <X className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-serif italic text-cream mb-4">Connection Interference</h2>
        <p className="text-cream/40 text-sm max-w-md mb-10 leading-relaxed font-mono">
          {error}
        </p>
        <button 
          onClick={() => {
            audio.pop();
            fetchDailyContent();
          }}
          className="px-10 py-4 bg-cream text-navy rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-2"
        >
          <Brain className="w-4 h-4" />
          Attempt Re-link
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy text-cream font-sans relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-olive/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-tan/10 blur-[100px] rounded-full pointer-events-none" />
      
      {/* Encryption Pattern Layer */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(134,167,137, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(134,167,137, 0.1) 1px, transparent 1px)', backgroundSize: '100px 100px' }} />

      {/* Quick Jump Navigation (Desktop) */}
      <AnimatePresence>
        {activeLayer === 'daily' && content && (
          <>
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="fixed right-8 top-1/2 -translate-y-1/2 z-[90] hidden xl:flex flex-col gap-4"
            >
              {[
                { id: 'hero', icon: BookOpen, label: 'Intro' },
                { id: 'section-word', icon: Sparkles, label: 'Word' },
                { id: 'section-connector', icon: LinkIcon, label: 'Link' },
                { id: 'section-phrase', icon: Quote, label: 'Phrase' },
                { id: 'section-idiom', icon: Brain, label: 'Idiom' },
                { id: 'expansion', icon: Layers, label: 'Map' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className="group relative flex items-center justify-end"
                >
                  <div className={`px-4 py-2 rounded-full mr-4 bg-navy/80 backdrop-blur-md border border-cream/10 text-[9px] font-bold uppercase tracking-widest text-cream transition-all duration-300 pointer-events-none opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 ${activeJump === item.id ? 'opacity-100 translate-x-0 !border-olive' : ''}`}>
                    {item.label}
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border ${
                    activeJump === item.id 
                    ? 'bg-olive border-olive text-navy scale-110 shadow-[0_0_20px_rgba(134,167,137,0.3)]' 
                    : 'bg-white/5 border-cream/10 text-cream/40 hover:border-olive hover:text-cream'
                  }`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                </button>
              ))}
            </motion.div>

            {/* Mobile Bottom Navigation Bar */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] px-4 py-3 bg-cream/5 backdrop-blur-2xl border border-cream/10 rounded-2xl flex xl:hidden items-center gap-2 shadow-2xl"
            >
              {[
                { id: 'hero', icon: BookOpen },
                { id: 'section-word', icon: Sparkles },
                { id: 'section-connector', icon: LinkIcon },
                { id: 'section-phrase', icon: Quote },
                { id: 'section-idiom', icon: Brain },
                { id: 'expansion', icon: Layers }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={`p-3 rounded-xl transition-all duration-300 ${
                    activeJump === item.id 
                    ? 'bg-olive text-navy scale-110' 
                    : 'text-cream/20 hover:text-cream/50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <motion.nav 
        initial={{ y: 0 }}
        animate={{ y: showNav ? 0 : -120 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 w-full z-[100] px-6 md:px-12 py-6 flex justify-between items-center transition-all duration-700 ${isScrolled ? 'bg-navy/60 backdrop-blur-2xl border-b border-white/5 py-4' : 'bg-transparent'}`}
      >
        <AnimatePresence mode="wait">
          {!isScrolled && (
            <motion.div 
              key="logo"
              initial={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.5, ease: "circOut" }}
              className="flex items-center gap-3 md:gap-4 group cursor-pointer shrink-0"
              onClick={() => {
                audio.swoosh();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <div className="w-8 h-8 md:w-10 md:h-10 bg-cream flex items-center justify-center rounded-lg md:rounded-xl shadow-2xl group-hover:rotate-12 transition-transform duration-500 relative">
                <div className="absolute inset-0 bg-olive/20 animate-pulse rounded-lg md:rounded-xl" />
                <BookOpen className="text-navy w-5 h-5 md:w-6 md:h-6 relative z-10" />
              </div>
              <div className="flex flex-col hidden min-[450px]:flex">
                <div className="flex items-center gap-2">
                  <span className="text-lg md:text-xl font-serif font-bold tracking-tight text-cream uppercase leading-none">VERBA</span>
                </div>
                <span className="text-[8px] md:text-[10px] uppercase tracking-[0.3em] text-olive font-bold flex items-center gap-2">
                  Pulse 
                  <span className="text-[7px] md:text-[8px] text-cream/20 font-mono hidden md:inline">ID: {sessionId}</span>
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          layout
          className="flex items-center p-1 md:p-1.5 bg-white/5 backdrop-blur-3xl rounded-xl md:rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        >
          {streak > 0 && (
            <div className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 mr-1 md:mr-2 bg-olive shadow-[0_0_20px_rgba(134,167,137,0.2)] rounded-lg">
              <Flame className="w-3 h-3 md:w-3.5 md:h-3.5 text-navy fill-navy animate-pulse" />
              <span className="text-[8px] md:text-[9px] font-black tracking-widest text-navy uppercase">{streak}</span>
              <span className="text-[8px] font-black tracking-widest text-navy uppercase hidden md:inline">Day Streak</span>
            </div>
          )}
          <NavButton 
            active={activeLayer === 'daily'} 
            onClick={() => setActiveLayer('daily')}
            icon={<Sparkles className="w-4 h-4" />}
            label="Daily Flow"
          />
          <NavButton 
            active={activeLayer === 'notes'} 
            onClick={() => setActiveLayer('notes')}
            icon={<Layers className="w-4 h-4" />}
            label={`Lexicon (${savedNotes.length})`}
          />
          {savedNotes.length >= 3 && (
            <NavButton 
              active={activeLayer === 'practice'} 
              onClick={() => setActiveLayer('practice')}
              icon={<Brain className="w-4 h-4" />}
              label="Practice"
            />
          )}
          {savedNotes.length >= 10 && (
            <NavButton 
              active={activeLayer === 'test'} 
              onClick={() => setActiveLayer('test')}
              icon={<Trophy className="w-4 h-4" />}
              label="Mastery"
            />
          )}
          <button
            onClick={() => setShowTroubleshooter(true)}
            className={`flex items-center gap-2 px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl transition-all duration-500 ease-out whitespace-nowrap text-cream/40 hover:text-cream hover:bg-white/5`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </motion.div>
      </motion.nav>

      {/* Main Content */}
      <main className="pt-20 md:pt-32 pb-20 px-4 md:px-6 max-w-6xl mx-auto min-h-screen relative z-10">
        <AnimatePresence mode="wait">
          {activeLayer === 'daily' && (
            <motion.div 
              key="daily"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center"
            >
              {/* Daily Header */}
              <div id="hero" className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 mb-8 md:mb-14 items-end">
                <div className="text-left">
                  <motion.span 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] tracking-[0.4em] uppercase text-olive font-bold mb-3 block"
                  >
                    Edition — {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </motion.span>
                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.8 }}
                    className="text-2xl md:text-4xl lg:text-5xl font-serif italic text-cream leading-[0.9] tracking-tighter mb-5"
                  >
                    The Art of <br />
                    <span 
                      onClick={() => {
                        audio.pop();
                        setShowGenrePicker(!showGenrePicker);
                      }} 
                      className={`text-tan cursor-pointer hover:text-olive transition-all relative inline-block group break-words ${showGenrePicker ? 'text-olive' : ''}`}
                    >
                      {content?.genre}
                      <motion.div 
                         layoutId="underline"
                         className="absolute -bottom-1 left-0 w-full h-px bg-olive/50 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" 
                      />
                    </span>
                  </motion.h1>

                  {/* Integrated Dropdown Picker */}
                  <AnimatePresence>
                    {showGenrePicker && (
                      <motion.div 
                        initial={{ opacity: 0, y: -20, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -20, height: 0 }}
                        className="w-full mb-8 md:mb-12 overflow-hidden z-[120]"
                      >
                        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[32px] md:rounded-[40px] p-5 md:p-10 shadow-[0_40px_80px_rgba(0,0,0,0.4)] relative">
                          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-olive to-transparent opacity-30" />
                          
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-10 gap-6">
                            <div className="flex flex-col">
                              <button 
                                onClick={() => setShowGenrePicker(false)}
                                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-cream/20 hover:text-cream transition-colors md:hidden mb-2"
                              >
                                <ChevronLeft className="w-3 h-3" />
                                Back to Daily
                              </button>
                              <span className="text-[9px] md:text-[10px] uppercase tracking-[0.4em] font-bold text-olive">Select Discipline</span>
                              <span className="text-[11px] md:text-xs text-cream/30 mt-1">Calibrate your semantic daily flow</span>
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto">
                              <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-olive/40" />
                                <input 
                                  type="text"
                                  placeholder="Search disciplines..."
                                  value={genreSearch}
                                  onChange={(e) => setGenreSearch(e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-[9px] md:text-[10px] uppercase tracking-widest text-cream focus:outline-none focus:border-olive/50 transition-all placeholder:text-cream/10"
                                />
                              </div>
                              <button onClick={() => {
                                audio.thud();
                                setGenreSearch('');
                                setShowGenrePicker(false);
                              }} className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0">
                                <X className="w-4 h-4 text-cream/40" />
                              </button>
                            </div>
                          </div>

                          {availableGenres.length === 0 ? (
                            <div className="flex items-center justify-center py-20 bg-black/20 rounded-3xl border border-white/5">
                              <div className="flex flex-col items-center gap-4">
                                <div className="w-8 h-8 border-2 border-olive/30 border-t-olive rounded-full animate-spin" />
                                <span className="text-[10px] uppercase tracking-widest text-cream/20">Loading available fields...</span>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                              {availableGenres
                                .filter(g => g.toLowerCase().includes(genreSearch.toLowerCase()))
                                .map((genre, i) => (
                                <motion.button
                                  key={genre}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: i * 0.01 }}
                                  onClick={() => handleGenreChange(genre)}
                                  className={`p-5 rounded-2xl border text-left transition-all active:scale-95 group relative overflow-hidden flex flex-col justify-between min-h-[100px] ${
                                    selectedGenre === genre 
                                    ? 'bg-olive border-olive text-navy shadow-lg shadow-olive/20' 
                                    : 'bg-white/5 border-white/5 text-cream/60 hover:bg-white/10 hover:border-olive/30 hover:text-cream'
                                  }`}
                                >
                                  <div className={`absolute top-0 right-0 w-12 h-12 rounded-bl-full transition-all duration-700 ${selectedGenre === genre ? 'bg-navy/10' : 'bg-olive/5 group-hover:bg-olive/10'}`} />
                                  <h4 className="text-lg font-serif italic relative z-10 leading-tight">{genre}</h4>
                                </motion.button>
                              ))}
                              {availableGenres.filter(g => g.toLowerCase().includes(genreSearch.toLowerCase())).length === 0 && (
                                <div className="col-span-full py-12 flex flex-col items-center text-center opacity-30">
                                  <Search className="w-8 h-8 mb-4" />
                                  <p className="text-xs uppercase tracking-widest">No matching disciplines found</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-cream/50 text-xs max-w-sm leading-relaxed"
                  >
                    A daily curation exploring the semantic architecture of {content?.genre}. Master the nuances of professional discourse through intentional daily practice.
                  </motion.p>
                </div>

                <div className="flex flex-col items-end gap-6">
                  <div className="bg-cream/5 border border-cream/10 rounded-2xl p-5 backdrop-blur-sm w-full max-w-sm">
                    {streak > 0 && (
                      <div className="mb-4 flex items-center gap-3 p-3 bg-olive/10 border border-olive/20 rounded-xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <div className="w-8 h-8 bg-olive rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(134,167,137,0.3)]">
                          <Flame className="w-4 h-4 text-navy fill-navy animate-bounce" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-olive">{streak} Day Streak</span>
                          <span className="text-[7px] text-cream/40 font-bold uppercase tracking-[0.1em]">Linguistic discipline maintained</span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-tan">Retention Progress</span>
                      <span className="text-lg font-serif italic text-olive">{Math.min(savedNotes.length, 10)}/10</span>
                    </div>
                    <div className="h-1.5 w-full bg-cream/10 rounded-full overflow-hidden mb-4">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((savedNotes.length / 10) * 100, 100)}%` }}
                        className="h-full bg-olive relative"
                      >
                        <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                      </motion.div>
                    </div>
                    <button 
                      onClick={() => {
                        audio.pop();
                        setShowGenrePicker(true);
                        scrollTo('hero');
                      }}
                      className="w-full py-2.5 bg-cream text-navy rounded-xl flex items-center justify-center gap-3 group hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl font-bold uppercase tracking-widest text-[9px]"
                    >
                      Change Discipline
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Learning River Carousel */}
              <div className="w-full mt-12 relative">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-olive">Daily Flow</span>
                    <span className="text-xs text-cream/30 mt-1">Swipe through the semantic sequence</span>
                  </div>
                  <div className="flex gap-2">
                    {[
                      { type: 'word', icon: Sparkles },
                      { type: 'connector', icon: LinkIcon },
                      { type: 'phrase', icon: Quote },
                      { type: 'idiom', icon: Brain }
                    ].map((step, i) => (
                      <button
                        key={step.type}
                        onClick={() => scrollTo(`section-${step.type}`)}
                        className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                          activeJump === `section-${step.type}` 
                          ? 'bg-olive border-olive text-navy' 
                          : 'bg-white/5 border-white/10 text-cream/40 hover:border-olive/50'
                        }`}
                      >
                        <step.icon className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>

                <div 
                  className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-6 pb-12 -mx-4 md:-mx-6 px-4 md:px-6"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {[
                    { type: 'word', icon: Sparkles, color: 'text-olive', title: 'The Core Concept' },
                    { type: 'connector', icon: LinkIcon, color: 'text-tan', title: 'The Semantic Link' },
                    { type: 'phrase', icon: Quote, color: 'text-cream', title: 'The Articulated Idea' },
                    { type: 'idiom', icon: Brain, color: 'text-tan', title: 'The Cultural Nuance' }
                  ].map((section, idx) => {
                    const item = content ? content[section.type as keyof DailyContent] as DailyItem : null;
                    if (!item) return null;

                    return (
                      <motion.section 
                        key={section.type}
                        id={`section-${section.type}`}
                        className="w-full md:w-[90%] lg:w-[95%] shrink-0 snap-center snap-always"
                      >
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-[32px] p-5 md:p-8 lg:p-10 relative overflow-hidden flex flex-col lg:flex-row gap-6 lg:gap-12 items-center h-full">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-olive to-transparent opacity-20" />
                          <div className="absolute bottom-0 right-0 w-24 h-24 bg-olive/5 blur-2xl rounded-full pointer-events-none" />
                          
                          {/* Secure Data Overlay Accents */}
                          <div className="absolute top-6 right-8 hidden md:block">
                            <div className="flex items-center gap-2 opacity-15">
                              <div className="w-1 h-1 bg-olive rounded-full animate-pulse" />
                              <span className="text-[6px] font-mono tracking-widest uppercase">TX_ACTIVE</span>
                            </div>
                          </div>

                          <div className="w-full lg:w-[55%] flex flex-col items-start text-left z-10">
                            <div className="flex items-center gap-3 mb-4">
                              <div className={`w-8 h-8 rounded-xl bg-cream/10 flex items-center justify-center border border-cream/10`}>
                                <section.icon className={`w-4 h-4 ${section.color}`} />
                              </div>
                              <div>
                                <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-tan/40">Knowledge Phase 0{idx+1}</span>
                                <h4 className="text-[9px] uppercase tracking-[0.1em] font-bold text-cream underline underline-offset-4">{section.title}</h4>
                              </div>
                            </div>

                            <div className="group relative w-full">
                              <h3 
                                onClick={() => {
                                  audio.pop();
                                  setHistoryItem(item);
                                  setIsHistoryModalOpen(true);
                                }}
                                className="text-2xl md:text-3xl lg:text-4xl font-serif italic text-cream mb-3 tracking-tight leading-tight group-hover:text-olive transition-colors cursor-pointer break-words"
                              >
                                {item.term}
                              </h3>
                              {item.phonetic && (
                                <p className="font-mono text-[10px] text-olive/40 mb-4 tracking-widest bg-olive/5 px-2.5 py-1 rounded-lg inline-block break-all">{item.phonetic}</p>
                              )}
                            </div>

                            <p className="text-sm md:text-base text-cream/70 font-light leading-relaxed mb-4 max-w-xl">
                              {item.meaning}
                            </p>

                            {item.nuance && (
                              <div className="mb-6 p-4 bg-olive/5 border-l border-olive/30 rounded-r-2xl relative group/nuance">
                                <div className="absolute -left-[1px] top-3 w-[1px] h-6 bg-olive shadow-[0_0_10px_rgba(192,255,0,0.5)]" />
                                <span className="text-[7px] uppercase tracking-[0.3em] font-black text-olive/50 mb-1 block">Usage Nuance</span>
                                <p className="text-xs md:text-sm text-cream/60 italic leading-relaxed font-serif">
                                  {item.nuance}
                                </p>
                              </div>
                            )}

                            {item.derivatives && item.derivatives.length > 0 && (
                              <div className="mb-6">
                                <span className="text-[8px] uppercase tracking-widest text-tan/60 font-bold mb-3 block">Derivatives</span>
                                <div className="flex flex-wrap gap-2">
                                  {item.derivatives.map((deriv: any, idx: number) => (
                                    <button
                                      key={idx}
                                      onClick={() => setSelectedDerivative(deriv)}
                                      className="bg-cream/5 text-cream/80 text-[10px] px-3 py-1.5 rounded-lg border border-cream/10 hover:border-tan hover:text-tan transition-all shadow-sm"
                                    >
                                      {deriv.term}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-3 mt-auto pt-6">
                              <button 
                                onClick={() => saveNote(item, section.type as any)}
                                className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-olive hover:text-navy transition-all group"
                                title="Save to Lexicon"
                              >
                                <Bookmark className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              </button>
                              <button 
                                onClick={() => {
                                  audio.tap();
                                  setChatTerm(item.term);
                                }}
                                className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-tan hover:text-navy transition-all group flex items-center justify-center gap-2"
                                title="Ask Oracle AI"
                              >
                                <Bot className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] uppercase font-black tracking-widest hidden md:inline">Ask AI</span>
                              </button>
                              <div className="flex bg-white/5 border border-white/10 rounded-xl p-0.5 overflow-hidden shadow-inner flex-1 md:flex-none">
                                <motion.button 
                                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => speak(item.term, 'UK')}
                                  className="flex-1 px-4 py-2 flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] transition-all text-cream/70 hover:text-cream border-r border-white/5 group/uk relative"
                                >
                                  <Volume2 className={`w-3 h-3 transition-colors ${speakingState?.text === item.term && speakingState?.type === 'UK' ? 'text-olive animate-pulse' : 'text-olive/40 group-hover/uk:text-olive'}`} />
                                  <span>UK</span>
                                </motion.button>
                                <motion.button 
                                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => speak(item.term, 'US')}
                                  className="flex-1 px-4 py-2 flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] transition-all text-cream/70 hover:text-cream group/us relative"
                                >
                                  <Volume2 className={`w-3 h-3 transition-colors ${speakingState?.text === item.term && speakingState?.type === 'US' ? 'text-olive animate-pulse' : 'text-olive/40 group-hover/us:text-olive'}`} />
                                  <span>US</span>
                                </motion.button>
                              </div>
                            </div>

                            {/* Section Navigation */}
                            <div className="hidden lg:flex items-center gap-4 mt-8 pt-8 border-t border-white/5 w-full">
                              {idx > 0 && (
                                <button 
                                  onClick={() => scrollTo(`section-${['word', 'connector', 'phrase', 'idiom'][idx - 1]}`)}
                                  className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-cream/20 hover:text-olive transition-colors group"
                                >
                                  <ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                                  Previous Step
                                </button>
                              )}
                              <div className="flex-1 h-px bg-white/5" />
                              {idx < 3 && (
                                <button 
                                  onClick={() => scrollTo(`section-${['word', 'connector', 'phrase', 'idiom'][idx + 1]}`)}
                                  className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-cream/20 hover:text-olive transition-colors group"
                                >
                                  Next Step
                                  <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="w-full lg:w-[45%] p-0.5 bg-gradient-to-br from-cream/10 to-transparent rounded-2xl z-10">
                            <div className="bg-black/20 h-full rounded-[24px] p-5 md:p-8 lg:p-10 flex flex-col justify-center gap-5 border border-white/5 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden group">
                               <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-olive/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-700" />
                               <span className="text-[9px] uppercase tracking-[0.6em] text-tan font-black block mb-1 opacity-50 text-center md:text-left">Case Studies</span>
                               {item.examples.slice(0, 3).map((ex, i) => (
                                 <div key={i} className="flex gap-4 md:gap-5 items-start group/ex">
                                   <div className="flex flex-col items-center">
                                      <span className="text-olive font-serif italic text-lg opacity-20 group-hover/ex:opacity-100 transition-all duration-500">0{i+1}</span>
                                      <div className="w-px h-4 bg-cream/5" />
                                   </div>
                                   <p className="text-cream font-serif italic text-sm md:text-base leading-relaxed flex-1 tracking-tight font-light">"{ex}"</p>
                                 </div>
                               ))}
                            </div>
                          </div>
                        </div>
                      </motion.section>
                    );
                  })}
                </div>
              </div>

              {/* Session History / Persistent Navigation */}
              <AnimatePresence>
                {sessionHistory.length > 1 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="w-full mt-32 relative group"
                  >
                    <div className="flex items-center justify-between mb-8">
                       <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-olive">Navigation History</span>
                        <span className="text-xs text-cream/30 mt-1">Recently explored in this session</span>
                      </div>
                      <button 
                        onClick={() => {
                          setSessionHistory([]);
                          sessionStorage.removeItem('lexiflow_session_history');
                        }}
                        className="text-[9px] uppercase tracking-widest font-black text-cream/10 hover:text-red-500 transition-colors"
                      >
                        Clear Session
                      </button>
                    </div>

                    <div className="flex overflow-x-auto gap-4 pb-4 px-2 -mx-2 hover:scrollbar-show scrollbar-hide">
                      {sessionHistory.map((item, i) => (
                        <motion.button
                          key={`${item.term}-${i}`}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => {
                            audio.pop();
                            setHistoryItem(item);
                            setIsHistoryModalOpen(true);
                          }}
                          className="shrink-0 flex flex-col p-6 bg-white/5 border border-white/5 rounded-3xl min-w-[200px] hover:border-olive/50 hover:bg-white/10 transition-all text-left group/history"
                        >
                          <span className="text-[10px] uppercase tracking-widest text-tan/40 mb-3 group-hover/history:text-olive transition-colors">Refined Insight</span>
                          <h4 className="text-xl font-serif italic text-cream mb-2 truncate group-hover/history:text-olive transition-colors">{item.term}</h4>
                          <p className="text-[10px] text-cream/30 line-clamp-2 uppercase tracking-tight font-bold">{item.meaning}</p>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Expansion Map Section */}
              <motion.div 
                id="expansion"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="w-full mt-12 pt-12 border-t border-cream/10 flex flex-col items-center"
              >
                <div className="text-center mb-8">
                  <span className="text-[9px] tracking-[0.5em] uppercase text-olive font-bold mb-3 block">Holistic Mastery</span>
                  <h2 className="text-2xl md:text-4xl font-serif italic text-cream leading-tight">The expansion map</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                  {['word', 'connector', 'phrase', 'idiom'].map((type) => {
                    const item = content[type as keyof DailyContent] as DailyItem;
                    return (
                      <div key={type} className="bg-cream/5 border border-cream/10 rounded-2xl p-6 backdrop-blur-sm group hover:bg-olive/10 transition-all hover:-translate-y-1">
                        <span className="text-[9px] uppercase font-bold tracking-[0.3em] text-tan/40 mb-3 block">{type}</span>
                        <h4 
                          onClick={() => {
                            audio.pop();
                            setHistoryItem(item);
                            setIsHistoryModalOpen(true);
                          }}
                          className="text-xl font-serif italic text-cream mb-4 group-hover:text-olive transition-colors cursor-pointer"
                        >
                          {item.term}
                        </h4>
                        
                        <div className="space-y-4">
                          <div>
                            <span className="text-[7px] uppercase tracking-widest text-olive/60 font-bold mb-2 block">Related Patterns</span>
                            <div className="flex flex-wrap gap-1.5">
                              {item.relatedTerms?.map((term, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => {
                                      audio.tap();
                                      speak(term, 'US');
                                    }}
                                    className="bg-navy/40 text-cream/70 text-[8px] px-2.5 py-1 rounded-lg border border-cream/5 hover:border-tan hover:text-tan transition-all"
                                  >
                                    {term}
                                </button>
                              ))}
                            </div>
                          </div>

                          {item.antonyms && item.antonyms.length > 0 && (
                            <div>
                              <span className="text-[8px] uppercase tracking-widest text-red-400/40 font-bold mb-3 block">Antonyms</span>
                              <div className="flex flex-wrap gap-2">
                                {item.antonyms.map((term, idx) => (
                                  <button 
                                      key={idx}
                                      onClick={() => {
                                        audio.tap();
                                        speak(term, 'US');
                                      }}
                                      className="bg-red-500/5 text-red-200/50 text-[9px] px-3 py-1.5 rounded-xl border border-red-500/10 hover:border-red-400 hover:text-red-300 transition-all"
                                    >
                                      {term}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeLayer === 'notes' && (
            <motion.div 
              key="notes"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 md:gap-8 mb-8 md:mb-10">
                <div className="max-w-lg w-full">
                  <span className="text-[8px] tracking-[0.4em] uppercase text-olive font-bold mb-2 block">Archive</span>
                  <h2 className="text-2xl md:text-3xl font-serif italic text-cream leading-[0.9] mb-3">Personal<br />Lexicon</h2>
                  <p className="text-cream/50 text-[10px] leading-relaxed mb-4">Your persisted repository of semantic knowledge. Each term added here builds your unique professional discourse.</p>
                  
                  {savedNotes.length >= 3 && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        audio.success();
                        setActiveLayer('practice');
                      }}
                      className="flex items-center gap-3 px-6 py-3 bg-olive text-navy rounded-xl font-black uppercase tracking-[0.2em] text-[9px] shadow-2xl hover:bg-white transition-all w-full md:w-auto justify-center"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      Active Practice Mode
                    </motion.button>
                  )}
                </div>

                <div className="flex flex-col gap-4 w-full lg:w-fit">
                   <div className="relative group w-full">
                    <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-3 h-3 md:w-3.5 md:h-3.5 text-tan/40 group-focus-within:text-olive transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Filter by term or meaning..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full lg:w-80 bg-cream/5 border border-cream/10 rounded-xl py-3 pl-10 md:pl-12 pr-5 text-sm focus:outline-none focus:border-olive/50 transition-all placeholder:text-cream/20"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {['all', 'word', 'connector', 'phrase', 'idiom'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setFilterType(type as any)}
                        className={`px-3 md:px-4 py-1.5 rounded-full text-[8px] md:text-[9px] font-bold uppercase tracking-widest border transition-all ${
                          filterType === type 
                          ? 'bg-olive text-navy border-olive' 
                          : 'border-cream/10 text-cream/40 hover:border-cream/30'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {savedNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 border border-dashed border-cream/10 rounded-[40px] bg-cream/5">
                  <div className="w-20 h-20 bg-cream/5 rounded-full flex items-center justify-center mb-8">
                     <Layers className="w-10 h-10 text-cream/10" />
                  </div>
                  <p className="text-2xl italic font-serif text-cream/30">Your lexicon is currently empty...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {savedNotes
                    .filter(note => {
                      const matchesSearch = note.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        note.meaning.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesFilter = filterType === 'all' || note.type === filterType;
                      return matchesSearch && matchesFilter;
                    })
                    .map((note) => (
                    <motion.div 
                      layout
                      key={note.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group bg-cream p-6 md:p-8 rounded-[32px] relative overflow-hidden flex flex-col shadow-2xl"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-navy/5 rounded-bl-[100%] pointer-events-none" />
                      
                      <div className="flex items-center gap-3 mb-6">
                        <span className="px-3 py-1 bg-navy text-cream text-[8px] uppercase font-bold tracking-[0.2em] rounded-full">
                          {note.type}
                        </span>
                        <div className="h-px flex-1 bg-navy/5" />
                        <span className="text-[8px] text-navy/30 uppercase font-black tracking-widest">
                          {new Date(note.dateSaved).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex flex-col mb-6">
                        <div className="flex justify-between items-start">
                          <h3 className="text-2xl md:text-3xl font-serif italic text-navy leading-none mb-1">{note.term}</h3>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => {
                                audio.tap();
                                setChatTerm(note.term);
                              }}
                              className="p-2.5 bg-navy/5 rounded-full hover:bg-tan/20 text-navy/40 hover:text-navy transition-all"
                              title="Ask Oracle AI"
                            >
                              <Bot className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => {
                                audio.pop();
                                const updated = savedNotes.filter(n => n.id !== note.id);
                                setSavedNotes(updated);
                                localStorage.setItem('lexiflow_notes', JSON.stringify(updated));
                              }}
                              className="p-2.5 bg-navy/5 rounded-full hover:bg-red-50 text-navy/30 hover:text-red-500 transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {note.phonetic && <p className="text-[9px] font-mono text-navy/40 uppercase tracking-widest">{note.phonetic}</p>}
                      </div>

                      <p className="text-base text-navy/60 font-light leading-relaxed mb-6 border-l border-olive/20 pl-5">
                        {note.meaning}
                      </p>

                      {/* Expansions / Related Slot */}
                      {((note.expansions && note.expansions.length > 0) || (note.derivatives && note.derivatives.length > 0)) && (
                        <div className="mb-6 space-y-3">
                          {/* Derivatives Section */}
                          {note.derivatives && note.derivatives.length > 0 && (
                            <div className="p-3 bg-red-400/5 rounded-2xl border border-red-400/5">
                              <div className="flex items-center justify-between mb-2 px-1">
                                <span className="text-[8px] uppercase tracking-widest font-black text-red-500/50">Derivatives</span>
                                <Layers className="w-2.5 h-2.5 text-red-500/20" />
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {note.derivatives.map((deriv, idx) => (
                                  <motion.button 
                                    key={idx}
                                    onClick={() => setSelectedDerivative(deriv)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/50 rounded-lg border border-red-500/10 shadow-sm hover:border-red-400 hover:text-red-400 transition-all text-left"
                                  >
                                    <span className="text-[11px] font-serif italic text-navy/70">{deriv.term}</span>
                                  </motion.button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Synonyms Section */}
                          {note.expansions && note.expansions.some(e => e.relation === 'synonym') && (
                            <div className="p-3 bg-olive/5 rounded-2xl border border-olive/5">
                              <div className="flex items-center justify-between mb-2 px-1">
                                <span className="text-[8px] uppercase tracking-widest font-black text-olive/50">Synonyms</span>
                                <Layers className="w-2.5 h-2.5 text-olive/20" />
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {note.expansions.filter(e => e.relation === 'synonym').map((exp, idx) => (
                                  <motion.div 
                                    key={idx}
                                    className="flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-white/50 rounded-lg border border-olive/5 shadow-sm"
                                  >
                                    <span className="text-[11px] font-serif italic text-navy/70">{exp.term}</span>
                                    <button 
                                      onClick={() => {
                                        audio.thud();
                                        setSavedNotes(prev => {
                                          const updated = prev.map(n => {
                                            if (n.id === note.id) {
                                              return {
                                                ...n,
                                                expansions: n.expansions?.filter(e => e.id !== exp.id)
                                              };
                                            }
                                            return n;
                                          });
                                          localStorage.setItem('lexiflow_notes', JSON.stringify(updated));
                                          return updated;
                                        });
                                      }}
                                      className="w-4 h-4 flex items-center justify-center text-navy/20 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Antonyms Section */}
                          {note.expansions && note.expansions.some(e => e.relation === 'antonym') && (
                            <div className="p-3 bg-tan/5 rounded-2xl border border-tan/5">
                              <div className="flex items-center justify-between mb-2 px-1">
                                <span className="text-[8px] uppercase tracking-widest font-black text-tan/50">Antonyms</span>
                                <ChevronRight className="w-2.5 h-2.5 text-tan/20" />
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {note.expansions.filter(e => e.relation === 'antonym').map((exp, idx) => (
                                  <motion.div 
                                    key={idx}
                                    className="flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-white/50 rounded-lg border border-tan/5 shadow-sm"
                                  >
                                    <span className="text-[11px] font-serif italic text-navy/70">{exp.term}</span>
                                    <button 
                                      onClick={() => {
                                        audio.thud();
                                        setSavedNotes(prev => {
                                          const updated = prev.map(n => {
                                            if (n.id === note.id) {
                                              return {
                                                ...n,
                                                expansions: n.expansions?.filter(e => e.id !== exp.id)
                                              };
                                            }
                                            return n;
                                          });
                                          localStorage.setItem('lexiflow_notes', JSON.stringify(updated));
                                          return updated;
                                        });
                                      }}
                                      className="w-4 h-4 flex items-center justify-center text-navy/20 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex bg-navy/5 p-1 rounded-2xl gap-1 mt-auto overflow-hidden">
                        <button 
                           onClick={() => {
                             audio.tap();
                             speak(note.term, 'UK');
                           }}
                           className={`flex-1 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${speakingState?.text === note.term && speakingState?.type === 'UK' ? 'bg-olive text-navy animate-pulse' : 'hover:bg-navy/10 text-navy/40 hover:text-navy'}`}
                         >
                           <Volume2 className="w-3 h-3" />
                           UK
                         </button>
                         <div className="w-px h-6 my-auto bg-navy/5" />
                         <button 
                           onClick={() => {
                             audio.tap();
                             speak(note.term, 'US');
                           }}
                           className={`flex-1 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${speakingState?.text === note.term && speakingState?.type === 'US' ? 'bg-olive text-navy animate-pulse' : 'hover:bg-navy/10 text-navy/40 hover:text-navy'}`}
                         >
                           <Volume2 className="w-3 h-3" />
                           US
                         </button>
                      </div>

                      {/* Mastery Bar */}
                      <div className="mt-8">
                        <div className="flex justify-between items-center text-[8px] uppercase tracking-tighter mb-2 font-black">
                           <div className="flex items-center gap-2">
                             <span className="text-navy/40">Knowledge Retention</span>
                             <span className="text-olive">{note.masteryLevel || 0}%</span>
                           </div>
                           {note.nextReview && (
                             <span className={new Date(note.nextReview) <= new Date() ? "text-red-500 animate-pulse" : "text-navy/20"}>
                               Next: {new Date(note.nextReview).toLocaleDateString()}
                             </span>
                           )}
                        </div>
                        <div className="h-1 w-full bg-navy/5 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${note.masteryLevel || 0}%` }}
                             className="h-full bg-olive shadow-[0_0_8px_rgba(134,167,137,0.4)]"
                           />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeLayer === 'test' && (
            <VocabularyTest 
              notes={savedNotes} 
              onComplete={handleTestComplete}
              onClose={() => setActiveLayer('daily')} 
            />
          )}

          {activeLayer === 'practice' && (
            <PracticeMode 
              notes={savedNotes}
              onClose={() => setActiveLayer('notes')}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Notifications */}
      <AnimatePresence>
        {showNotification && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[300] flex items-center gap-4 font-bold uppercase tracking-widest text-[10px] border backdrop-blur-3xl transition-all ${
              showNotification.toLowerCase().includes('fail') || showNotification.toLowerCase().includes('cool') 
              ? 'bg-red-500/10 border-red-500/50 text-red-500' 
              : 'bg-navy/90 border-olive/30 text-olive'
            }`}
          >
            <div className={`w-2 h-2 rounded-full animate-ping ${
              showNotification.toLowerCase().includes('fail') || showNotification.toLowerCase().includes('cool') 
              ? 'bg-red-500' 
              : 'bg-olive'
            }`} />
            <span className="font-mono tracking-tighter">{showNotification}</span>
            <div className="flex gap-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-1 h-3 bg-current opacity-20" />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Derivative Modal */}
      <AnimatePresence>
        {selectedDerivative && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-navy/80 backdrop-blur-xl"
            onClick={() => setSelectedDerivative(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-navy border border-cream/10 rounded-3xl p-8 md:p-10 max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedDerivative(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-cream/5 text-cream/40 hover:text-cream transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <span className="text-[10px] tracking-widest uppercase text-tan/50 font-bold mb-4 block">Derivative</span>
              <h3 className="text-3xl font-serif italic text-cream mb-4">{selectedDerivative.term}</h3>
              <p className="text-cream/70 leading-relaxed font-light mb-8">{selectedDerivative.meaning}</p>
              
              <div className="bg-olive/5 border border-olive/10 rounded-2xl p-6 relative mb-8">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-olive/10 to-transparent rounded-bl-full" />
                <span className="text-[8px] tracking-widest uppercase text-olive/50 font-bold mb-3 block">In Context</span>
                <p className="text-cream/90 font-serif italic leading-relaxed text-sm">
                  "{selectedDerivative.example}"
                </p>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    audio.tap();
                    speak(selectedDerivative.term, 'UK');
                  }}
                  className={`flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] py-3 px-6 rounded-xl hover:scale-105 transition-all shadow-sm flex-1 border ${speakingState?.text === selectedDerivative.term && speakingState?.type === 'UK' ? 'bg-olive text-navy border-olive animate-pulse' : 'bg-transparent text-cream border-cream/10 hover:bg-cream/5'}`}
                >
                  <Volume2 className={`w-3.5 h-3.5 ${speakingState?.text === selectedDerivative.term && speakingState?.type === 'UK' ? 'animate-bounce' : ''}`} />
                  UK Voice
                </button>
                <button 
                  onClick={() => {
                    audio.tap();
                    speak(selectedDerivative.term, 'US');
                  }}
                  className={`flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] py-3 px-6 rounded-xl hover:scale-105 transition-all shadow-sm flex-1 border ${speakingState?.text === selectedDerivative.term && speakingState?.type === 'US' ? 'bg-olive text-navy border-olive animate-pulse' : 'bg-transparent text-cream border-cream/10 hover:bg-cream/5'}`}
                >
                  <Volume2 className={`w-3.5 h-3.5 ${speakingState?.text === selectedDerivative.term && speakingState?.type === 'US' ? 'animate-bounce' : ''}`} />
                  US Voice
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {isHistoryModalOpen && historyItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-navy/80 backdrop-blur-xl overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-cream w-full max-w-xl rounded-[32px] p-6 md:p-10 relative overflow-hidden text-navy shadow-[0_40px_100px_rgba(0,0,0,0.6)] my-auto max-h-[90vh] overflow-y-auto scrollbar-hide"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-olive/5 rounded-bl-[100%] pointer-events-none" />
              
              <button 
                onClick={() => {
                  audio.thud();
                  setIsHistoryModalOpen(false);
                }} 
                className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 bg-navy text-cream rounded-full flex items-center justify-center hover:scale-110 transition-transform z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-navy/40 hover:text-navy transition-colors md:hidden"
                >
                  <ChevronLeft className="w-3 h-3" />
                  Back
                </button>
                <span className="text-[9px] uppercase tracking-[0.5em] font-black text-olive block">Semantic Origins</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-serif italic mb-6 leading-none">{historyItem.term}</h2>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-[9px] uppercase tracking-widest font-black text-navy/40 mb-3">The Narrative History</h4>
                  <p className="text-lg md:text-xl font-serif italic leading-relaxed text-navy font-medium">
                    {historyItem.history || "This term evolved through layers of semantic shifts, carrying its core essence through history."}
                  </p>
                </div>

                <div className="pt-6 border-t border-navy/10">
                  <h4 className="text-[9px] uppercase tracking-widest font-black text-navy/40 mb-3">Core Definition</h4>
                  <p className="text-base font-normal leading-relaxed text-navy/70 mb-6">
                    {historyItem.meaning}
                  </p>
                  {historyItem.nuance && (
                    <div className="p-4 bg-navy/5 rounded-2xl border border-navy/5">
                       <span className="text-[7px] uppercase tracking-widest font-bold text-olive mb-1 block">Linguistic Tip</span>
                       <p className="text-xs text-navy/60 italic">
                         {historyItem.nuance}
                       </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      audio.tap();
                      speak(historyItem.term, 'UK');
                    }}
                    className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] py-3 px-6 rounded-xl hover:scale-105 transition-all shadow-sm ${speakingState?.text === historyItem.term && speakingState?.type === 'UK' ? 'bg-olive text-navy animate-pulse' : 'bg-navy text-cream'}`}
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${speakingState?.text === historyItem.term && speakingState?.type === 'UK' ? 'animate-bounce' : ''}`} />
                    UK Voice
                  </button>
                  <button 
                    onClick={() => {
                      audio.tap();
                      speak(historyItem.term, 'US');
                    }}
                    className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] py-3 px-6 rounded-xl hover:scale-105 transition-all shadow-sm ${speakingState?.text === historyItem.term && speakingState?.type === 'US' ? 'bg-olive text-navy animate-pulse' : 'bg-navy text-cream'}`}
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${speakingState?.text === historyItem.term && speakingState?.type === 'US' ? 'animate-bounce' : ''}`} />
                    US Voice
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Expansion Modal */}
      <AnimatePresence>
        {isExpansionModalOpen && expansionItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-navy/80 backdrop-blur-3xl overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
              className="bg-cream w-full max-w-2xl rounded-[32px] p-5 md:p-8 relative overflow-hidden text-navy shadow-[0_40px_100px_rgba(0,0,0,0.6)] my-auto max-h-[90vh] overflow-y-auto scrollbar-hide"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-olive/5 rounded-bl-full pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-tan/5 rounded-full blur-3xl pointer-events-none" />

              <button 
                onClick={() => {
                  audio.thud();
                  setIsExpansionModalOpen(false);
                }} 
                className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 bg-navy text-cream rounded-full flex items-center justify-center hover:scale-110 transition-transform z-10 shadow-xl"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col md:flex-row gap-8 lg:gap-10 relative z-10">
                <div className="w-full md:w-1/2">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-2 py-1 bg-olive/20 text-olive text-[8px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5">
                        <div className="w-1 h-1 bg-olive rounded-full animate-ping" />
                        Expansion Protocol
                      </span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-serif italic mb-4 leading-tight tracking-tight relative group/term">
                      <span className="relative z-10">{expansionItem.item.term}</span>
                    </h2>
                    <div className="flex items-center gap-3 mb-6">
                      <p className="font-mono text-[10px] text-navy/40 tracking-widest uppercase">{expansionItem.item.phonetic}</p>
                      <div className="h-px flex-1 bg-navy/10" />
                    </div>
                   
                   <div className="space-y-6">
                     <div>
                       <span className="text-[9px] uppercase tracking-widest font-black text-navy/30 mb-2 block">Definition</span>
                       <p className="text-base md:text-lg font-serif italic text-navy/80 leading-relaxed border-l-2 border-olive/30 pl-4">
                         {expansionItem.item.meaning}
                       </p>
                     </div>
                     <div>
                       <span className="text-[9px] uppercase tracking-widest font-black text-navy/30 mb-2 block">Mastered Usage</span>
                       <div className="space-y-3">
                         {expansionItem.item.examples.slice(0, 2).map((ex, i) => (
                           <p key={i} className="text-xs font-light text-navy/60 italic leading-relaxed">"{ex}"</p>
                         ))}
                       </div>
                     </div>
                   </div>
                </div>

                <div className="w-full md:w-1/2 flex flex-col gap-6">
                   <div className="p-5 bg-navy/5 rounded-[24px] border border-navy/5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className="text-[8px] uppercase tracking-widest font-black text-olive block mb-0.5">Synonyms</span>
                          <span className="text-[7px] text-navy/30 uppercase font-bold tracking-tight">Expand related concepts</span>
                        </div>
                        <Layers className="w-3.5 h-3.5 text-olive/20" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {expansionItem.item.relatedTerms?.map((term, idx) => (
                          <motion.button 
                            key={idx}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={loadingRelated !== null}
                            onClick={() => saveRelated(term, 'synonym')}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all ${
                              savedNotes.some(n => n.term.toLowerCase() === term.toLowerCase() || n.expansions?.some(e => e.term.toLowerCase() === term.toLowerCase()))
                              ? 'bg-olive text-navy border-olive opacity-50'
                              : 'bg-white text-navy border-navy/10 hover:border-olive hover:shadow-lg'
                            }`}
                          >
                            <span className="text-xs font-serif italic">{term}</span>
                            {loadingRelated === term ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : savedNotes.some(n => n.term.toLowerCase() === term.toLowerCase() || n.expansions?.some(e => e.term.toLowerCase() === term.toLowerCase())) ? (
                              <CheckCircle2 className="w-2.5 h-2.5" />
                            ) : (
                              <Plus className="w-2.5 h-2.5 text-olive" />
                            )}
                          </motion.button>
                        ))}
                      </div>
                   </div>

                   <div className="p-5 bg-tan/5 rounded-[24px] border border-tan/10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className="text-[8px] uppercase tracking-widest font-black text-tan block mb-0.5">Antonyms</span>
                          <span className="text-[7px] text-navy/30 uppercase font-bold tracking-tight">Contrast opposites</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-tan/20" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {expansionItem.item.antonyms?.map((term, idx) => (
                          <motion.button 
                            key={idx}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={loadingRelated !== null}
                            onClick={() => saveRelated(term, 'antonym')}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all ${
                              savedNotes.some(n => n.term.toLowerCase() === term.toLowerCase() || n.expansions?.some(e => e.term.toLowerCase() === term.toLowerCase()))
                              ? 'bg-tan text-navy border-tan opacity-50'
                              : 'bg-white text-navy border-navy/10 hover:border-tan hover:shadow-lg'
                            }`}
                          >
                            <span className="text-xs font-serif italic">{term}</span>
                            {loadingRelated === term ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : savedNotes.some(n => n.term.toLowerCase() === term.toLowerCase() || n.expansions?.some(e => e.term.toLowerCase() === term.toLowerCase())) ? (
                              <CheckCircle2 className="w-2.5 h-2.5" />
                            ) : (
                              <Plus className="w-2.5 h-2.5 text-tan" />
                            )}
                          </motion.button>
                        ))}
                      </div>
                   </div>

                   {expansionItem.item.derivatives && expansionItem.item.derivatives.length > 0 && (
                     <div className="p-5 bg-olive/5 rounded-[24px] border border-olive/10">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <span className="text-[8px] uppercase tracking-widest font-black text-olive block mb-0.5">Derivatives</span>
                            <span className="text-[7px] text-navy/30 uppercase font-bold tracking-tight">Word forms</span>
                          </div>
                          <Layers className="w-3.5 h-3.5 text-olive/20" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {expansionItem.item.derivatives.map((deriv: any, idx: number) => (
                            <button 
                              key={idx}
                              onClick={() => setSelectedDerivative(deriv)}
                              className="bg-white text-navy border border-navy/10 hover:border-olive hover:shadow-lg transition-all text-xs font-serif italic px-3.5 py-2 rounded-xl"
                            >
                              {deriv.term}
                            </button>
                          ))}
                        </div>
                     </div>
                   )}

                   <div className="mt-auto">
                      <p className="text-[10px] text-navy/20 font-black uppercase tracking-[0.3em] text-center mb-6">Mastery of nuance requires depth</p>
                      <button 
                        onClick={() => setIsExpansionModalOpen(false)}
                        className="w-full py-6 bg-navy text-cream rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-olive hover:text-navy transition-all shadow-2xl"
                      >
                        Complete Expansion
                      </button>
                   </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chatTerm && (
          <ChatBot 
            term={chatTerm} 
            onClose={() => setChatTerm(null)}
            masteryLevel={savedNotes.find(n => n.term === chatTerm)?.masteryLevel}
            genre={content?.genre}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTroubleshooter && (
          <TroubleshooterChatBot onClose={() => setShowTroubleshooter(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
