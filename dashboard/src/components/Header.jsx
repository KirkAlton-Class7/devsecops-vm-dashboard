import { motion } from "framer-motion";
import { Clock, Activity, Bell, User, ChevronDown, Terminal } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function Header({ appName, tagline, uptime, isPowerOffMode, onPowerToggle }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update dropdown position when menu opens or on window resize/scroll
  useEffect(() => {
    if (showUserMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8, // 8px gap below button
        right: window.innerWidth - rect.right,
      });
    }
  }, [showUserMenu]);

  // Recalculate position on scroll/resize while menu is open
  useEffect(() => {
    if (!showUserMenu) return;
    const handleUpdate = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
    };
    window.addEventListener("scroll", handleUpdate);
    window.addEventListener("resize", handleUpdate);
    return () => {
      window.removeEventListener("scroll", handleUpdate);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [showUserMenu]);

  const formattedTime = currentTime.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100 }}
      className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl shadow-lg overflow-x-hidden"
    >
      <div className="relative">
        {/* Top bar */}
        <motion.div 
          className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 26, ease: "linear" }}
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
            {/* Date Display */}
            <motion.div 
              className="hidden md:flex items-center gap-2 px-2 py-1 lg:px-3 lg:py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10"
              whileHover={{ scale: 1.05 }}
            >
              <span className="text-xs text-slate-400">{formattedDate}</span>
            </motion.div>
            
            {/* Time Display */}
            <motion.div 
              className="hidden sm:flex items-center gap-2 px-2 py-1 lg:px-3 lg:py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10"
              whileHover={{ scale: 1.05 }}
            >
              <Clock className="w-3 h-3 lg:w-4 lg:h-4 text-cyan-400" />
              <span className="text-xs lg:text-sm text-slate-300 font-mono">{formattedTime}</span>
            </motion.div>
            
            {/* Uptime */}
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

            {/* Power Toggle Button */}
            <motion.button
              onClick={onPowerToggle}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-mono ${
                isPowerOffMode
                  ? 'bg-white/10 border-white/30 text-white'
                  : 'bg-transparent border-white/20 text-slate-300 hover:border-white/40'
              }`}
            >
              <Terminal className="w-3 h-3" />
              <span className="hidden sm:inline">{isPowerOffMode ? 'UI MODE' : 'TEXT MODE'}</span>
            </motion.button>
            
            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-1.5 lg:p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Bell className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
              <motion.span 
                className="absolute top-0 right-0 w-1.5 h-1.5 lg:w-2 lg:h-2 bg-red-500 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </motion.button>
            
            {/* User Avatar */}
            <div className="relative">
              <motion.button
                ref={buttonRef}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1 p-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 shadow-lg hover:shadow-cyan-500/25 transition-shadow"
              >
                <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center">
                  <User className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                </div>
                <ChevronDown className={`w-3 h-3 text-white transition-transform duration-200 mr-1 lg:mr-2 ${showUserMenu ? 'rotate-180' : ''}`} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Dropdown Menu rendered via Portal */}
      {showUserMenu && createPortal(
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="fixed w-48 rounded-xl bg-slate-800/95 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden z-[9999]"
          style={{
            top: dropdownPosition.top,
            right: dropdownPosition.right,
          }}
        >
          <div className="py-2">
            <div className="px-4 py-2 border-b border-white/10">
              <p className="text-xs text-slate-400">Signed in as</p>
              <p className="text-sm text-slate-200 font-medium">admin@devsecops</p>
            </div>
            <button className="w-full px-4 py-2 text-sm text-slate-300 hover:bg-white/10 transition-colors text-left">
              Profile Settings
            </button>
            <button className="w-full px-4 py-2 text-sm text-slate-300 hover:bg-white/10 transition-colors text-left">
              Dashboard Preferences
            </button>
            <div className="border-t border-white/10 my-1"></div>
            <button className="w-full px-4 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors text-left">
              Sign Out
            </button>
          </div>
        </motion.div>,
        document.body
      )}
    </motion.header>
  );
}