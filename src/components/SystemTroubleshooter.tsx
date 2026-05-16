import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bot, Send, Loader2, Sparkles, Wrench } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'model';
  content: string | {
    summary: string;
    steps: string[];
    automatedFixAvailable: boolean;
    automatedFixAction?: string;
  };
}

export function TroubleshooterChatBot({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{
      role: 'model',
      content: "Hello! I am VDE-1, the VERBA System AI Engine. If you are experiencing any issues, describe them, and I will perform a structural diagnosis for you."
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFixAction = (action?: string) => {
    if (action === 'RELOAD_PAGE') {
      window.location.reload();
    } else if (action === 'CLEAR_CACHE') {
      sessionStorage.clear();
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/troubleshoot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'model', content: data }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', content: "I'm sorry, I encountered a communication error with the system diagnostic core." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const isStructured = (content: any): content is { summary: string; steps: string[]; automatedFixAvailable: boolean; automatedFixAction?: string; } => {
    return typeof content === 'object' && content !== null && 'summary' in content;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-navy/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg bg-navy border border-olive/30 rounded-3xl shadow-2xl flex flex-col h-[500px]">
        <div className="p-4 border-b border-olive/20 flex justify-between items-center">
          <div className="flex items-center gap-2 text-olive">
            <Wrench className="w-5 h-5" />
            <h3 className="font-serif italic font-bold">VDE-1 System Diagnostics</h3>
          </div>
          <button onClick={onClose} className="text-cream/40 hover:text-cream"><X className="w-5 h-5"/></button>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((m, i) => {
            const content = m.content;
            return (
              <div key={i} className={`p-4 rounded-2xl ${m.role === 'user' ? 'bg-olive text-navy ml-auto max-w-[85%]' : 'bg-white/5 text-cream max-w-[90%]'}`}>
                {typeof content === 'string' ? (
                  content
                ) : isStructured(content) ? (
                  <div className="space-y-3">
                    <div className="font-bold text-olive">{content.summary}</div>
                    <ul className="list-disc pl-4 space-y-1">
                      {content.steps.map((step, idx) => <li key={idx} className="text-sm">{step}</li>)}
                    </ul>
                    {content.automatedFixAvailable && content.automatedFixAction && (
                      <button 
                        onClick={() => handleFixAction(content.automatedFixAction)}
                        className="w-full mt-2 bg-olive hover:bg-olive/90 text-navy font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" /> Run Automated Fix
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 rounded-2xl bg-white/5 border border-olive/20 self-start flex flex-col gap-3 max-w-[90%] relative overflow-hidden"
            >
              {/* Scanline/Shimmer */}
              <motion.div 
                initial={{ y: '-100%' }}
                animate={{ y: '200%' }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="absolute inset-0 h-10 w-full bg-olive/5 blur-xl pointer-events-none"
              />

              <div className="flex items-center gap-2 text-olive font-mono text-xs">
                <Loader2 className="animate-spin w-3 h-3" />
                <span className="animate-pulse">VDE-1 RUNNING DIAGNOSTIC_CORE...</span>
              </div>
              
              <div className="h-0.5 w-full bg-olive/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: ["0%", "30%", "60%", "90%"] }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 5, 
                    times: [0, 0.3, 0.7, 1]
                  }}
                  className="h-full bg-olive shadow-[0_0_10px_#86a789]"
                />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-olive/20 flex gap-2">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Report a system issue..."
            className="flex-1 bg-white/5 border border-olive/20 rounded-xl p-3 text-cream text-sm focus:outline-none focus:border-olive"
          />
          <button onClick={handleSend} disabled={isLoading} className="p-3 bg-olive text-navy rounded-xl"><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </motion.div>
  );
}
