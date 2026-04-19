import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
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
  const [flashTextMode, setFlashTextMode] = useState(false);

  const triggerFlash = useCallback(() => {
    setFlashMode(true);
    setTimeout(() => setFlashMode(false), 300);
  }, []);

  const triggerTextFlash = useCallback(() => {
    setFlashTextMode(true);
    setTimeout(() => setFlashTextMode(false), 300);
  }, []);

  const handleModeChange = useCallback((newMode) => {
    if (newMode === "text") {
      setPreviousMode(mode);
    }
    setMode(newMode);
  }, [mode]);

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
        else triggerFlash();
      } else if (key === 't') {
        if (mode !== 'text') handleModeChange('text');
        else triggerTextFlash();
      } else if (key === 'f') {
        if (mode !== 'finops') handleModeChange('finops');
        else triggerFlash(); // FinOps mode will use the header flash (passed via prop)
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, handleModeChange, triggerFlash, triggerTextFlash]);

  const [logLimit, setLogLimit] = useState(() => {
    const saved = localStorage.getItem("dashboard_log_limit");
    return saved ? parseInt(saved, 10) : 5;
  });
  const [serviceLimit, setServiceLimit] = useState(() => {
    const saved = localStorage.getItem("dashboard_service_limit");
    return saved ? parseInt(saved, 10) : 30;
  });

  useEffect(() => {
    localStorage.setItem("dashboard_log_limit", logLimit);
  }, [logLimit]);
  useEffect(() => {
    localStorage.setItem("dashboard_service_limit", serviceLimit);
  }, [serviceLimit]);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        if (!res.ok) throw new Error("dashboard fetch failed");
        const data = await res.json();
        data.monitoringEndpoints = getRealMonitoringEndpoints();
        setDashboard(data);
      } catch {
        const mockWithRealEndpoints = { ...mockDashboard, monitoringEndpoints: getRealMonitoringEndpoints() };
        setDashboard(mockWithRealEndpoints);
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
        setQuotes(Array.isArray(data) ? data : mockQuotes);
      } catch {
        setQuotes(mockQuotes);
      }
    }
    loadQuotes();
  }, []);

  const featuredQuote = useMemo(() => getRandomQuote(quotes), [quotes]);

  const instanceName = dashboard?.identity?.instanceName || "";
  const zone = dashboard?.location?.zone || "";
  const projectId = dashboard?.identity?.project || "";
  const billingAccountId = dashboard?.identity?.billingAccountId || "";

  const githubUrl = import.meta.env.VITE_GITHUB_URL || "https://github.com";
  const linkedinUrl = import.meta.env.VITE_LINKEDIN_URL || "https://www.linkedin.com";

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

  if (mode === "text") {
    return (
      <TextDashboard 
        dashboard={dashboard} 
        tagline={dashboard.meta?.tagline || "Real-time infrastructure monitoring"}
        onExitTextDash={() => setMode(previousMode)}
        logLimit={logLimit}
        serviceLimit={serviceLimit}
        onLogLimitChange={setLogLimit}
        onServiceLimitChange={setServiceLimit}
        dashboardName={dashboard.meta?.dashboardName || "DevSecOps Dashboard"}
        flashTitle={flashTextMode}
      />
    );
  }

  if (mode === "finops") {
    return (
      <FinOpsDashboard
        onExit={() => setMode("standard")}
        githubUrl={githubUrl}
        linkedinUrl={linkedinUrl}
        currentMode={mode}
        onModeChange={handleModeChange}
        flashMode={flashMode}        // <-- pass flashMode to FinOpsDashboard
      />
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
      />
      <motion.div className="lg:ml-72" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <Header
          appName={dashboard.meta?.appName || "Custom Application"}
          tagline={dashboard.meta?.tagline || "Real-time infrastructure monitoring"}
          uptime={dashboard.meta?.uptime || "Unknown"}
          currentMode={mode}
          onModeChange={handleModeChange}
          flashMode={flashMode}
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
              <QuoteCard quote={featuredQuote} />
              <NetworkParticles />
            </div>
            <ImageGallery />
          </motion.section>

          {/* VM Information */}
          <motion.section id="vm-information" className="grid grid-cols-1 gap-6 lg:grid-cols-3" variants={itemVariants}>
            <IdentityCard identity={dashboard.identity || {}} />
            <NetworkCard network={dashboard.network || {}} />
            <LocationCard location={dashboard.location || {}} />
          </motion.section>

          {/* System Resources */}
          <motion.section id="system-resources" className="grid grid-cols-1 gap-6" variants={itemVariants}>
            <SystemResourcesCard resources={dashboard.systemResources || {}} />
          </motion.section>

          {/* Monitoring Endpoints */}
          <motion.section id="monitoring-endpoints" className="grid grid-cols-1 gap-6" variants={itemVariants}>
            <MonitoringEndpointsCard endpoints={dashboard.monitoringEndpoints || []} />
          </motion.section>

          {/* Services */}
          <motion.section id="services" className="grid grid-cols-1 gap-6" variants={itemVariants}>
            <SectionList
              title="Services"
              subtitle="Service health, status, and performance"
              items={dashboard.services || []}
              limit={serviceLimit}
              onLimitChange={setServiceLimit}
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
              onLimitChange={setLogLimit}
            />
          </motion.section>
        </motion.main>
      </motion.div>
    </div>
  );
}