import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  Cpu,
  Heart,
  LayoutDashboard,
  Link2,
  Server,
  Terminal,
  X,
} from "lucide-react";
import Header from "./components/Header";
import IdentityCard from "./components/IdentityCard";
import LocationCard from "./components/LocationCard";
import MonitoringEndpointsCard from "./components/MonitoringEndpointsCard";
import NetworkCard from "./components/NetworkCard";
import QuoteCard from "./components/QuoteCard";
import SectionList from "./components/SectionList";
import Sidebar from "./components/Sidebar";
import StatCard from "./components/StatCard";
import SystemResourcesCard from "./components/SystemResourcesCard";
import TextDashboard from "./components/TextDashboard";
import { mockDashboard, mockQuotes } from "./data/mockDashboard";
import { writeClipboardText } from "./utils/clipboard";

const ImageGallery = lazy(() => import("./components/ImageGallery"));
const NetworkParticles = lazy(() => import("./components/NetworkParticles"));

const REFRESH_MS = 30000;

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "ambience", label: "Ambience", icon: Heart },
  { id: "vm-information", label: "VM Information", icon: Server },
  { id: "system-resources", label: "System Resources", icon: Cpu },
  { id: "monitoring-endpoints", label: "Monitoring Endpoints", icon: Link2 },
  { id: "services", label: "Services", icon: Activity },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 140,
      damping: 18,
    },
  },
};

