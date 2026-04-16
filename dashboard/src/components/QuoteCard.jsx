import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Quote, RefreshCw, Bookmark, Copy, Check, BookmarkCheck, Heart, Star, X } from "lucide-react";
import Card from "./Card";

// Helper to format a comma-separated name list with "and"
function formatNameList(nameStr) {
  if (!nameStr || nameStr.trim() === '') return '';
  const names = nameStr.split(',').map(s => s.trim()).filter(s => s);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  const last = names.pop();
  return `${names.join(', ')} and ${last}`;
}

// Helper to get primary and secondary attribution from a quote
function getAttribution(quote) {
  let primary = '';
  let secondary = []; // array of strings (each line)

  const speaker = quote.speaker ? quote.speaker.trim() : '';
  const author = quote.author ? quote.author.trim() : '';
  const source = quote.source ? quote.source.trim() : '';

  // Primary: speaker > author > source
  if (speaker) {
    primary = formatNameList(speaker);
    if (author && author !== speaker) {
      if (source) {
        // Three lines: speaker, then from source, then by author
        secondary = [`from ${source}`, `by ${formatNameList(author)}`];
      } else {
        // Only speaker + author
        secondary = [`from ${formatNameList(author)}`];
      }
    } else if (source) {
      // Only speaker + source (no separate author)
      secondary = [`from ${source}`];
    }
  } else if (author) {
    primary = formatNameList(author);
    if (source) {
      secondary = [`from ${source}`];
    }
  } else if (source) {
    primary = source;
  } else {
    primary = 'Unknown';
  }

  return { primary, secondary };
}

export default function QuoteCard({ quote: initialQuote }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(initialQuote);
  const [quotesList, setQuotesList] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState([]);

  // Load quotes from server
  useEffect(() => {
    async function loadQuotes() {
      try {
        const response = await fetch('/data/quotes.json', { cache: "no-store" });
        if (response.ok) {
          const quotes = await response.json();
          setQuotesList(quotes);
          const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
          setCurrentQuote(randomQuote);
        }
      } catch (error) {
        console.error('Failed to load quotes:', error);
      }
    }
    loadQuotes();
  }, []);

  // Load saved quotes from localStorage
  const loadFavorites = () => {
    const savedQuotes = localStorage.getItem('savedQuotes');
    const quotes = savedQuotes ? JSON.parse(savedQuotes) : [];
    setFavorites(quotes);
    // Check if current quote is saved
    setSaved(quotes.some(q => q.text === currentQuote.text));
  };

  useEffect(() => {
    loadFavorites();
  }, [currentQuote]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (quotesList.length > 0) {
        const randomQuote = quotesList[Math.floor(Math.random() * quotesList.length)];
        setCurrentQuote(randomQuote);
      } else {
        const response = await fetch('/data/quotes.json');
        if (response.ok) {
          const quotes = await response.json();
          const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
          setCurrentQuote(randomQuote);
        }
      }
    } catch (error) {
      console.error('Failed to fetch new quote:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleCopy = () => {
    const { primary, secondary } = getAttribution(currentQuote);
    let textToCopy = `Quote of the day\n\n"${currentQuote.text}"\n\n– ${primary}`;
    if (secondary.length > 0) {
      textToCopy += `\n${secondary.join('\n')}`;
    }
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    const savedQuotes = localStorage.getItem('savedQuotes');
    let quotes = savedQuotes ? JSON.parse(savedQuotes) : [];
    
    if (saved) {
      quotes = quotes.filter(q => q.text !== currentQuote.text);
      setSaved(false);
    } else {
      quotes.push(currentQuote);
      setSaved(true);
    }
    
    localStorage.setItem('savedQuotes', JSON.stringify(quotes));
    loadFavorites(); // refresh favorites list
  };

  const handleSelectFavorite = (favQuote) => {
    setCurrentQuote(favQuote);
    setShowFavorites(false);
  };

  const handleRemoveFavorite = (favQuote, e) => {
    e.stopPropagation();
    const savedQuotes = localStorage.getItem('savedQuotes');
    let quotes = savedQuotes ? JSON.parse(savedQuotes) : [];
    quotes = quotes.filter(q => q.text !== favQuote.text);
    localStorage.setItem('savedQuotes', JSON.stringify(quotes));
    loadFavorites();
  };

  // Get attribution for current quote
  const { primary: currentPrimary, secondary: currentSecondary } = currentQuote ? getAttribution(currentQuote) : { primary: '', secondary: [] };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        whileHover={{ y: -5 }}
      >
        <Card title="Featured Quote" subtitle="Inspiration from the community">
          <div className="relative">
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
                    key={currentQuote?.text}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="text-base lg:text-lg leading-relaxed text-slate-200 flex-1"
                  >
                    "{currentQuote?.text}"
                  </motion.p>
                </AnimatePresence>
              </div>
              
              <footer className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <div>
                  <motion.p 
                    className="text-sm font-medium bg-gradient-to-r from-slate-200 to-slate-300 bg-clip-text text-transparent"
                    whileHover={{ x: 5 }}
                  >
                    — {currentPrimary}
                  </motion.p>
                  {currentSecondary.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {currentSecondary.map((line, idx) => (
                        <p key={idx} className="text-xs text-slate-500">{line}</p>
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

                  <motion.button
                    onClick={() => setShowFavorites(true)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    title="View favorites"
                  >
                    <Star className="w-4 h-4 text-slate-400 hover:text-yellow-400" />
                  </motion.button>

                </div>
              </footer>
            </blockquote>
          </div>
        </Card>
      </motion.div>

      {/* Favorites Modal */}
      <AnimatePresence>
        {showFavorites && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowFavorites(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-slate-100">⭐ Favorite Quotes</h2>
                <button
                  onClick={() => setShowFavorites(false)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {favorites.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">No favorites yet. Click the bookmark button to save quotes!</p>
                ) : (
                  favorites.map((fav, idx) => {
                    const { primary, secondary } = getAttribution(fav);
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectFavorite(fav)}
                        className="group p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer border border-white/10"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <p className="text-sm text-slate-200">"{fav.text.substring(0, 100)}..."</p>
                            <p className="text-xs text-slate-400 mt-1">— {primary}</p>
                            {secondary.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {secondary.map((line, i) => (
                                  <p key={i} className="text-xs text-slate-500">{line}</p>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => handleRemoveFavorite(fav, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 transition-all"
                            title="Remove from favorites"
                          >
                            <X className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}