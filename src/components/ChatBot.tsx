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
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center ${msg.role === 'user' ? 'bg-cream/10' : 'bg-olive/20'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-cream/70" /> : <Bot className="w-4 h-4 text-olive" />}
              </div>
              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                  msg.role === 'user' 
                  ? 'bg-cream/10 text-cream rounded-tr-sm border border-cream/5' 
                  : 'bg-olive/10 text-cream/90 rounded-tl-sm border border-olive/20'
                }`}>
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <div className="markdown-body prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full flex shrink-0 items-center justify-center bg-olive/20">
                <Bot className="w-4 h-4 text-olive" />
              </div>
              <div className="p-4 rounded-2xl bg-olive/5 border border-olive/10 rounded-tl-sm text-olive/70 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs uppercase tracking-widest font-black">Analyzing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white/5 border-t border-white/5">
          <div className="flex gap-2 p-2 bg-navy rounded-2xl border border-white/10 relative overflow-hidden focus-within:border-olive/50 transition-colors">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage();
              }}
              placeholder="Ask anything about this word..."
              className="flex-1 bg-transparent px-4 py-2 text-cream placeholder-cream/30 outline-none text-sm font-light"
            />
            <button 
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-xl bg-olive text-navy flex items-center justify-center disabled:opacity-50 disabled:bg-white/10 disabled:text-cream/30 hover:scale-105 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
