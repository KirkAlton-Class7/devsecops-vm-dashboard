import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Quote, RefreshCw, Bookmark, Copy, Check, BookmarkCheck } from "lucide-react";
import Card from "./Card";

export default function QuoteCard({ quote }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(quote);

  // Load saved quotes from localStorage
  useEffect(() => {
    const savedQuotes = localStorage.getItem('savedQuotes');
    if (savedQuotes) {
      const quotes = JSON.parse(savedQuotes);
      setSaved(quotes.some(q => q.text === currentQuote.text));
    }
  }, [currentQuote]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Fetch a new random quote from the API
      const response = await fetch('/data/quotes.json');
      if (response.ok) {
        const quotes = await response.json();
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        setCurrentQuote(randomQuote);
      }
    } catch (error) {
      console.error('Failed to fetch new quote:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`"${currentQuote.text}" — ${currentQuote.author}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    const savedQuotes = localStorage.getItem('savedQuotes');
    let quotes = savedQuotes ? JSON.parse(savedQuotes) : [];
    
    if (saved) {
      // Remove from saved
      quotes = quotes.filter(q => q.text !== currentQuote.text);
      setSaved(false);
    } else {
      // Add to saved
      quotes.push(currentQuote);
      setSaved(true);
    }
    
    localStorage.setItem('savedQuotes', JSON.stringify(quotes));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      whileHover={{ y: -5 }}
    >
      <Card title="Featured Quote" subtitle="Inspiration from the community">
        <div className="relative">
          {/* Animated background gradient */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full blur-2xl"></div>
          
          <blockquote className="space-y-4 relative z-10">
            <div className="flex items-start gap-3">
              <motion.div
                animate={{ rotate: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
                className="flex-shrink-0"
              >
                <Quote className="w-8 h-8 text-purple-400 opacity-50" />
              </motion.div>
              
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentQuote.text}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-base lg:text-lg leading-relaxed text-slate-200 flex-1"
                >
                  "{currentQuote.text}"
                </motion.p>
              </AnimatePresence>
            </div>
            
            <footer className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <div>
                <motion.p 
                  className="text-sm font-medium bg-gradient-to-r from-slate-200 to-slate-300 bg-clip-text text-transparent"
                  whileHover={{ x: 5 }}
                >
                  — {currentQuote.author}
                </motion.p>
                {currentQuote.source && (
                  <p className="text-xs text-slate-500 mt-1">from {currentQuote.source}</p>
                )}
                {currentQuote.tags && currentQuote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {currentQuote.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <motion.button
                  onClick={handleCopy}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors relative group"
                  title="Copy quote"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
                  )}
                </motion.button>
                
                <motion.button
                  onClick={handleRefresh}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title="Refresh quote"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`w-4 h-4 text-slate-400 ${isRefreshing ? 'animate-spin' : 'hover:text-slate-200'}`} />
                </motion.button>
                
                <motion.button
                  onClick={handleSave}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title={saved ? "Remove from saved" : "Save quote"}
                >
                  {saved ? (
                    <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Bookmark className="w-4 h-4 text-slate-400 hover:text-slate-200" />
                  )}
                </motion.button>
              </div>
            </footer>
          </blockquote>
        </div>
      </Card>
    </motion.div>
  );
}