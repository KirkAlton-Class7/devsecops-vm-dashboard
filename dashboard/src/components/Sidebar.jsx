import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Menu, X, Activity, Server, LayoutDashboard, Cpu, Gauge, Heart, Logs, Link2 } from "lucide-react";

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "load", label: "Load", icon: Gauge },
  { id: "ambience", label: "Ambience", icon: Heart },
  { id: "vm-information", label: "VM Information", icon: Server },
  { id: "system-resources", label: "System Resources", icon: Cpu },
  { id: "monitoring-endpoints", label: "Monitoring Endpoints", icon: Link2 },  // NEW
  { id: "services", label: "Services", icon: Activity },
  { id: "logs", label: "Logs", icon: Logs },
];

export default function Sidebar({ dashboardUser = "Kirk Alton", dashboardName = "DevSecOps Dashboard" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const scrollLockRef = useRef(false);

  // ---------- SCROLL OFFSET CONFIGURATION ----------
  const ENABLE_CUSTOM_OFFSET = true;
  const CUSTOM_OFFSET_PX = 70;   // adjust to match your header height
  // -------------------------------------------------

  useEffect(() => {
    const handleScroll = () => {
      // Ignore scroll events triggered by manual scrolling (button clicks)
      if (scrollLockRef.current) return;

      const sections = navItems.map(item => item.id);
      const scrollPosition = window.scrollY + 100;
      
      for (const section of sections.reverse()) {
        const element = document.getElementById(section);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(section);
          break;
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (!element) return;

    // Immediately update the active section (so the highlight changes instantly)
    setActiveSection(id);
    setIsOpen(false);

    // Calculate target scroll position
    let targetTop;
    if (ENABLE_CUSTOM_OFFSET) {
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      targetTop = elementPosition - CUSTOM_OFFSET_PX;
    } else {
      targetTop = element.offsetTop;
    }

    // Lock scroll event handler to prevent interference
    scrollLockRef.current = true;

    // Perform smooth scroll
    window.scrollTo({ top: targetTop, behavior: "smooth" });

    // Unlock after the scroll animation finishes (using scrollend event)
    const onScrollEnd = () => {
      scrollLockRef.current = false;
      // Ensure the clicked section remains active (in case scroll handler tried to change it)
      setActiveSection(id);
      window.removeEventListener("scrollend", onScrollEnd);
    };
    window.addEventListener("scrollend", onScrollEnd, { once: true });

    // Fallback timeout in case scrollend is not supported (older browsers)
    setTimeout(() => {
      if (scrollLockRef.current) {
        scrollLockRef.current = false;
        setActiveSection(id);
      }
    }, 1000);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 xl:hidden bg-slate-800/80 backdrop-blur-xl p-2.5 rounded-xl border border-white/10 shadow-lg"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <AnimatePresence>
        {(isOpen || window.innerWidth >= 1280) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-xl border-r border-white/10 shadow-2xl z-30 xl:block overflow-y-auto"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-6 border-b border-white/10">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="relative"
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-r from-cyan-500/20 to-purple-600/20 rounded-full blur-2xl"></div>
                  <div className="relative">
                    <p className="text-base font-semibold uppercase tracking-[0.2em] bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                      {dashboardUser}
                    </p>
                    <h1 className="mt-1 text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                      {dashboardName}
                    </h1>
                  </div>
                </motion.div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-4 py-6">
                <ul className="space-y-2">
                  {navItems.map((item, idx) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    
                    return (
                      <motion.li
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <button
                          onClick={() => scrollToSection(item.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                            isActive
                              ? "bg-gradient-to-r from-cyan-500/20 to-purple-600/20 border border-cyan-500/30"
                              : "hover:bg-white/5"
                          }`}
                        >
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                          </motion.div>
                          <span className={`text-sm font-medium ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                            {item.label}
                          </span>
                          {isActive && (
                            <motion.div
                              layoutId="active"
                              className="ml-auto w-1 h-6 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full"
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                          )}
                        </button>
                      </motion.li>
                    );
                  })}
                </ul>
              </nav>

              {/* Footer */}
              <div className="p-6 border-t border-white/10">
                <div className="space-y-3">
                  <motion.a
                    href="#"
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                    whileHover={{ x: 5 }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    <span>GitHub Repository</span>
                  </motion.a>
                  <motion.a
                    href="#"
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                    whileHover={{ x: 5 }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 0021.967-12.11c0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                    </svg>
                    <span>Twitter</span>
                  </motion.a>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-slate-500">Real-time monitoring • v2.0</p>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}