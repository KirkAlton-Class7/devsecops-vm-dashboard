import { lazy, Suspense, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import Header from "./components/Header";
import AuthModal from "./components/AuthModal";
import QuoteCard from "./components/QuoteCard";
import ResourceTable from "./components/ResourceTable";
import SectionList from "./components/SectionList";
import Sidebar from "./components/Sidebar";
import StatCard from "./components/StatCard";
import IdentityCard from "./components/IdentityCard";
import NetworkCard from "./components/NetworkCard";
import LocationCard from "./components/LocationCard";
import SystemResourcesCard from "./components/SystemResourcesCard";
import MonitoringEndpointsCard from "./components/MonitoringEndpointsCard";
import TextDashboard from "./components/TextDashboard";
import { mockDashboard, mockQuotes } from "./data/mockDashboard";
import { generateDashboardJsonSnapshot, generateDashboardSnapshot } from "./utils/snapshot";
import { writeClipboardText } from "./utils/clipboard";

const ImageGallery = lazy(() => import("./components/ImageGallery"));
const LoadTrendChart = lazy(() => import("./components/LoadTrendChart"));
const NetworkParticles = lazy(() => import("./components/NetworkParticles"));
const FinOpsDashboard = lazy(() => import("./components/FinOpsDashboard"));
const ProtectedDevSecOpsDashboard = lazy(() => import("./components/ProtectedDevSecOpsDashboard"));
const ProtectedFinOpsDashboard = lazy(() => import("./components/ProtectedFinOpsDashboard"));

const getDashboardFallbackDiagnostics = () => [
  {
    section: "Dashboard API unavailable",
    route: "/api/dashboard",
  },
];

function PageFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="relative animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
    </div>
  );
}