function WidgetFallback({ className = "min-h-48" }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl ${className}`} />
  );
}

function getFallbackDiagnostics() {
  return [
    {
      section: "Dashboard API unavailable",
      route: "/api/dashboard",
    },
  ];
}

function getRandomQuote(quotes) {
  if (!quotes?.length) return mockQuotes[0];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function normalizeDashboardPayload(payload) {
  const dashboard = payload || mockDashboard;
  return {
    ...mockDashboard,
    ...dashboard,
    summaryCards: dashboard.summaryCards?.length ? dashboard.summaryCards : mockDashboard.summaryCards,
    identity: {
      ...mockDashboard.identity,
      ...(dashboard.identity || {}),
    },
    network: {
      ...mockDashboard.network,
      ...(dashboard.network || {}),
    },
    location: {
      ...mockDashboard.location,
      ...(dashboard.location || {}),
    },
    systemResources: {
      ...mockDashboard.systemResources,
      ...(dashboard.systemResources || {}),
      cpu: {
        ...mockDashboard.systemResources.cpu,
        ...(dashboard.systemResources?.cpu || {}),
      },
      memory: {
        ...mockDashboard.systemResources.memory,
        ...(dashboard.systemResources?.memory || {}),
      },
      disk: {
        ...mockDashboard.systemResources.disk,
        ...(dashboard.systemResources?.disk || {}),
      },
    },
    meta: {
      ...mockDashboard.meta,
      ...(dashboard.meta || {}),
    },
  };
}

function formatBasicSnapshot(dashboard) {
  const lines = [
    "BASIC VM DASHBOARD SNAPSHOT",
    "",
    `Taken: ${new Date().toISOString()}`,
    "",
    "SUMMARY",
    ...(dashboard.summaryCards || []).map((card) => `${card.label}: ${card.value} (${card.status})`),
    "",
    "IDENTITY",
    `Project: ${dashboard.identity?.project || "unknown"}`,
    `Instance ID: ${dashboard.identity?.instanceId || "unknown"}`,
    `Instance Name: ${dashboard.identity?.instanceName || "unknown"}`,
    `Machine Type: ${dashboard.identity?.machineType || "unknown"}`,
    "",
    "NETWORK",
    `VPC: ${dashboard.network?.vpc || "unknown"}`,
    `Subnet: ${dashboard.network?.subnet || "unknown"}`,
    `Internal IP: ${dashboard.network?.internalIp || "unknown"}`,
    `External IP: ${dashboard.network?.externalIp || "unknown"}`,
    "",
    "LOCATION",
    `Region: ${dashboard.location?.region || "unknown"}`,
    `Zone: ${dashboard.location?.zone || "unknown"}`,
    `Uptime: ${dashboard.location?.uptime || "unknown"}`,
    `Load (5m): ${dashboard.location?.loadAvg || "unknown"}`,
  ];

  return lines.join("\n");
}

function formatBasicJsonSnapshot(dashboard) {
  return JSON.stringify(
    {
      snapshot: {
        title: "BASIC VM DASHBOARD SNAPSHOT",
        taken_at: new Date().toISOString(),
      },
      summary_cards: dashboard.summaryCards || [],
      identity: dashboard.identity || {},
      network: dashboard.network || {},
      location: dashboard.location || {},
      system_resources: dashboard.systemResources || {},
      monitoring_endpoints: dashboard.monitoringEndpoints || [],
      services: dashboard.services || [],
      metadata: dashboard.meta || {},
    },
    null,
    2
  );
}

export default function App() {
  const [dashboard, setDashboard] = useState(mockDashboard);
  const [quotes, setQuotes] = useState(mockQuotes);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem("basic_dashboard_sidebar_collapsed") === "true"
  );
  const [manualCopy, setManualCopy] = useState(null);
  const [mode, setMode] = useState("standard");
  const [copySuccessVisible, setCopySuccessVisible] = useState(false);
  const [copySuccessMessage, setCopySuccessMessage] = useState("Copied to clipboard.");
  const [dashboardDiagnostics, setDashboardDiagnostics] = useState([]);
  const copySuccessTimeoutRef = useRef(null);
  const manualCopyTextareaRef = useRef(null);

  const githubUrl = import.meta.env.VITE_GITHUB_URL || "https://github.com";
  const linkedinUrl = import.meta.env.VITE_LINKEDIN_URL || "https://www.linkedin.com";
  const featuredQuote = useMemo(() => getRandomQuote(quotes), [quotes]);
  const mockDataDiagnostics = useMemo(() => dashboardDiagnostics, [dashboardDiagnostics]);
  const instanceName = dashboard.identity?.instanceName;
  const zone = dashboard.location?.zone;
  const projectId = dashboard.identity?.project;
  const billingAccountId = dashboard.identity?.billingAccountId;
  const serviceLimit = Math.min(8, dashboard.services?.length || 8);
  const modeOptions = useMemo(
    () => [
      { value: "standard", label: "BASIC (B)", icon: LayoutDashboard },
      { value: "text", label: "TEXTMODE (T)", icon: Terminal },
    ],
    []
  );

  const showCopySuccess = useCallback((message = "Copied to clipboard.") => {
    if (copySuccessTimeoutRef.current) clearTimeout(copySuccessTimeoutRef.current);
    setCopySuccessMessage(message);
    setCopySuccessVisible(true);
    copySuccessTimeoutRef.current = setTimeout(() => {
      setCopySuccessVisible(false);
      copySuccessTimeoutRef.current = null;
    }, 2200);
  }, []);

  const showManualCopy = useCallback((text, label = "dashboard snapshot") => {
    setManualCopy({
      text,
      label,
      message: `Clipboard access is unavailable on public HTTP or blocked by this browser. Highlight the ${label} below and copy it manually.`,
    });
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (!response.ok) throw new Error(`Dashboard API returned ${response.status}`);
      const data = await response.json();
      setDashboard(normalizeDashboardPayload(data));
      setDashboardDiagnostics([]);
    } catch (error) {
      console.warn("Using local mock dashboard data:", error);
      setDashboard(normalizeDashboardPayload(mockDashboard));
      setDashboardDiagnostics(getFallbackDiagnostics());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    window.setTimeout(fetchDashboard, 0);
    const interval = window.setInterval(fetchDashboard, REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [fetchDashboard]);

  useEffect(() => {
    async function loadQuotes() {
      try {
        const response = await fetch("/data/quotes.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`Quotes returned ${response.status}`);
        const data = await response.json();
        if (Array.isArray(data) && data.length) setQuotes(data);
      } catch {
        setQuotes(mockQuotes);
      }
    }
    loadQuotes();
  }, []);

  useEffect(() => {
    if (!manualCopy || !manualCopyTextareaRef.current) return;
    manualCopyTextareaRef.current.focus();
    manualCopyTextareaRef.current.select();
  }, [manualCopy]);

  useEffect(() => {
    return () => {
      if (copySuccessTimeoutRef.current) clearTimeout(copySuccessTimeoutRef.current);
    };
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setIsSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem("basic_dashboard_sidebar_collapsed", String(next));
      return next;
    });
  }, []);

  const handleCopySnapshot = useCallback(async () => {
    const text = formatBasicSnapshot(dashboard);
    try {
      await writeClipboardText(text);
      showCopySuccess("Dashboard snapshot copied to clipboard.");
      return true;
    } catch (error) {
      console.error("Failed to copy dashboard snapshot:", error);
      showManualCopy(text, "dashboard snapshot");
      return false;
    }
  }, [dashboard, showCopySuccess, showManualCopy]);

  const handleCopyJsonSnapshot = useCallback(async () => {
    const text = formatBasicJsonSnapshot(dashboard);
    try {
      await writeClipboardText(text);
      showCopySuccess("JSON payload copied to clipboard.");
      return true;
    } catch (error) {
      console.error("Failed to copy JSON payload:", error);
      showManualCopy(text, "JSON payload");
      return false;
    }
  }, [dashboard, showCopySuccess, showManualCopy]);

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode === "text" ? "text" : "standard");
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;

      const key = event.key.toLowerCase();
      if (key === "t") {
        event.preventDefault();
        setMode("text");
      }
      if (key === "b" && mode !== "standard") {
        event.preventDefault();
        setMode("standard");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode]);

  const manualCopyModal = manualCopy
    ? createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
        <div className="w-full max-w-2xl rounded-2xl border border-cyan-400/30 bg-slate-950 p-5 shadow-2xl shadow-cyan-950/30">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-cyan-100">Manual Copy</h2>
              <p className="mt-1 text-sm text-slate-400">{manualCopy.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setManualCopy(null)}
              className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:border-cyan-300/50 hover:text-cyan-200"
              aria-label="Close manual copy modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <textarea
            ref={manualCopyTextareaRef}
            readOnly
            value={manualCopy.text}
            className="h-80 w-full resize-none rounded-xl border border-white/10 bg-slate-900 p-4 font-mono text-xs leading-5 text-slate-100 outline-none focus:border-cyan-300/60"
          />
        </div>
      </div>,
      document.body
    )
    : null;

  const copySuccessToast = copySuccessVisible
    ? createPortal(
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        className="fixed bottom-6 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-cyan-300/30 bg-slate-950/95 px-4 py-3 text-sm text-cyan-100 shadow-2xl shadow-cyan-950/30"
      >
        <CheckCircle2 className="h-4 w-4 text-cyan-300" />
        {copySuccessMessage}
      </motion.div>,
      document.body
    )
    : null;

  if (mode === "text") {
    return (
      <>
        <TextDashboard
          dashboard={dashboard}
          dashboardName={dashboard.meta?.dashboardName || "Basic VM Dashboard"}
          tagline={dashboard.meta?.tagline || "Lightweight VM health and metadata"}
          mockDataDiagnostics={mockDataDiagnostics}
          onExitTextDash={() => setMode("standard")}
          onRefresh={fetchDashboard}
          onCopyFailure={showManualCopy}
          onCopySuccess={showCopySuccess}
        />
        {manualCopyModal}
        {copySuccessToast}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <Sidebar
        dashboardUser={dashboard.meta?.dashboardUser || "VM Operator"}
        dashboardName={dashboard.meta?.dashboardName || "Basic VM Dashboard"}
        githubUrl={githubUrl}
        linkedinUrl={linkedinUrl}
        navItems={navItems}
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
          appName={dashboard.meta?.appName || "Basic VM Dashboard"}
          tagline={dashboard.meta?.tagline || "Lightweight VM health and metadata"}
          uptime={dashboard.meta?.uptime || "Unknown"}
          currentMode={mode}
          showAuthControl={false}
          showBudgetControls={false}
          showModeControl
          modeOptions={modeOptions}
          mockDataDiagnostics={mockDataDiagnostics}
          onCopyJsonSnapshot={handleCopyJsonSnapshot}
          onCopySnapshot={handleCopySnapshot}
          onModeChange={handleModeChange}
        />

        <motion.main
          className="space-y-8 px-4 py-4 lg:px-6 lg:py-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.section id="overview" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" variants={itemVariants}>
            {(dashboard.summaryCards || []).map((card, idx) => (
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

          <motion.section id="ambience" className="grid grid-cols-1 gap-6 md:grid-cols-2" variants={itemVariants}>
            <div className="space-y-6">
              <QuoteCard
                quote={featuredQuote}
                onCopyFailure={showManualCopy}
                onCopySuccess={showCopySuccess}
              />
              <Suspense fallback={<WidgetFallback className="h-48" />}>
                <NetworkParticles />
              </Suspense>
            </div>
            <Suspense fallback={<WidgetFallback className="min-h-[28rem]" />}>
              <ImageGallery onCopyFailure={showManualCopy} onCopySuccess={showCopySuccess} />
            </Suspense>
          </motion.section>

          <motion.section id="vm-information" className="grid grid-cols-1 gap-6 lg:grid-cols-3" variants={itemVariants}>
            <IdentityCard
              identity={dashboard.identity || {}}
              zone={dashboard.location?.zone}
              projectId={dashboard.identity?.project}
              onCopyFailure={showManualCopy}
              onCopySuccess={showCopySuccess}
            />
            <NetworkCard
              network={dashboard.network || {}}
              onCopyFailure={showManualCopy}
              onCopySuccess={showCopySuccess}
            />
            <LocationCard
              location={dashboard.location || {}}
              instanceName={dashboard.identity?.instanceName}
              zone={dashboard.location?.zone}
              projectId={dashboard.identity?.project}
              onCopyFailure={showManualCopy}
              onCopySuccess={showCopySuccess}
            />
          </motion.section>

          <motion.section id="system-resources" className="grid grid-cols-1 gap-6" variants={itemVariants}>
            <SystemResourcesCard
              fetchEnabled={false}
              resources={dashboard.systemResources || {}}
              onCopyFailure={showManualCopy}
              onCopySuccess={showCopySuccess}
            />
          </motion.section>

          <motion.section id="monitoring-endpoints" className="grid grid-cols-1 gap-6" variants={itemVariants}>
            <MonitoringEndpointsCard
              endpoints={dashboard.monitoringEndpoints || []}
              onCopyFailure={showManualCopy}
              onCopySuccess={showCopySuccess}
            />
          </motion.section>

          <motion.section id="services" className="grid grid-cols-1 gap-6" variants={itemVariants}>
            <SectionList
              title="Services"
              subtitle="Service health, status, and performance"
              items={dashboard.services || []}
              limit={serviceLimit}
              onCopyFailure={showManualCopy}
              onCopySuccess={showCopySuccess}
            />
          </motion.section>
        </motion.main>
      </motion.div>
      {manualCopyModal}
      {copySuccessToast}
      {isLoading && null}
    </div>
  );
}
