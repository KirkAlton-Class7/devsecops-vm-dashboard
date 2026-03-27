import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { RefreshCw, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import Card from "./Card";

// Beautiful scenery images (using Unsplash or Pexels)
const sceneryImages = [
  {
    url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
    title: "Swiss Alps",
    location: "Switzerland",
    photographer: "Mountain Explorer"
  },
  {
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
    title: "Maldives Beach",
    location: "Maldives",
    photographer: "Tropical Dreams"
  },
  {
    url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05",
    title: "Forest Mist",
    location: "Pacific Northwest",
    photographer: "Nature Lens"
  },
  {
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b",
    title: "Northern Lights",
    location: "Iceland",
    photographer: "Aurora Hunter"
  },
  {
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba",
    title: "Milky Way",
    location: "Death Valley",
    photographer: "Star Gazer"
  },
  {
    url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e",
    title: "Sunset Forest",
    location: "Oregon",
    photographer: "Golden Hour"
  }
];

export default function SceneryGallery() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentImage = sceneryImages[currentIndex];

  const handleRefresh = () => {
    setIsRefreshing(true);
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * sceneryImages.length);
    } while (newIndex === currentIndex && sceneryImages.length > 1);
    setCurrentIndex(newIndex);
    setLiked(false);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % sceneryImages.length);
    setLiked(false);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + sceneryImages.length) % sceneryImages.length);
    setLiked(false);
  };

  const handleLike = () => {
    setLiked(!liked);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card title="Scenic Escape" subtitle="Take a moment to enjoy these beautiful places">
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="relative rounded-xl overflow-hidden aspect-video"
            >
              <img
                src={`${currentImage.url}?w=800&h=450&fit=crop`}
                alt={currentImage.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Image Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h3 className="text-lg font-semibold">{currentImage.title}</h3>
                <p className="text-sm text-white/80">{currentImage.location}</p>
                <p className="text-xs text-white/60 mt-1">📸 {currentImage.photographer}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-2">
            <motion.button
              onClick={handleLike}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-lg transition-colors ${
                liked ? 'text-red-500 bg-red-500/10' : 'text-slate-400 hover:text-red-500 hover:bg-red-500/10'
              }`}
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
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
          </div>
          
          <p className="text-xs text-slate-500">
            {currentIndex + 1} / {sceneryImages.length}
          </p>
        </div>
      </Card>
    </motion.div>
  );
}