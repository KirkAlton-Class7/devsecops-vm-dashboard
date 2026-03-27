import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { RefreshCw, Heart, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import Card from "./Card";

const sceneryImages = [
  {
    filename: "chiang_mai_mountain_sunrise.jpeg",
    title: "Chiang Mai Mountain Sunrise",
    location: "Chiang Mai, Thailand",
    tags: ["mountains", "sunrise", "landscape"]
  },
  {
    filename: "chiang_mai_temple_sunset.jpg",
    title: "Chiang Mai Temple Sunset",
    location: "Chiang Mai, Thailand",
    tags: ["temple", "sunset", "culture"]
  },
  {
    filename: "chiang_mai_misty_valley.jpeg",
    title: "Misty Valley",
    location: "Chiang Mai, Thailand",
    tags: ["valley", "fog", "nature"]
  },
  {
    filename: "madagascar_baobab_trees.jpeg",
    title: "Baobab Trees",
    location: "Madagascar",
    tags: ["baobab", "trees", "dry_landscape"]
  },
  {
    filename: "madagascar_lemur_forest.jpeg",
    title: "Lemur in the Forest",
    location: "Madagascar",
    tags: ["lemur", "wildlife", "forest"]
  },
  {
    filename: "madagascar_chameleon_macro.jpeg",
    title: "Chameleon Close-up",
    location: "Madagascar",
    tags: ["chameleon", "macro", "wildlife"]
  },
  {
    filename: "madagascar_waterfall_canyon.jpeg",
    title: "Waterfall Canyon",
    location: "Madagascar",
    tags: ["waterfall", "canyon", "nature"]
  },
  {
    filename: "madagascar_zebra_grasslands.jpeg",
    title: "Zebra in the Grasslands",
    location: "Madagascar",
    tags: ["zebra", "savanna", "wildlife"]
  },
  {
    filename: "madagascar_tropical_beach.jpeg",
    title: "Tropical Beach",
    location: "Madagascar",
    tags: ["beach", "tropical", "ocean"]
  },
  {
    filename: "madagascar_highlands_sunset.jpeg",
    title: "Highlands Sunset",
    location: "Madagascar",
    tags: ["highlands", "sunset", "landscape"]
  },
  {
    filename: "madagascar_rainforest_canopy.jpg",
    title: "Rainforest Canopy",
    location: "Madagascar",
    tags: ["rainforest", "canopy", "jungle"]
  },
  {
    filename: "madagascar_baobab_avenue.jpeg",
    title: "Avenue of the Baobabs",
    location: "Madagascar",
    tags: ["baobab", "avenue", "iconic"]
  },
  {
    filename: "madagascar_jungle_stream.jpeg",
    title: "Jungle Stream",
    location: "Madagascar",
    tags: ["jungle", "stream", "nature"]
  },
  {
    filename: "madagascar_lagoon_aerial.jpeg",
    title: "Lagoon Aerial View",
    location: "Madagascar",
    tags: ["lagoon", "aerial", "coast"]
  },
  {
    filename: "madagascar_forest_waterfall.jpeg",
    title: "Forest Waterfall",
    location: "Madagascar",
    tags: ["forest", "waterfall", "lush"]
  }
];

export default function SceneryGallery() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [imageError, setImageError] = useState(false);

  const currentImage = sceneryImages[currentIndex];
  const imageUrl = `/data/images/${currentImage.filename}`;

  const handleRefresh = () => {
    setIsRefreshing(true);
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * sceneryImages.length);
    } while (newIndex === currentIndex && sceneryImages.length > 1);
    setCurrentIndex(newIndex);
    setLiked(false);
    setImageError(false);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % sceneryImages.length);
    setLiked(false);
    setImageError(false);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + sceneryImages.length) % sceneryImages.length);
    setLiked(false);
    setImageError(false);
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
              className="relative rounded-xl overflow-hidden aspect-video bg-gradient-to-br from-slate-800 to-slate-900"
            >
              {!imageError ? (
                <img
                  src={imageUrl}
                  alt={currentImage.title}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageOff className="w-12 h-12 text-slate-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Image Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h3 className="text-lg font-semibold">{currentImage.title}</h3>
                <p className="text-sm text-white/80">{currentImage.location}</p>
                {currentImage.tags && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {currentImage.tags.map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-black/50 text-white/80">
                        {tag.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          {sceneryImages.length > 1 && (
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