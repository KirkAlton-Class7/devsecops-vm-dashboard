import { motion } from "framer-motion";
import {
  Clock,
  Activity,
  ChevronDown,
  Terminal,
  Cpu,
  CircleDollarSign,
  DollarSign,
  Braces,
  Camera,
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
  showBudgetControls = true,
  mockDataDiagnostics = [],
  onCopyJsonSnapshot,
  onCopySnapshot,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showModeMenu, setShowModeMenu] = useState(false);
  const modeButtonRef = useRef(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const diagnosticsButtonRef = useRef(null);
  const [snapshotFlash, setSnapshotFlash] = useState(false);
  const [jsonSnapshotFlash, setJsonSnapshotFlash] = useState(false);
  const snapshotFlashTimeoutRef = useRef(null);
  const jsonSnapshotFlashTimeoutRef = useRef(null);

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
  const hasMockData = mockDataDiagnostics.length > 0;

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

  const startSnapshotFlash = () => {
    if (snapshotFlashTimeoutRef.current) clearTimeout(snapshotFlashTimeoutRef.current);
    setSnapshotFlash(true);
    snapshotFlashTimeoutRef.current = setTimeout(() => {
      setSnapshotFlash(false);
      snapshotFlashTimeoutRef.current = null;
    }, 2000);
  };

  const handleSnapshotClick = async () => {
    const copied = await onCopySnapshot?.();
    if (copied !== false) startSnapshotFlash();
  };

  const startJsonSnapshotFlash = () => {
    if (jsonSnapshotFlashTimeoutRef.current) clearTimeout(jsonSnapshotFlashTimeoutRef.current);
    setJsonSnapshotFlash(true);
    jsonSnapshotFlashTimeoutRef.current = setTimeout(() => {
      setJsonSnapshotFlash(false);
      jsonSnapshotFlashTimeoutRef.current = null;
    }, 2000);
  };

  const handleJsonSnapshotClick = async () => {
    const copied = await onCopyJsonSnapshot?.();
    if (copied !== false) startJsonSnapshotFlash();
  };

  useEffect(() => {
    return () => {
      if (snapshotFlashTimeoutRef.current) clearTimeout(snapshotFlashTimeoutRef.current);
      if (jsonSnapshotFlashTimeoutRef.current) clearTimeout(jsonSnapshotFlashTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!hasMockData) setShowDiagnostics(false);
  }, [hasMockData]);

  useEffect(() => {
    if (!showDiagnostics) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setShowDiagnostics(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showDiagnostics]);

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100 }}
      className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 shadow-md overflow-x-hidden"
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

            {/* Mock/fallback data diagnostic */}
            {hasMockData && (
              <div className="relative">
                <motion.button
                  ref={diagnosticsButtonRef}
                  onClick={() => setShowDiagnostics((current) => !current)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  animate={{
                    boxShadow: [
                      "0 0 0px rgba(251,191,36,0.20)",
                      "0 0 16px rgba(251,191,36,0.55)",
                      "0 0 0px rgba(251,191,36,0.20)",
                    ],
                    borderColor: [
                      "rgba(251,191,36,0.35)",
                      "rgba(251,191,36,0.85)",
                      "rgba(251,191,36,0.35)",
                    ],
                  }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  className="flex items-center gap-2 rounded-full border bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-100 backdrop-blur-sm lg:px-3 lg:py-1.5"
                  aria-expanded={showDiagnostics}
                  aria-label="Mock data diagnostics"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[11px] font-black text-slate-950">
                    !
                  </span>
                  <span className="hidden lg:inline">Mock Data Active</span>
                </motion.button>

                {showDiagnostics &&
                  createPortal(
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      className="fixed z-[9999] w-[min(92vw,34rem)] rounded-xl border border-amber-400/35 bg-slate-950/95 p-4 text-slate-100 shadow-2xl shadow-amber-950/30 backdrop-blur-xl"
                      style={{
                        top: diagnosticsButtonRef.current
                          ? diagnosticsButtonRef.current.getBoundingClientRect().bottom + 10
                          : 0,
                        right: diagnosticsButtonRef.current
                          ? Math.max(
                              16,
                              window.innerWidth -
                                diagnosticsButtonRef.current.getBoundingClientRect().right
                            )
                          : 16,
                      }}
                      role="dialog"
                      aria-modal="false"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-amber-200">
                            The current dashboard is using mock or fallback data.
                          </div>
                        </div>
                        <button
                          onClick={() => setShowDiagnostics(false)}
                          className="rounded border border-white/10 px-2 py-1 text-xs text-slate-400 hover:border-amber-300/50 hover:text-amber-200"
                        >
                          Close
                        </button>
                      </div>

                      <div className="space-y-2">
                        {mockDataDiagnostics.map((item, index) => (
                          <div
                            key={`${item.section}-${index}`}
                            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
                          >
                            <div className="text-sm font-medium text-slate-100">
                              {item.section}
                            </div>
                            {item.route && (
                              <div className="mt-1 font-mono text-xs text-slate-400">
                                {item.route}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <p className="mt-4 text-xs leading-relaxed text-slate-300">
                        Incomplete deployment configuration, missing environment variables, disconnected APIs, or backend startup failures may be preventing live data retrieval. Verify deployment settings, confirm service integrations, and restart or redeploy after resolving issues.
                      </p>
                    </motion.div>,
                    document.body
                  )}
              </div>
            )}

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
            {currentMode === "finops" && showBudgetControls && (
              <div className="relative">
                <motion.button
                  ref={budgetsButtonRef}
                  onClick={toggleBudgetsMenu}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/5 text-slate-300 hover:border-white/40 transition-all text-xs font-mono"
                >
                  <CircleDollarSign className="w-3 h-3" />
                  <span className="hidden sm:inline">Budgets</span>
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
                      {/* Sleek USD label – same size as labels, cyan, minimal margin */}
                      <div className="text-xs text-slate-300 text-center mb-1">
                        User Budgets (USD)
                      </div>

                      {/* Daily budget row */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-300">Daily:</span>
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
                        <span className="text-xs text-slate-300">Monthly:</span>
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
                  flashMode
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

            {/* Copy snapshot */}
            <motion.button
              onClick={handleSnapshotClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex h-8 w-8 items-center justify-center rounded-full border bg-white/5 text-slate-300 transition-all hover:border-white/40 hover:text-cyan-300 ${
                snapshotFlash
                  ? "border-cyan-300 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.75)]"
                  : "border-white/20"
              }`}
              title="Copy snapshot"
              aria-label="Copy snapshot"
            >
              <Camera className="h-3.5 w-3.5" />
            </motion.button>

            {/* Copy JSON snapshot */}
            <motion.button
              onClick={handleJsonSnapshotClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex h-8 w-8 items-center justify-center rounded-full border bg-white/5 text-slate-300 transition-all hover:border-white/40 hover:text-cyan-300 ${
                jsonSnapshotFlash
                  ? "border-cyan-300 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.75)]"
                  : "border-white/20"
              }`}
              title="Copy JSON snapshot"
              aria-label="Copy JSON snapshot"
            >
              <Braces className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
