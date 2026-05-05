import { motion, AnimatePresence } from "framer-motion";
import { memo, useState, useEffect, useRef } from "react";
import { RefreshCw, Heart, ChevronLeft, ChevronRight, ImageOff, Plane, X, Home, Info, Copy, Check } from "lucide-react";
import { createPortal } from "react-dom";
import Card from "./Card";
import { sharedGalleryImages } from "../data/galleryAssets";
import { writeClipboardText } from "../utils/clipboard";

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

function ImageGallery({ onCopyFailure, onCopySuccess }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedImageIds, setLikedImageIds] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [shuffledImages, setShuffledImages] = useState([]);
  const [showBookModal, setShowBookModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [copiedScene, setCopiedScene] = useState(false);
  const hideLocationTimeout = useRef(null);
  const copiedSceneTimeout = useRef(null);

  // --- Define currentImage and imageUrl EARLY so they are available in handlers ---
  const currentImage = shuffledImages[currentIndex];
  const imageUrl = currentImage ? currentImage.src || `/data/images/${currentImage.filename}` : "";

  // --- Timer functions ---
  const clearHideTimeout = () => {
    if (hideLocationTimeout.current) {
      clearTimeout(hideLocationTimeout.current);
      hideLocationTimeout.current = null;
    }
  };

  const startHideTimer = () => {
    clearHideTimeout();
    hideLocationTimeout.current = setTimeout(() => {
      setShowLocation(false);
    }, 3000);
  };

  const showLocationWithTimer = () => {
    setShowLocation(true);
    startHideTimer();
  };

  // --- Effects that depend on currentIndex ---
  useEffect(() => {
    showLocationWithTimer();
  }, [currentIndex]);

  useEffect(() => {
    return () => {
      clearHideTimeout();
      if (copiedSceneTimeout.current) clearTimeout(copiedSceneTimeout.current);
    };
  }, []);

  // --- Handlers (now currentImage is already defined) ---
  const handleImageLoad = () => {
    showLocationWithTimer();
  };

  const handleImageClick = () => {
    showLocationWithTimer();
  };

  const handleRefresh = () => {
    if (!shuffledImages.length) return;
    setIsRefreshing(true);
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * shuffledImages.length);
    } while (newIndex === currentIndex && shuffledImages.length > 1);
    setCurrentIndex(newIndex);
    setImageError(false);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleNext = () => {
    if (!shuffledImages.length) return;
    setCurrentIndex((prev) => (prev + 1) % shuffledImages.length);
    setImageError(false);
  };

  const handlePrev = () => {
    if (!shuffledImages.length) return;
    setCurrentIndex((prev) => (prev - 1 + shuffledImages.length) % shuffledImages.length);
    setImageError(false);
  };

  const handleLike = () => {
    if (!currentImage) return;
    const newLiked = likedImageIds.includes(currentImage.id)
      ? likedImageIds.filter(id => id !== currentImage.id)
      : [...likedImageIds, currentImage.id];
    setLikedImageIds(newLiked);
    localStorage.setItem('likedImages', JSON.stringify(newLiked));
  };

  const handleCopyScene = async () => {
    if (!currentImage) return;

    const now = new Date();
    const pad = (item) => String(item).padStart(2, "0");
    const taken = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const textToCopy = `SCENES FROM AROUND THE WORLD

Taken: ${taken}

Title: ${currentImage.title || "Untitled"}
Location: ${currentImage.location || "Unknown"}
Image: ${imageUrl || "N/A"}`;

    try {
      await writeClipboardText(textToCopy);
      if (copiedSceneTimeout.current) clearTimeout(copiedSceneTimeout.current);
      setCopiedScene(true);
      onCopySuccess?.("Image details copied to clipboard.");
      copiedSceneTimeout.current = setTimeout(() => {
        setCopiedScene(false);
        copiedSceneTimeout.current = null;
      }, 2000);
    } catch (error) {
      console.error("Failed to copy scene:", error);
      onCopyFailure?.(textToCopy, "Image Details");
    }
  };

  const isLiked = currentImage ? likedImageIds.includes(currentImage.id) : false;

  const likedLocations = () => {
    const likedImages = shuffledImages.filter(img => likedImageIds.includes(img.id));
    const unique = {};
    likedImages.forEach(img => {
      if (!unique[img.location]) {
        unique[img.location] = img.location;
      }
    });
    return Object.values(unique);
  };

  // Extract country from a location string (e.g., "Chiang Mai, Thailand" → "Thailand")
  const getCountryFromLocation = (location) => {
    if (!location) return "";
    const parts = location.split(',').map(p => p.trim());
    return parts.length > 1 ? parts[parts.length - 1] : parts[0];
  };

  // Open Google Travel for the country (not the full location)
  const openGoogleTravel = (location) => {
    const country = getCountryFromLocation(location);
    const url = `https://www.google.com/travel/explore?q=${encodeURIComponent(country)}`;
    window.open(url, '_blank');
  };

  // "What is it really like to live in..." – uses the FULL location (city + country)
  const handleLivingSearch = () => {
    if (!currentImage) return;
    const fullLocation = currentImage.location;
    const query = `What is it really like to live in ${fullLocation}`;
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
  };

  // --- Data fetching ---
  useEffect(() => {
    const savedLikes = localStorage.getItem('likedImages');
    if (savedLikes) {
      setLikedImageIds(JSON.parse(savedLikes));
    }
  }, []);

  useEffect(() => {
    fetch('/data/gallery-manifest.json?t=' + Date.now())
      .then(response => {
        if (!response.ok) throw new Error('Failed to load gallery-manifest.json');
        return response.json();
      })
      .then(images => {
        const resolvedImages = Array.isArray(images) && images.length ? images : sharedGalleryImages;
        setShuffledImages(shuffleArray(resolvedImages));
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading images:', err);
        setShuffledImages(shuffleArray(sharedGalleryImages));
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Card title="Scenes from Around the World" subtitle="Where will you go next?">
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 blur-xl animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (!shuffledImages.length) {
    return (
      <Card title="Scenes from Around the World" subtitle="Where will you go next?">
        <div className="flex items-center justify-center h-64 text-slate-400">
          <p>No images found. Check shared gallery assets or /data/gallery-manifest.json.</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card title="Scenes from Around the World" subtitle="Where will you go next?">
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="relative rounded-xl overflow-hidden aspect-video bg-gradient-to-br from-slate-800 to-slate-900 cursor-pointer"
                onClick={handleImageClick}
              >
                {!imageError ? (
                  <img
                    src={imageUrl}
                    alt={currentImage.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                    onLoad={handleImageLoad}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff className="w-12 h-12 text-slate-600" />
                  </div>
                )}

                {/* Location pill – top center (fades in/out) */}
                <AnimatePresence>
                  {showLocation && currentImage?.location && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none"
                    >
                      <div className="inline-block px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-sm font-medium max-w-[90%] truncate pointer-events-auto">
                        {currentImage.location}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Persistent Info Icon – bottom right */}
                <div className="absolute bottom-4 right-4 z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowInfoModal(true); }}
                    className="p-1.5 rounded-full bg-black/60 backdrop-blur-md hover:bg-black/80 transition-colors"
                    aria-label="Image info"
                  >
                    <Info className="w-4 h-4 text-white" />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            {shuffledImages.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors text-white backdrop-blur-sm"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors text-white backdrop-blur-sm"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Button bar */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-2">
              <motion.button
                onClick={handleLike}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`p-2 rounded-lg transition-colors ${
                  isLiked ? 'text-red-500 bg-red-500/10' : 'text-slate-400 hover:text-red-500 hover:bg-red-500/10'
                }`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </motion.button>

              <motion.button
                onClick={handleRefresh}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </motion.button>

              <motion.button
                onClick={() => setShowBookModal(true)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/10 transition-colors"
              >
                <Plane className="w-5 h-5" />
              </motion.button>

              <motion.button
                onClick={handleLivingSearch}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-white/10 transition-colors"
              >
                <Home className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                onClick={handleCopyScene}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/10 transition-colors"
                title="Copy scene details"
                aria-label="Copy scene details"
              >
                {copiedScene ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </motion.button>
              <p className="text-xs text-slate-500">
                {currentIndex + 1} / {shuffledImages.length}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Info Modal */}
      {showInfoModal && createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowInfoModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <Info className="w-5 h-5 text-cyan-400" />
                Image Details
              </h2>
              <button
                onClick={() => setShowInfoModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Title</p>
                <p className="text-sm text-slate-200">{currentImage?.title || "Untitled"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Location</p>
                <p className="text-sm text-slate-200">{currentImage?.location || "Unknown"}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>,
        document.body
      )}

      {/* Book Modal */}
      <AnimatePresence>
        {showBookModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowBookModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                  <Plane className="w-5 h-5 text-cyan-400" />
                  Book your next flight
                </h2>
                <button
                  onClick={() => setShowBookModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {likedLocations().length === 0 ? (
                  <p className="text-center text-slate-400 py-8">
                    ❤️ Like some images first to see destinations!
                  </p>
                ) : (
                  likedLocations().map((location, idx) => (
                    <button
                      key={idx}
                      onClick={() => openGoogleTravel(location)}
                      className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10"
                    >
                      <p className="text-sm text-slate-200">{location}</p>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(ImageGallery);
