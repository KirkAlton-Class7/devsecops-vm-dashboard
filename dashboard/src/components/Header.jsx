import { motion } from "framer-motion";
import {
  Clock,
  Activity,
  ChevronDown,
  Terminal,
  Cpu,
  CircleDollarSign,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";

export default function Header({
  appName,
  tagline,
  uptime,
  currentMode = "standard",
  onModeChange,
  flashMode = false,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showModeMenu, setShowModeMenu] = useState(false);
  const modeButtonRef = useRef(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const flashTimeoutRef = useRef(null);
  const isFlashingRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (flashMode && !isFlashingRef.current) {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }

      isFlashingRef.current = true;
      setIsFlashing(true);

      flashTimeoutRef.current = setTimeout(() => {
        setIsFlashing(false);
        isFlashingRef.current = false;
        flashTimeoutRef.current = null;
      }, 300);
    }
  }, [flashMode]);

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const modeOptions = [
    { value: "standard", label: "DEVSECOPS (D)", icon: Cpu },
    { value: "text", label: "TEXTMODE (T)", icon: Terminal },
    { value: "finops", label: "FINOPS (F)", icon: CircleDollarSign },
  ];

  const currentModeOption = useMemo(
    () => modeOptions.find((opt) => opt.value === currentMode) || modeOptions[0],
    [currentMode]
  );

  const handleModeSelect = (mode) => {
    setShowModeMenu(false);

    if (onModeChange) {
      onModeChange(mode);
    }
  };

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100 }}
      className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl shadow-lg overflow-x-hidden"
    >
      <div className="relative">
        <motion.div
          className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"
          animate={{ x: ["-100%", "100%"] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatDelay: 26,
            ease: "linear",
          }}
        />

        <div className="flex items-center justify-between px-4 py-3 lg:px-6 lg:py-4">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative flex-1 min-w-0"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">
                {appName}
              </p>
            </div>

            <p className="text-xs text-slate-400 mt-1">{tagline}</p>
          </motion.div>

          <div className="flex items-center gap-2 lg:gap-4">
            <motion.div
              className="hidden md:flex items-center gap-2 px-2 py-1 lg:px-3 lg:py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10"
              whileHover={{ scale: 1.05 }}
            >
              <span className="text-xs text-slate-400">{formattedDate}</span>
            </motion.div>

            <motion.div
              className="hidden sm:flex items-center gap-2 px-2 py-1 lg:px-3 lg:py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10"
              whileHover={{ scale: 1.05 }}
            >
              <Clock className="w-3 h-3 lg:w-4 lg:h-4 text-cyan-400" />
              <span className="text-xs lg:text-sm text-slate-300 font-mono">
                {formattedTime}
              </span>
            </motion.div>

            {uptime && (
              <motion.div
                className="flex items-center gap-2 px-2 py-1 lg:px-3 lg:py-1.5 rounded-full bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30"
                whileHover={{ scale: 1.05 }}
              >
                <Activity className="w-3 h-3 lg:w-4 lg:h-4 text-emerald-400 animate-pulse" />

                <span className="text-xs lg:text-sm text-slate-300 hidden sm:inline">
                  Uptime:{" "}
                  <span className="font-medium text-emerald-400">
                    {uptime}
                  </span>
                </span>

                <span className="text-xs lg:text-sm text-slate-300 sm:hidden">
                  {uptime}
                </span>
              </motion.div>
            )}

            <div className="relative">
              <motion.button
                ref={modeButtonRef}
                onClick={() => setShowModeMenu(!showModeMenu)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/5 text-slate-300 hover:border-white/40 transition-all text-xs font-mono ${
                  isFlashing
                    ? "shadow-[0_0_12px_theme(colors.cyan.400)] border-cyan-400/60"
                    : ""
                }`}
                style={{
                  transition: "box-shadow 0.1s ease, border-color 0.1s ease",
                }}
              >
                <currentModeOption.icon className="w-3 h-3" />
                <span className="hidden sm:inline">
                  Mode: {currentModeOption.label}
                </span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ${
                    showModeMenu ? "rotate-180" : ""
                  }`}
                />
              </motion.button>

              {showModeMenu &&
                createPortal(
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="fixed w-48 rounded-xl bg-slate-800/95 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden z-[9999]"
                    style={{
                      top: modeButtonRef.current
                        ? modeButtonRef.current.getBoundingClientRect().bottom + 8
                        : 0,
                      right: modeButtonRef.current
                        ? window.innerWidth -
                          modeButtonRef.current.getBoundingClientRect().right
                        : 0,
                    }}
                  >
                    <div className="py-2">
                      {modeOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleModeSelect(opt.value)}
                          className={`w-full px-4 py-2 text-sm text-left flex items-center gap-2 transition-colors ${
                            currentMode === opt.value
                              ? "bg-cyan-500/20 text-cyan-400"
                              : "text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          <opt.icon className="w-4 h-4" />
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>,
                  document.body
                )}
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
