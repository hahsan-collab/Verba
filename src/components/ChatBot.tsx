import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, Bot, User, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface ChatBotProps {
  term: string;
  onClose: () => void;
  masteryLevel?: number;
  genre?: string;
}

export function ChatBot({ term, onClose, masteryLevel, genre }: ChatBotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial greeting
    const masteryContext = masteryLevel !== undefined ? ` (Mastery Level: ${masteryLevel}/100)` : "";
    const genreContext = genre ? ` within the theme of "${genre}"` : "";
    setMessages([{
      role: 'model',
      content: `Hello! I'm your VERBA AI assistant. What would you like to know about the term "${term}"${masteryContext}${genreContext}? I can explain its history, nuanced usage, or clarify its meaning.`
    }]);
  }, [term, masteryLevel, genre]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term,
          message: userMessage,
          history: messages.slice(1), // exclude initial greeting
          masteryLevel,
          genre
        })
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to get response');

      setMessages(prev => [...prev, { role: 'model', content: data.reply }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: error.message || "Sorry, I'm having trouble connecting right now. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 bg-navy/80 backdrop-blur-2xl"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-navy border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col h-[80vh] sm:h-[600px] relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-olive flex items-center justify-center shadow-[0_0_20px_rgba(134,167,137,0.3)]">
              <Bot className="w-5 h-5 text-navy" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-black tracking-[0.2em] text-olive">VERBA Oracle</span>
              <span className="text-xl font-serif italic text-cream leading-none">{term}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-cream flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 relative">
          <AnimatePresence mode="popLayout">
            {messages.map((msg, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                layout
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center transition-colors ${
                  msg.role === 'user' ? 'bg-cream text-navy' : 'bg-olive text-navy'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-4 rounded-3xl max-w-[90%] text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                    ? 'bg-white/10 text-cream rounded-tr-none border border-white/10' 
                    : 'bg-olive/15 text-cream/95 rounded-tl-none border border-olive/30 shadow-olive/5'
                  }`}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="markdown-body prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-strong:text-olive prose-code:text-olive">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4"
            >
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-8 h-8 rounded-full flex shrink-0 items-center justify-center bg-olive text-navy shadow-lg shadow-olive/20"
              >
                <Bot className="w-4 h-4" />
              </motion.div>
              <div className="relative group overflow-hidden px-5 py-4 rounded-3xl rounded-tl-none bg-olive/10 border border-olive/20 text-olive flex flex-col gap-3 min-w-[180px]">
                {/* Shimmer Effect */}
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg]"
                />
                
                <div className="flex items-center gap-3 relative z-10">
                  <div className="flex gap-1.5">
                    <motion.span 
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} 
                      transition={{ repeat: Infinity, duration: 1 }} 
                      className="w-1.5 h-1.5 bg-olive rounded-full" 
                    />
                    <motion.span 
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} 
                      transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} 
                      className="w-1.5 h-1.5 bg-olive rounded-full" 
                    />
                    <motion.span 
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} 
                      transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} 
                      className="w-1.5 h-1.5 bg-olive rounded-full" 
                    />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest font-black opacity-80">VERBA is thinking</span>
                </div>

                {/* Progress Indicator */}
                <div className="h-1 w-full bg-olive/10 rounded-full overflow-hidden relative z-10">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: ["0%", "40%", "70%", "95%"] }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 8, 
                      times: [0, 0.2, 0.6, 1],
                      repeatDelay: 1
                    }}
                    className="h-full bg-olive shadow-[0_0_8px_rgba(134,167,137,0.5)]"
                  />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="p-4 sm:p-6 bg-white/[0.03] border-t border-white/10 backdrop-blur-md">
          <div className="flex gap-2 p-1.5 bg-navy/50 rounded-[24px] border border-white/10 relative overflow-hidden focus-within:border-olive/50 focus-within:ring-1 focus-within:ring-olive/20 transition-all shadow-inner">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage();
              }}
              placeholder="Ask me anything about this vocabulary..."
              className="flex-1 bg-transparent px-5 py-3 text-cream placeholder-cream/40 outline-none text-sm font-light"
            />
            <button 
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="w-11 h-11 rounded-[18px] bg-olive text-navy flex items-center justify-center disabled:opacity-30 disabled:bg-white/10 disabled:grayscale hover:scale-105 active:scale-95 transition-all shadow-lg shadow-olive/10 group"
            >
              <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
