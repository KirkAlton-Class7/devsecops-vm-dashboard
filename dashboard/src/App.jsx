import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { XCircle } from "lucide-react";
import Header from "./components/Header";
import QuoteCard from "./components/QuoteCard";
import ImageGallery from "./components/ImageGallery";
import ResourceTable from "./components/ResourceTable";
import SectionList from "./components/SectionList";
import Sidebar from "./components/Sidebar";
import StatCard from "./components/StatCard";
import IdentityCard from "./components/IdentityCard";
import NetworkCard from "./components/NetworkCard";
import LocationCard from "./components/LocationCard";
import SystemResourcesCard from "./components/SystemResourcesCard";
import MonitoringEndpointsCard from "./components/MonitoringEndpointsCard";
import LoadTrendChart from "./components/LoadTrendChart";
import NetworkParticles from "./components/NetworkParticles";
import TextDashboard from "./components/TextDashboard";
import FinOpsDashboard from "./components/FinOpsDashboard";
import { mockDashboard, mockQuotes } from "./data/mockDashboard";

const getDashboardFallbackDiagnostics = () => [
  {
    section: "Dashboard API unavailable",
    route: "/api/dashboard",
  },
];

function getRandomQuote(quotes) {
  if (!quotes?.length) return mockQuotes[0];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function getRealMonitoringEndpoints() {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  return [
    {
      name: "Health Check",
      url: `${protocol}//${hostname}:80/healthz`,
      status: "up",
    },
    {
      name: "Metadata API",
      url: `${protocol}//${hostname}:8080/metadata`,
      status: "up",
    },
  ];
}

export default function App() {
  const [dashboard, setDashboard] = useState(mockDashboard);
  const [quotes, setQuotes] = useState(mockQuotes);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState("standard");
  const [previousMode, setPreviousMode] = useState("standard");
  const [flashMode, setFlashMode] = useState(false);
  const [flashTextMode, setFlashTextMode] = useState(0);
  const [copyFailureVisible, setCopyFailureVisible] = useState(false);
  const [dashboardDiagnostics, setDashboardDiagnostics] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem("dashboard_sidebar_collapsed") === "true"
  );
  const textFlashTimeoutRef = useRef(null);
  const copyFailureTimeoutRef = useRef(null);

  const startModeGlow = useCallback(() => {
    setFlashMode(true);
  }, []);

  const stopModeGlow = useCallback(() => {
    setFlashMode(false);
  }, []);

  const triggerTextFlash = useCallback(() => {
    if (textFlashTimeoutRef.current) return;
    setFlashTextMode((current) => current + 1);
    textFlashTimeoutRef.current = setTimeout(() => {
      textFlashTimeoutRef.current = null;
    }, 300);
  }, []);

  const handleModeChange = useCallback((newMode) => {
    setFlashMode(false);
    if (newMode === "text") {
      setPreviousMode(mode);
    }
    setMode(newMode);
  }, [mode]);

  const showCopyFailure = useCallback(() => {
    if (copyFailureTimeoutRef.current) clearTimeout(copyFailureTimeoutRef.current);
    setCopyFailureVisible(true);
    copyFailureTimeoutRef.current = setTimeout(() => {
      setCopyFailureVisible(false);
      copyFailureTimeoutRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (copyFailureTimeoutRef.current) clearTimeout(copyFailureTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("dashboard_sidebar_collapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'd') {
        if (mode !== 'standard') handleModeChange('standard');
        else startModeGlow();
      } else if (key === 't') {
        if (mode !== 'text') handleModeChange('text');
        else triggerTextFlash();
      } else if (key === 'f') {
        if (mode === 'text') return;
        if (mode !== 'finops') handleModeChange('finops');
        else startModeGlow();
      }
    };
    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (key === 'd' || key === 'f') {
        stopModeGlow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mode, handleModeChange, startModeGlow, stopModeGlow, triggerTextFlash]);

  const logLimit = 30;
  const DEFAULT_SERVICE_LIMIT = 10;
  const serviceLimit = DEFAULT_SERVICE_LIMIT;

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        if (!res.ok) throw new Error("dashboard fetch failed");
        const data = await res.json();
        data.monitoringEndpoints = getRealMonitoringEndpoints();
        setDashboard(data);
        setDashboardDiagnostics([]);
      } catch {
        const mockWithRealEndpoints = { ...mockDashboard, monitoringEndpoints: getRealMonitoringEndpoints() };
        setDashboard(mockWithRealEndpoints);
        setDashboardDiagnostics(getDashboardFallbackDiagnostics());
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
    const interval = setInterval(loadDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadQuotes() {
      try {
        const res = await fetch("/data/quotes.json", { cache: "no-store" });
        if (!res.ok) throw new Error("quotes fetch failed");
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          setQuotes(data);
        } else {
          setQuotes(mockQuotes);
        }
      } catch {
        setQuotes(mockQuotes);
      }
    }
    loadQuotes();
  }, []);

  // ✅ NEW: Intercept /api/logs in development mode to return mock paginated logs
  useEffect(() => {
    // Only intercept in development mode (optional – you can also remove the condition to always use mock)
    if (import.meta.env.DEV) {
      const originalFetch = window.fetch;
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.startsWith('/api/logs')) {
          const urlObj = new URL(url, window.location.origin);
          const limit = parseInt(urlObj.searchParams.get('limit') || '200', 10);
          const offset = parseInt(urlObj.searchParams.get('offset') || '0', 10);
          const minutesParam = urlObj.searchParams.get('minutes');
          const minutes = minutesParam ? parseInt(minutesParam, 10) : null;
          const { getPaginatedMockLogs } = await import('./mockLogs');
          const { logs, hasMore, offset: nextOffset } = getPaginatedMockLogs(limit, offset, minutes);
          const responseBody = JSON.stringify({ logs, hasMore, offset: nextOffset });
          return new Response(responseBody, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return originalFetch(input, init);
      };
      return () => {
        window.fetch = originalFetch;
      };
    }
  }, []);

  const featuredQuote = useMemo(() => getRandomQuote(quotes), [quotes]);
  const mockDataDiagnostics = useMemo(
    () => dashboardDiagnostics,
    [dashboardDiagnostics]
  );

  const instanceName = dashboard?.identity?.instanceName || "";
  const zone = dashboard?.location?.zone || "";
  const projectId = dashboard?.identity?.project || "";
  const billingAccountId = dashboard?.identity?.billingAccountId || "";

  const githubUrl = import.meta.env.VITE_GITHUB_URL || "https://github.com";
  const linkedinUrl = import.meta.env.VITE_LINKEDIN_URL || "https://www.linkedin.com";
  const toggleSidebarCollapsed = useCallback(() => {
    setIsSidebarCollapsed((current) => !current);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="relative animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  const copyFailureToast = (
    <AnimatePresence>
      {copyFailureVisible && (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            className="w-[min(92vw,32rem)] rounded-xl border border-red-400/35 bg-red-950/75 px-4 py-3 text-red-100 shadow-xl shadow-red-950/25 backdrop-blur-md"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-300" />
              <div className="text-sm font-medium">
                Clipboard unavailable on public HTTP. Try HTTPS or manual copy.
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (mode === "text") {
    return (
      <>
        <TextDashboard 
          dashboard={dashboard} 
          tagline={dashboard.meta?.tagline || "Real-time infrastructure monitoring"}
          onExitTextDash={() => setMode(previousMode)}
          logLimit={logLimit}
          serviceLimit={serviceLimit}
          dashboardName={dashboard.meta?.dashboardName || "DevSecOps Dashboard"}
          flashTitle={flashTextMode}
          onOpenFinOps={() => handleModeChange("finops")}
          onCopyFailure={showCopyFailure}
          mockDataDiagnostics={mockDataDiagnostics}
          onRefresh={async () => {
            try {
              const res = await fetch("/api/dashboard", { cache: "no-store" });
              if (!res.ok) throw new Error("dashboard fetch failed");
              const data = await res.json();
              data.monitoringEndpoints = getRealMonitoringEndpoints();
              setDashboard(data);
              setDashboardDiagnostics([]);
            } catch {
              const mockWithRealEndpoints = { ...mockDashboard, monitoringEndpoints: getRealMonitoringEndpoints() };
              setDashboard(mockWithRealEndpoints);
              setDashboardDiagnostics(getDashboardFallbackDiagnostics());
            }
          }}
        />
        {copyFailureToast}
      </>
    );
  }

  if (mode === "finops") {
    return (
      <>
        <FinOpsDashboard
          onExit={() => setMode("standard")}
          githubUrl={githubUrl}
          linkedinUrl={linkedinUrl}
          currentMode={mode}
          onModeChange={handleModeChange}
          flashMode={flashMode}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebarCollapsed}
          onCopyFailure={showCopyFailure}
        />
        {copyFailureToast}
      </>
    );
  }

  // Standard dashboard (mode === "standard")
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <Sidebar
        dashboardUser={dashboard.meta?.dashboardUser || "Kirk Alton"}
        dashboardName={dashboard.meta?.dashboardName || "DevSecOps Dashboard"}
        githubUrl={githubUrl}
        linkedinUrl={linkedinUrl}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
      />
      <motion.div
        className={isSidebarCollapsed ? "xl:ml-20" : "xl:ml-72"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Header
          appName={dashboard.meta?.appName || "Custom Application"}
          tagline={dashboard.meta?.tagline || "Real-time infrastructure monitoring"}
          uptime={dashboard.meta?.uptime || "Unknown"}
          currentMode={mode}
          onModeChange={handleModeChange}
          flashMode={flashMode}
          mockDataDiagnostics={mockDataDiagnostics}
        />
        <motion.main className="space-y-8 px-4 py-4 lg:px-6 lg:py-6" variants={containerVariants} initial="hidden" animate="visible">
          {/* Stats Cards */}
          <motion.section id="overview" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full" variants={itemVariants}>
            {dashboard.summaryCards?.map((card, idx) => (
              <div key={card.label} className="w-full">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: idx * 0.1, type: "spring", stiffness: 200 }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className="h-full"
                >
                  <StatCard
                    label={card.label}
                    value={card.value}
                    status={card.status}
                    instanceName={instanceName}
                    zone={zone}
                    projectId={projectId}
                    billingAccountId={billingAccountId}
                  />
                </motion.div>
              </div>
            ))}
          </motion.section>

          {/* Load Trend Chart */}
          <motion.section id="load" className="grid grid-cols-1 gap-6" variants={itemVariants}>
            <LoadTrendChart />
          </motion.section>

          {/* Ambience */}
          <motion.section id="ambience" className="grid grid-cols-1 md:grid-cols-2 gap-6" variants={itemVariants}>
            <div className="space-y-6">
              <QuoteCard quote={featuredQuote} onCopyFailure={showCopyFailure} />
              <NetworkParticles />
            </div>
            <ImageGallery />
          </motion.section>

          {/* VM Information */}
          <motion.section id="vm-information" className="grid grid-cols-1 gap-6 lg:grid-cols-3" variants={itemVariants}>
            <IdentityCard
              identity={dashboard.identity || {}}
              zone={dashboard.location?.zone}
              projectId={dashboard.identity?.project}
              onCopyFailure={showCopyFailure}
            />
            <NetworkCard network={dashboard.network || {}} onCopyFailure={showCopyFailure} />
            <LocationCard
              location={dashboard.location || {}}
              instanceName={dashboard.identity?.instanceName}
              zone={dashboard.location?.zone}
              projectId={dashboard.identity?.project}
              onCopyFailure={showCopyFailure}
            />
          </motion.section>

          {/* System Resources */}
          <motion.section id="system-resources" className="grid grid-cols-1 gap-6" variants={itemVariants}>
            <SystemResourcesCard resources={dashboard.systemResources || {}} />
          </motion.section>

          {/* Monitoring Endpoints */}
          <motion.section id="monitoring-endpoints" className="grid grid-cols-1 gap-6" variants={itemVariants}>
            <MonitoringEndpointsCard endpoints={dashboard.monitoringEndpoints || []} onCopyFailure={showCopyFailure} />
          </motion.section>

          {/* Services */}
          <motion.section id="services" className="grid grid-cols-1 gap-6" variants={itemVariants}>
            <SectionList
              title="Services"
              subtitle="Service health, status, and performance"
              items={dashboard.services || []}
              limit={serviceLimit}
            />
          </motion.section>

          {/* Logs */}
          <motion.section id="logs" className="grid grid-cols-1 gap-6" variants={itemVariants}>
            <ResourceTable
              rows={dashboard.logs?.map((log) => ({
                name: log.time,
                type: log.level,
                scope: log.scope || "app",
                status: log.message,
              })) || []}
              title="Application Logs"
              isLogs={true}
              limit={logLimit}
              onCopyFailure={showCopyFailure}
            />
          </motion.section>
        </motion.main>
      </motion.div>
      {copyFailureToast}
    </div>
  );
}