function WidgetFallback({ className = "min-h-48" }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl ${className}`} />
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 140,
      damping: 18
    }
  }
};

const LOCAL_DEV_AUTH_USER = import.meta.env.VITE_DASHBOARD_DEV_AUTH_USER || import.meta.env.VITE_DASHBOARD_AUTH_USER || "devsecops";
const LOCAL_DEV_AUTH_PASSWORD = import.meta.env.VITE_DASHBOARD_DEV_AUTH_PASSWORD || import.meta.env.VITE_DASHBOARD_AUTH_PASSWORD || "password";
const LOCAL_FINOPS_AUTH_USER = import.meta.env.VITE_DASHBOARD_FINOPS_AUTH_USER || "finops";
const LOCAL_FINOPS_AUTH_PASSWORD = import.meta.env.VITE_DASHBOARD_FINOPS_AUTH_PASSWORD || "password";
const AUTH_SESSION_KEY = "vm_dashboard_basic_auth_sessions";
const AUTH_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function readAuthSessions() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.sessions || Date.now() > parsed.expiresAt) {
      window.sessionStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }

    return parsed.sessions;
  } catch {
    window.sessionStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

function storeAuthSessions(sessions) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    AUTH_SESSION_KEY,
    JSON.stringify({
      sessions,
      expiresAt: Date.now() + AUTH_SESSION_TTL_MS,
    })
  );
}

function clearAuthSessions() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(AUTH_SESSION_KEY);
}

function getLocalAuthConfig(target) {
  if (target === "finops") {
    return {
      username: LOCAL_FINOPS_AUTH_USER,
      password: LOCAL_FINOPS_AUTH_PASSWORD,
      label: "FinOps",
      route: "/api/finops",
    };
  }

  return {
    username: LOCAL_DEV_AUTH_USER,
    password: LOCAL_DEV_AUTH_PASSWORD,
    label: "DevSecOps",
    route: "/api/dashboard",
  };
}

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

function buildBasicAuthHeader(username, password) {
  return `Basic ${window.btoa(`${username}:${password}`)}`;
}

function buildPublicDashboard(summary = {}) {
  return {
    ...mockDashboard,
    meta: {
      ...mockDashboard.meta,
      ...(summary.meta || {}),
    },
    monitoringEndpoints: getRealMonitoringEndpoints(),
  };
}

export default function App() {
  const [dashboard, setDashboard] = useState(mockDashboard);
  const [quotes, setQuotes] = useState(mockQuotes);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState("standard");
  const [previousMode, setPreviousMode] = useState("standard");
  const [flashMode, setFlashMode] = useState(false);
  const [flashTextMode, setFlashTextMode] = useState(0);
  const [manualCopy, setManualCopy] = useState(null);
  const [copySuccessVisible, setCopySuccessVisible] = useState(false);
  const [copySuccessMessage, setCopySuccessMessage] = useState("Copied to clipboard.");
  const [dashboardDiagnostics, setDashboardDiagnostics] = useState([]);
  const [authSessions, setAuthSessions] = useState(() => readAuthSessions() || {});
  const [authModal, setAuthModal] = useState({ open: false, message: "", target: "dev" });
  const [authError, setAuthError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem("dashboard_sidebar_collapsed") === "true"
  );
  const textFlashTimeoutRef = useRef(null);
  const copySuccessTimeoutRef = useRef(null);
  const manualCopyTextareaRef = useRef(null);
  const hasLiveDashboardRef = useRef(false);
  const devCredentials = authSessions.dev || null;
  const finopsCredentials = authSessions.finops || null;
  const devUnlocked = Boolean(devCredentials);
  const finopsUnlocked = Boolean(finopsCredentials);
  const devAuthHeaders = useMemo(
    () => devCredentials
      ? { Authorization: buildBasicAuthHeader(devCredentials.username, devCredentials.password) }
      : {},
    [devCredentials]
  );
  const finopsAuthHeaders = useMemo(
    () => finopsCredentials
      ? { Authorization: buildBasicAuthHeader(finopsCredentials.username, finopsCredentials.password) }
      : {},
    [finopsCredentials]
  );

  const openAuthModal = useCallback((message = "Sign in to view protected dashboard data.", target = "dev") => {
    setAuthError("");
    setAuthModal({ open: true, message, target });
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModal({ open: false, message: "", target: "dev" });
    setAuthError("");
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const nextSessions = { ...authSessions };
    let changed = false;
    if (
      nextSessions.dev &&
      (!LOCAL_DEV_AUTH_PASSWORD ||
        nextSessions.dev.username !== LOCAL_DEV_AUTH_USER ||
        nextSessions.dev.password !== LOCAL_DEV_AUTH_PASSWORD)
    ) {
      delete nextSessions.dev;
      changed = true;
    }
    if (
      nextSessions.finops &&
      (!LOCAL_FINOPS_AUTH_PASSWORD ||
        nextSessions.finops.username !== LOCAL_FINOPS_AUTH_USER ||
        nextSessions.finops.password !== LOCAL_FINOPS_AUTH_PASSWORD)
    ) {
      delete nextSessions.finops;
      changed = true;
    }
    if (changed) {
      setAuthSessions(nextSessions);
      if (nextSessions.dev || nextSessions.finops) storeAuthSessions(nextSessions);
      else clearAuthSessions();
    }
  }, [authSessions]);

  const handleAuthSubmit = useCallback(async ({ username, password }) => {
    setIsSigningIn(true);
    setAuthError("");
    const target = authModal.target || "dev";
    const authConfig = getLocalAuthConfig(target);

    try {
      if (import.meta.env.DEV && !authConfig.password) {
        const nextSessions = { ...authSessions };
        delete nextSessions[target];
        setAuthSessions(nextSessions);
        if (nextSessions.dev || nextSessions.finops) storeAuthSessions(nextSessions);
        else clearAuthSessions();
        setAuthError(`Local ${authConfig.label} auth password is not configured. Set the Vite auth environment variable and restart Vite.`);
        return;
      }

      if (import.meta.env.DEV && (username !== authConfig.username || password !== authConfig.password)) {
        const nextSessions = { ...authSessions };
        delete nextSessions[target];
        setAuthSessions(nextSessions);
        if (nextSessions.dev || nextSessions.finops) storeAuthSessions(nextSessions);
        else clearAuthSessions();
        setAuthError("Incorrect username or password.");
        return;
      }

      const headers = { Authorization: buildBasicAuthHeader(username, password) };
      const res = await fetch(authConfig.route, {
        cache: "no-store",
        headers,
      });

      if (res.status === 401 || res.status === 403) {
        const nextSessions = { ...authSessions };
        delete nextSessions[target];
        setAuthSessions(nextSessions);
        if (nextSessions.dev || nextSessions.finops) storeAuthSessions(nextSessions);
        else clearAuthSessions();
        setAuthError("Incorrect username or password.");
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("dashboard API did not return JSON");
      }

      const data = await res.json();
      if (target === "dev") {
        data.monitoringEndpoints = getRealMonitoringEndpoints();
        setDashboard(data);
        hasLiveDashboardRef.current = true;
        setDashboardDiagnostics([]);
      }
      const nextSessions = {
        ...authSessions,
        [target]: { username, password },
      };
      setAuthSessions(nextSessions);
      storeAuthSessions(nextSessions);
      setAuthModal({ open: false, message: "", target: "dev" });
      if (copySuccessTimeoutRef.current) clearTimeout(copySuccessTimeoutRef.current);
      setCopySuccessMessage(`Signed in. Protected ${authConfig.label} data enabled.`);
      setCopySuccessVisible(true);
      copySuccessTimeoutRef.current = setTimeout(() => {
        setCopySuccessVisible(false);
        copySuccessTimeoutRef.current = null;
      }, 2000);
    } catch (error) {
      if (import.meta.env.DEV) {
        if (target === "dev") {
          const mockWithRealEndpoints = {
            ...mockDashboard,
            monitoringEndpoints: getRealMonitoringEndpoints(),
          };
          setDashboard(mockWithRealEndpoints);
          hasLiveDashboardRef.current = false;
          setDashboardDiagnostics(getDashboardFallbackDiagnostics());
        }
        const nextSessions = {
          ...authSessions,
          [target]: { username, password },
        };
        setAuthSessions(nextSessions);
        storeAuthSessions(nextSessions);
        setAuthModal({ open: false, message: "", target: "dev" });
        if (copySuccessTimeoutRef.current) clearTimeout(copySuccessTimeoutRef.current);
        setCopySuccessMessage(`Signed in locally with mock ${authConfig.label} data.`);
        setCopySuccessVisible(true);
        copySuccessTimeoutRef.current = setTimeout(() => {
          setCopySuccessVisible(false);
          copySuccessTimeoutRef.current = null;
        }, 2000);
        return;
      }

      console.error("Sign in failed:", error);
      setAuthError("Sign in failed. Check the dashboard API and try again.");
    } finally {
      setIsSigningIn(false);
    }
  }, [authModal.target, authSessions]);

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
    if (newMode === "text" && !devUnlocked) {
      openAuthModal("Sign in to use Text Mode and view protected DevSecOps data.", "dev");
      return;
    }
    setFlashMode(false);
    if (newMode === "text") {
      setPreviousMode(mode);
    }
    setMode(newMode);
  }, [devUnlocked, mode, openAuthModal]);

  const showManualCopy = useCallback((text = "", label = "copied value") => {
    if (copySuccessTimeoutRef.current) clearTimeout(copySuccessTimeoutRef.current);
    setCopySuccessVisible(false);
    setManualCopy({
      label,
      text: String(text ?? ""),
    });
  }, []);

  const showCopySuccess = useCallback((message = "Copied to clipboard.") => {
    if (copySuccessTimeoutRef.current) clearTimeout(copySuccessTimeoutRef.current);
    setCopySuccessMessage(message);
    setCopySuccessVisible(true);
    copySuccessTimeoutRef.current = setTimeout(() => {
      setCopySuccessVisible(false);
      copySuccessTimeoutRef.current = null;
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (copySuccessTimeoutRef.current) clearTimeout(copySuccessTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!manualCopy) return undefined;

    const frame = requestAnimationFrame(() => {
      manualCopyTextareaRef.current?.focus();
      manualCopyTextareaRef.current?.select();
    });
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setManualCopy(null);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [manualCopy]);

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

  const handleCopySnapshot = useCallback(async (finopsData = null) => {
    const snapshotMode = (finopsData || mode === "finops") ? "finops" : "devsecops";
    const hasSnapshotAuth = snapshotMode === "finops" ? finopsUnlocked : devUnlocked;
    const snapshotAuthHeaders = snapshotMode === "finops" ? finopsAuthHeaders : devAuthHeaders;

    if (!hasSnapshotAuth) {
      openAuthModal(
        snapshotMode === "finops" ? "Sign in to copy FinOps snapshots." : "Sign in to copy DevSecOps snapshots.",
        snapshotMode === "finops" ? "finops" : "dev"
      );
      return false;
    }

    let resolvedFinopsData = finopsData;

    if (snapshotMode === "finops" && !resolvedFinopsData) {
      try {
        const res = await fetch("/api/finops", { cache: "no-store", headers: snapshotAuthHeaders });
        if (res.ok) resolvedFinopsData = await res.json();
      } catch (error) {
        console.warn("FinOps snapshot data unavailable:", error);
      }
    }

    const snapshot = generateDashboardSnapshot({
      mode: snapshotMode,
      dashboard,
      finopsData: resolvedFinopsData,
      lastRefresh: new Date(),
      logLimit,
      serviceLimit,
      dashboardName: dashboard.meta?.dashboardName || "DevSecOps Dashboard",
      tagline: dashboard.meta?.tagline || "Real-time infrastructure monitoring",
    });

    try {
      await writeClipboardText(snapshot);
      showCopySuccess("Dashboard snapshot copied to clipboard.");
      return true;
    } catch (error) {
      console.error("Failed to copy snapshot:", error);
      showManualCopy(snapshot, "dashboard snapshot");
      return false;
    }
  }, [dashboard, devAuthHeaders, devUnlocked, finopsAuthHeaders, finopsUnlocked, logLimit, mode, openAuthModal, serviceLimit, showManualCopy, showCopySuccess]);

  const handleCopyJsonSnapshot = useCallback(async (finopsData = null) => {
    const snapshotMode = (finopsData || mode === "finops") ? "finops" : "devsecops";
    const hasSnapshotAuth = snapshotMode === "finops" ? finopsUnlocked : devUnlocked;
    const snapshotAuthHeaders = snapshotMode === "finops" ? finopsAuthHeaders : devAuthHeaders;

    if (!hasSnapshotAuth) {
      openAuthModal(
        snapshotMode === "finops" ? "Sign in to copy FinOps JSON payloads." : "Sign in to copy DevSecOps JSON payloads.",
        snapshotMode === "finops" ? "finops" : "dev"
      );
      return false;
    }

    let resolvedFinopsData = finopsData;

    if (snapshotMode === "finops" && !resolvedFinopsData) {
      try {
        const res = await fetch("/api/finops", { cache: "no-store", headers: snapshotAuthHeaders });
        if (res.ok) resolvedFinopsData = await res.json();
      } catch (error) {
        console.warn("FinOps JSON snapshot data unavailable:", error);
      }
    }

    const payload = generateDashboardJsonSnapshot({
      mode: snapshotMode,
      dashboard,
      finopsData: resolvedFinopsData,
      lastRefresh: new Date(),
      logLimit,
      serviceLimit,
      dashboardName: dashboard.meta?.dashboardName || "DevSecOps Dashboard",
      tagline: dashboard.meta?.tagline || "Real-time infrastructure monitoring",
    });
    const snapshot = JSON.stringify(payload, null, 2);

    try {
      await writeClipboardText(snapshot);
      showCopySuccess("JSON payload copied to clipboard.");
      return true;
    } catch (error) {
      console.error("Failed to copy JSON snapshot:", error);
      showManualCopy(snapshot, "JSON payload");
      return false;
    }
  }, [dashboard, devAuthHeaders, devUnlocked, finopsAuthHeaders, finopsUnlocked, logLimit, mode, openAuthModal, serviceLimit, showManualCopy, showCopySuccess]);

  useEffect(() => {
    async function loadDashboard() {
      if (!devUnlocked) {
        setDashboard(buildPublicDashboard(mockDashboard));
        setDashboardDiagnostics([]);
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/dashboard", {
          cache: "no-store",
          headers: devAuthHeaders,
        });

        if (res.status === 401 || res.status === 403) {
          const nextSessions = { ...authSessions };
          delete nextSessions.dev;
          setAuthSessions(nextSessions);
          if (nextSessions.dev || nextSessions.finops) storeAuthSessions(nextSessions);
          else clearAuthSessions();
          return;
        }

        if (!res.ok) throw new Error("dashboard fetch failed");
        const data = await res.json();
        data.monitoringEndpoints = getRealMonitoringEndpoints();
        setDashboard(data);
        hasLiveDashboardRef.current = true;
        setDashboardDiagnostics([]);
      } catch {
        if (!hasLiveDashboardRef.current) {
          const mockWithRealEndpoints = buildPublicDashboard(mockDashboard);
          setDashboard(mockWithRealEndpoints);
        }
        setDashboardDiagnostics(getDashboardFallbackDiagnostics());
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
    if (!devUnlocked) return undefined;
    const interval = setInterval(loadDashboard, 10000);
    return () => clearInterval(interval);
  }, [authSessions, devAuthHeaders, devUnlocked]);

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
  const dashboardLogRows = useMemo(
    () => dashboard.logs?.map((log) => ({
      name: log.time,
      type: log.level,
      scope: log.scope || "app",
      status: log.message,
    })) || [],
    [dashboard.logs]
  );

  const githubUrl = import.meta.env.VITE_GITHUB_URL || "https://github.com";
  const linkedinUrl = import.meta.env.VITE_LINKEDIN_URL || "https://www.linkedin.com";
  const toggleSidebarCollapsed = useCallback(() => {
    setIsSidebarCollapsed((current) => !current);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="relative animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  const manualCopyModal = (
    <AnimatePresence>
      {manualCopy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className="flex max-h-[86vh] w-[min(92vw,44rem)] flex-col rounded-xl border border-cyan-300/25 bg-slate-950/95 text-slate-100 shadow-2xl shadow-cyan-950/20"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-copy-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-3">
              <div>
                <h2 id="manual-copy-title" className="text-sm font-semibold text-cyan-100">
                  Manual Copy
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Clipboard access is unavailable on public HTTP or blocked by this browser. Highlight the {manualCopy.label} below and copy it manually.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualCopy(null)}
                className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition-colors hover:border-cyan-300/40 hover:text-cyan-200"
                title="Close manual copy"
                aria-label="Close manual copy"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 p-4">
              <textarea
                ref={manualCopyTextareaRef}
                readOnly
                value={manualCopy.text}
                onFocus={(event) => event.currentTarget.select()}
                className="h-[min(56vh,28rem)] w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-100 outline-none focus:border-cyan-300"
                aria-label="Manual copy text"
              />
            </div>
            <div className="border-t border-white/10 px-4 py-3 text-xs text-slate-500">
              Select inside the text box, then use your system copy shortcut.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const copySuccessToast = (
    <AnimatePresence>
      {copySuccessVisible && (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            className="w-[min(92vw,24rem)] rounded-xl border border-cyan-300/35 bg-slate-950/80 px-4 py-3 text-cyan-100 shadow-xl shadow-cyan-950/25 backdrop-blur-md"
            role="status"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-300" />
              <div className="text-sm font-medium">{copySuccessMessage}</div>
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
          onCopyFailure={showManualCopy}
          onCopySuccess={showCopySuccess}
          authHeaders={devAuthHeaders}
          mockDataDiagnostics={mockDataDiagnostics}
          onRefresh={async () => {
            try {
              const res = await fetch("/api/dashboard", { cache: "no-store", headers: devAuthHeaders });
              if (!res.ok) throw new Error("dashboard fetch failed");
              const data = await res.json();
              data.monitoringEndpoints = getRealMonitoringEndpoints();
              setDashboard(data);
              hasLiveDashboardRef.current = true;
              setDashboardDiagnostics([]);
            } catch {
              if (!hasLiveDashboardRef.current) {
                const mockWithRealEndpoints = { ...mockDashboard, monitoringEndpoints: getRealMonitoringEndpoints() };
                setDashboard(mockWithRealEndpoints);
              }
              setDashboardDiagnostics(getDashboardFallbackDiagnostics());
            }
          }}
        />
        <AuthModal
          open={authModal.open}
          message={authModal.message}
          error={authError}
          isSubmitting={isSigningIn}
          onClose={closeAuthModal}
          onSubmit={handleAuthSubmit}
        />
        {manualCopyModal}
        {copySuccessToast}
      </>
    );
  }

  if (mode === "finops") {
    return (
      <>
        <Suspense fallback={<PageFallback />}>
          {finopsUnlocked ? (
            <FinOpsDashboard
              onExit={() => setMode("standard")}
              githubUrl={githubUrl}
              linkedinUrl={linkedinUrl}
              currentMode={mode}
              onModeChange={handleModeChange}
              flashMode={flashMode}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={toggleSidebarCollapsed}
              onCopyFailure={showManualCopy}
              onCopySuccess={showCopySuccess}
              onCopySnapshot={handleCopySnapshot}
              onCopyJsonSnapshot={handleCopyJsonSnapshot}
              authHeaders={finopsAuthHeaders}
            />
          ) : (
            <ProtectedFinOpsDashboard
              githubUrl={githubUrl}
              linkedinUrl={linkedinUrl}
              currentMode={mode}
              onModeChange={handleModeChange}
              flashMode={flashMode}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={toggleSidebarCollapsed}
              onCopyFailure={showManualCopy}
              onCopySuccess={showCopySuccess}
              onAuthRequired={(message) => openAuthModal(message, "finops")}
            />
          )}
        </Suspense>
        <AuthModal
          open={authModal.open}
          message={authModal.message}
          error={authError}
          isSubmitting={isSigningIn}
          onClose={closeAuthModal}
          onSubmit={handleAuthSubmit}
        />
        {manualCopyModal}
        {copySuccessToast}
      </>
    );
  }

  if (!devUnlocked) {
    return (
      <>
        <Suspense fallback={<PageFallback />}>
          <ProtectedDevSecOpsDashboard
            githubUrl={githubUrl}
            linkedinUrl={linkedinUrl}
            currentMode={mode}
            onModeChange={handleModeChange}
            flashMode={flashMode}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={toggleSidebarCollapsed}
            featuredQuote={featuredQuote}
            onCopyFailure={showManualCopy}
            onCopySuccess={showCopySuccess}
            onAuthRequired={(message) => openAuthModal(message, "dev")}
          />
        </Suspense>
        <AuthModal
          open={authModal.open}
          message={authModal.message}
          error={authError}
          isSubmitting={isSigningIn}
          onClose={closeAuthModal}
          onSubmit={handleAuthSubmit}
        />
        {manualCopyModal}
        {copySuccessToast}
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
          onCopyJsonSnapshot={handleCopyJsonSnapshot}
          onCopySnapshot={handleCopySnapshot}
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
            <Suspense fallback={<WidgetFallback className="min-h-[28rem]" />}>
              <LoadTrendChart
                authHeaders={devAuthHeaders}
                fetchEnabled={false}
                initialLoad={dashboard.systemLoad}
                onCopyFailure={showManualCopy}
                onCopySuccess={showCopySuccess}
              />
            </Suspense>
          </motion.section>

          {/* Ambience */}
          <motion.section id="ambience" className="grid grid-cols-1 md:grid-cols-2 gap-6" variants={itemVariants}>
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

          {/* VM Information */}
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

          {/* System Resources */}
          <motion.section id="system-resources" className="grid grid-cols-1 gap-6" variants={itemVariants}>
            <SystemResourcesCard
              authHeaders={devAuthHeaders}
              fetchEnabled={false}
              resources={dashboard.systemResources || {}}
              onCopyFailure={showManualCopy}
              onCopySuccess={showCopySuccess}
            />
          </motion.section>

          {/* Monitoring Endpoints */}
          <motion.section id="monitoring-endpoints" className="grid grid-cols-1 gap-6" variants={itemVariants}>
            <MonitoringEndpointsCard
              endpoints={dashboard.monitoringEndpoints || []}
              onCopyFailure={showManualCopy}
              onCopySuccess={showCopySuccess}
            />
          </motion.section>

          {/* Services */}
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

          {/* Logs */}
          <motion.section id="logs" className="grid grid-cols-1 gap-6" variants={itemVariants}>
            <ResourceTable
              rows={dashboardLogRows}
              title="System Logs"
              isLogs={true}
              limit={logLimit}
              authHeaders={devAuthHeaders}
              onCopyFailure={showManualCopy}
              onCopySuccess={showCopySuccess}
            />
          </motion.section>
        </motion.main>
      </motion.div>
      <AuthModal
        open={authModal.open}
        message={authModal.message}
        error={authError}
        isSubmitting={isSigningIn}
        onClose={closeAuthModal}
        onSubmit={handleAuthSubmit}
      />
      {manualCopyModal}
      {copySuccessToast}
    </div>
  );
}
