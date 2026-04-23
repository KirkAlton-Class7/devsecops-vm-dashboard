import { motion } from "framer-motion";
import {
  Clock,
  Activity,
  ChevronDown,
  Terminal,
  Cpu,
  CircleDollarSign,
  DollarSign,
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
  dailyBudget = 10,
  onDailyBudgetChange,
  monthlyBudget = 100,
  onMonthlyBudgetChange,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showModeMenu, setShowModeMenu] = useState(false);
  const modeButtonRef = useRef(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const flashTimeoutRef = useRef(null);
  const isFlashingRef = useRef(false);

  // Budget dropdown state
  const [showBudgetsMenu, setShowBudgetsMenu] = useState(false);
  const budgetsButtonRef = useRef(null);

  // Daily budget input state
  const [dailyBudgetInputValue, setDailyBudgetInputValue] = useState(String(dailyBudget));
  const [isDailyUpdateFlashing, setIsDailyUpdateFlashing] = useState(false);
  const dailyUpdateTimeoutRef = useRef(null);

  // Monthly budget input state
  const [monthlyBudgetInputValue, setMonthlyBudgetInputValue] = useState(String(monthlyBudget));
  const [isMonthlyUpdateFlashing, setIsMonthlyUpdateFlashing] = useState(false);
  const monthlyUpdateTimeoutRef = useRef(null);

  // Sync local inputs when props change
  useEffect(() => {
    setDailyBudgetInputValue(String(dailyBudget));
  }, [dailyBudget]);

  useEffect(() => {
    setMonthlyBudgetInputValue(String(monthlyBudget));
  }, [monthlyBudget]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (flashMode && !isFlashingRef.current) {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
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
    { value: "finops", label: "FINOPS (F)", icon: DollarSign },
  ];

  const currentModeOption = useMemo(
    () => modeOptions.find((opt) => opt.value === currentMode) || modeOptions[0],
    [currentMode]
  );

  const handleModeSelect = (mode) => {
    setShowModeMenu(false);
    if (onModeChange) onModeChange(mode);
  };

  const handleDailyBudgetUpdate = () => {
    const raw = dailyBudgetInputValue.trim();
    const numeric = raw === "" ? 0 : parseFloat(raw);
    const finalValue = isNaN(numeric) ? 0 : numeric;
    if (onDailyBudgetChange) onDailyBudgetChange(finalValue);

    if (dailyUpdateTimeoutRef.current) clearTimeout(dailyUpdateTimeoutRef.current);
    setIsDailyUpdateFlashing(true);
    dailyUpdateTimeoutRef.current = setTimeout(() => {
      setIsDailyUpdateFlashing(false);
    }, 200);
  };

  const handleDailyBudgetInputChange = (e) => {
    setDailyBudgetInputValue(e.target.value);
  };

  const handleMonthlyBudgetUpdate = () => {
    const raw = monthlyBudgetInputValue.trim();
    const numeric = raw === "" ? 0 : parseFloat(raw);
    const finalValue = isNaN(numeric) ? 0 : numeric;
    if (onMonthlyBudgetChange) onMonthlyBudgetChange(finalValue);

    if (monthlyUpdateTimeoutRef.current) clearTimeout(monthlyUpdateTimeoutRef.current);
    setIsMonthlyUpdateFlashing(true);
    monthlyUpdateTimeoutRef.current = setTimeout(() => {
      setIsMonthlyUpdateFlashing(false);
    }, 200);
  };

  const handleMonthlyBudgetInputChange = (e) => {
    setMonthlyBudgetInputValue(e.target.value);
  };

  const toggleBudgetsMenu = () => {
    setShowBudgetsMenu(!showBudgetsMenu);
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
            {/* Date (hidden on small screens) */}
            <motion.div
              className="hidden md:flex items-center gap-2 px-2 py-1 lg:px-3 lg:py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10"
              whileHover={{ scale: 1.05 }}
            >
              <span className="text-xs text-slate-400">{formattedDate}</span>
            </motion.div>

            {/* Time */}
            <motion.div
              className="hidden sm:flex items-center gap-2 px-2 py-1 lg:px-3 lg:py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10"
              whileHover={{ scale: 1.05 }}
            >
              <Clock className="w-3 h-3 lg:w-4 lg:h-4 text-cyan-400" />
              <span className="text-xs lg:text-sm text-slate-300 font-mono">
                {formattedTime}
              </span>
            </motion.div>

            {/* Uptime (optional) */}
            {uptime && (
              <motion.div
                className="flex items-center gap-2 px-2 py-1 lg:px-3 lg:py-1.5 rounded-full bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30"
                whileHover={{ scale: 1.05 }}
              >
                <Activity className="w-3 h-3 lg:w-4 lg:h-4 text-emerald-400 animate-pulse" />
                <span className="text-xs lg:text-sm text-slate-300 hidden sm:inline">
                  Uptime: <span className="font-medium text-emerald-400">{uptime}</span>
                </span>
                <span className="text-xs lg:text-sm text-slate-300 sm:hidden">
                  {uptime}
                </span>
              </motion.div>
            )}

            {/* Budgets button – only in FinOps mode */}
            {currentMode === "finops" && (
              <div className="relative">
                <motion.button
                  ref={budgetsButtonRef}
                  onClick={toggleBudgetsMenu}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/5 text-slate-300 hover:border-white/40 transition-all text-xs font-mono"
                >
                  <CircleDollarSign className="w-3 h-3" />
                  <span className="hidden sm:inline">Budgets (USD)</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${
                      showBudgetsMenu ? "rotate-180" : ""
                    }`}
                  />
                </motion.button>

                {showBudgetsMenu &&
                  createPortal(
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="fixed w-64 rounded-xl bg-slate-800/95 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden z-[9999] p-3 space-y-3"
                      style={{
                        top: budgetsButtonRef.current
                          ? budgetsButtonRef.current.getBoundingClientRect().bottom + 8
                          : 0,
                        right: budgetsButtonRef.current
                          ? window.innerWidth -
                            budgetsButtonRef.current.getBoundingClientRect().right
                          : 0,
                      }}
                    >
                      {/* Daily budget row */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400">Daily:</span>
                        <input
                          type="text"
                          value={dailyBudgetInputValue}
                          onChange={handleDailyBudgetInputChange}
                          className="w-20 px-2 py-1 text-sm bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-cyan-500"
                          placeholder="0"
                        />
                        <button
                          onClick={handleDailyBudgetUpdate}
                          className={`px-2 py-1 text-xs rounded transition-all ${
                            isDailyUpdateFlashing
                              ? "bg-cyan-500/30 text-white shadow-[0_0_8px_cyan] border-cyan-400"
                              : "border border-cyan-500/50 text-cyan-400 hover:text-cyan-300 hover:border-cyan-400"
                          }`}
                        >
                          Update
                        </button>
                      </div>
                      {/* Monthly budget row */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400">Monthly:</span>
                        <input
                          type="text"
                          value={monthlyBudgetInputValue}
                          onChange={handleMonthlyBudgetInputChange}
                          className="w-24 px-2 py-1 text-sm bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-cyan-500"
                          placeholder="0"
                        />
                        <button
                          onClick={handleMonthlyBudgetUpdate}
                          className={`px-2 py-1 text-xs rounded transition-all ${
                            isMonthlyUpdateFlashing
                              ? "bg-cyan-500/30 text-white shadow-[0_0_8px_cyan] border-cyan-400"
                              : "border border-cyan-500/50 text-cyan-400 hover:text-cyan-300 hover:border-cyan-400"
                          }`}
                        >
                          Update
                        </button>
                      </div>
                    </motion.div>,
                    document.body
                  )}
              </div>
            )}

            {/* Mode button */}
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