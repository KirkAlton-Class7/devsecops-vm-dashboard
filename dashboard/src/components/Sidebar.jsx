import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
  Menu,
  X,
  Activity,
  Server,
  LayoutDashboard,
  Cpu,
  Gauge,
  Heart,
  Logs,
  Link2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const defaultNavItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "load", label: "Load", icon: Gauge },
  { id: "ambience", label: "Ambience", icon: Heart },
  { id: "vm-information", label: "VM Information", icon: Server },
  { id: "system-resources", label: "System Resources", icon: Cpu },
  { id: "monitoring-endpoints", label: "Monitoring Endpoints", icon: Link2 },
  { id: "services", label: "Services", icon: Activity },
  { id: "logs", label: "Logs", icon: Logs },
];

export default function Sidebar({ 
  dashboardUser = "Kirk Alton", 
  dashboardName = "DevSecOps Dashboard",
  githubUrl = "https://github.com/KirkAlton-Class7",
  linkedinUrl = "https://www.linkedin.com/in/kirkcochranjr/",
  navItems = defaultNavItems,   // new prop
  isCollapsed = false,
  onToggleCollapsed,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(navItems[0]?.id || "overview");
  const scrollLockRef = useRef(false);
  const activeSectionRef = useRef(activeSection);
  const frameRef = useRef(null);
  const collapsedClass = isCollapsed ? "w-72 xl:w-20" : "w-72";

  const ENABLE_CUSTOM_OFFSET = true;
  const CUSTOM_OFFSET_PX = 70;

  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  useEffect(() => {
    const updateActiveSection = () => {
      frameRef.current = null;
      if (scrollLockRef.current) return;
      const sections = navItems.map(item => item.id);
      const scrollPosition = window.scrollY + 100;
      for (const section of sections.reverse()) {
        const element = document.getElementById(section);
        if (element && element.offsetTop <= scrollPosition) {
          if (activeSectionRef.current !== section) {
            activeSectionRef.current = section;
            setActiveSection(section);
          }
          break;
        }
      }
    };

    const handleScroll = () => {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(updateActiveSection);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    updateActiveSection();

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [navItems]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (!element) return;
    setActiveSection(id);
    setIsOpen(false);
    let targetTop;
    if (ENABLE_CUSTOM_OFFSET) {
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      targetTop = elementPosition - CUSTOM_OFFSET_PX;
    } else {
      targetTop = element.offsetTop;
    }
    scrollLockRef.current = true;
    window.scrollTo({ top: targetTop, behavior: "smooth" });
    const onScrollEnd = () => {
      scrollLockRef.current = false;
      setActiveSection(id);
      window.removeEventListener("scrollend", onScrollEnd);
    };
    window.addEventListener("scrollend", onScrollEnd, { once: true });
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
            className={`fixed top-0 left-0 h-full ${collapsedClass} bg-gradient-to-b from-slate-900/95 to-slate-950/95 border-r border-white/10 shadow-2xl z-30 xl:block overflow-y-auto overflow-x-hidden transition-[width] duration-300 supports-[backdrop-filter]:backdrop-blur-md`}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className={`${isCollapsed ? "xl:p-3.5 p-6" : "p-6"} border-b border-white/10`}>
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="relative"
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-r from-cyan-500/20 to-purple-600/20 rounded-full blur-2xl"></div>
                  <div className="relative hidden xl:flex justify-end">
                    <button
                      onClick={onToggleCollapsed}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-300 transition-all hover:border-cyan-400/45 hover:text-cyan-300 ${
                        isCollapsed ? "mx-auto" : ""
                      }`}
                      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                      title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                      {isCollapsed ? (
                        <PanelLeftOpen className="h-5 w-5" />
                      ) : (
                        <PanelLeftClose className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <div className={`relative ${isCollapsed ? "xl:hidden" : ""}`}>
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
              <nav className={`flex-1 ${isCollapsed ? "xl:px-3 px-4" : "px-4"} py-6`}>
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
                          title={isCollapsed ? item.label : undefined}
                          className={`w-full flex items-center gap-3 rounded-xl transition-all duration-300 group ${
                            isCollapsed ? "xl:justify-center xl:px-0 px-4 py-3" : "px-4 py-3"
                          } ${
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
                          <span className={`text-sm font-medium ${isCollapsed ? "xl:hidden" : ""} ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                            {item.label}
                          </span>
                          {isActive && !isCollapsed && (
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
              <div className={`${isCollapsed ? "xl:p-4 p-6" : "p-6"} border-t border-white/10`}>
                <div className={`space-y-3 ${isCollapsed ? "xl:flex xl:flex-col xl:items-center" : ""}`}>
                  <motion.a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="GitHub Repository"
                    className={`flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors ${
                      isCollapsed ? "xl:justify-center" : ""
                    }`}
                    whileHover={{ x: 5 }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    <span className={isCollapsed ? "xl:hidden" : ""}>GitHub Repository</span>
                  </motion.a>

                  <motion.a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="LinkedIn"
                    className={`flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors ${
                      isCollapsed ? "xl:justify-center" : ""
                    }`}
                    whileHover={{ x: 5 }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451c.979 0 1.771-.773 1.771-1.729V1.729C24 .774 23.203 0 22.225 0z" />
                    </svg>
                    <span className={isCollapsed ? "xl:hidden" : ""}>LinkedIn</span>
                  </motion.a>
                </div>
                <div className={`mt-4 pt-4 border-t border-white/10 ${isCollapsed ? "xl:hidden" : ""}`}>
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
