import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  applyOptionFilters,
  getUniqueOptions,
  hasActiveFilters,
  toggleFilterValue,
} from "./FilterOverlay";
import { writeClipboardText } from "../utils/clipboard";

const formatBytes = (mb) => {
  if (!mb && mb !== 0) return "N/A";
  if (mb > 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
};

const SERVICE_STATUS_SORT_ORDER = {
  healthy: 0,
  running: 1,
  installed: 2,
  reachable: 3,
  ready: 4,
  active: 5,
  successful: 6,
  serving: 7,
  warning: 8,
  pending: 9,
  degraded: 10,
  critical: 11,
  error: 12,
  failed: 13,
  unreachable: 14,
  unavailable: 15,
};

const SERVICE_SORT_MODES = [
  { key: "name-asc", label: "NAME A-Z", field: "name", direction: "asc" },
  { key: "name-desc", label: "NAME Z-A", field: "name", direction: "desc" },
  { key: "status-asc", label: "STATUS HEALTHY-CRITICAL", field: "status", direction: "asc" },
  { key: "status-desc", label: "STATUS CRITICAL-HEALTHY", field: "status", direction: "desc" },
];

const SERVICE_FILTER_ACCESSORS = {
  name: (service) => service.label,
  status: (service) => service.status,
};

const cycleMode = (current, modes) => {
  const currentIndex = modes.findIndex((mode) => mode.key === current);
  return modes[(currentIndex + 1) % modes.length].key;
};

const getMode = (key, modes) => modes.find((mode) => mode.key === key) || modes[0];

const sortServices = (services, modeKey) => {
  const mode = getMode(modeKey, SERVICE_SORT_MODES);
  return [...(services || [])].sort((a, b) => {
    let result;

    if (mode.field === "status") {
      result =
        (SERVICE_STATUS_SORT_ORDER[String(a.status || "").toLowerCase()] ?? 99) -
        (SERVICE_STATUS_SORT_ORDER[String(b.status || "").toLowerCase()] ?? 99);
    } else {
      result = (a.label || "").localeCompare(b.label || "", undefined, {
        sensitivity: "base",
      });
    }

    if (result === 0) {
      result = (a.label || "").localeCompare(b.label || "", undefined, {
        sensitivity: "base",
      });
    }

    return mode.direction === "asc" ? result : -result;
  });
};

const getServiceStatusClass = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "critical") return "text-red-400";
  if (normalized === "warning") return "text-yellow-300";
  if (normalized === "healthy") return "text-green-400";
  return "text-white/40";
};

const getServiceLabelClass = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "critical") return "text-red-300/90";
  if (normalized === "warning") return "text-yellow-200/80";
  if (normalized === "healthy") return "text-white";
  return "text-white";
};

function formatMetric(value) {
  if (!value && value !== 0) return "N/A";
  const cleaned = value.toString().replace(/%$/, "");
  return `${cleaned}%`;
}

function getCostValue(dashboard) {
  const costCard = dashboard.summaryCards?.find(
    (card) => card.label === "Estimated Cost" || card.label === "Cost"
  );
  const raw = costCard?.value;

  if (!raw && raw !== 0) return "N/A";
  if (typeof raw === "number") return `$${raw.toFixed(2)}`;
  if (typeof raw === "string") {
    if (raw.startsWith("$")) return raw;
    const numeric = parseFloat(raw.replace(/[^0-9.-]/g, ""));
    if (!Number.isNaN(numeric)) return `$${numeric.toFixed(2)}`;
    return raw;
  }

  return "N/A";
}

function buildTextSnapshot({ dashboard, dashboardName, tagline, lastRefresh, serviceLimit }) {
  const resources = dashboard.systemResources || {};
  const lines = [
    "BASIC VM DASHBOARD SNAPSHOT",
    "",
    `Taken: ${lastRefresh.toISOString()}`,
    "",
    dashboardName,
    tagline,
    "",
    "IDENTITY",
    `Project: ${dashboard.identity?.project || "N/A"}`,
    `Instance ID: ${dashboard.identity?.instanceId || "N/A"}`,
    `Instance Name: ${dashboard.identity?.instanceName || "N/A"}`,
    `Machine Type: ${dashboard.identity?.machineType || "N/A"}`,
    "",
    "OVERVIEW",
    `CPU: ${formatMetric(dashboard.summaryCards?.find((card) => card.label === "CPU")?.value)}`,
    `Memory: ${formatMetric(dashboard.summaryCards?.find((card) => card.label === "Memory")?.value)}`,
    `Disk: ${formatMetric(dashboard.summaryCards?.find((card) => card.label === "Disk")?.value)}`,
    `Estimated Cost: ${getCostValue(dashboard)}/month`,
    "",
    "SYSTEM RESOURCES",
    `CPU Cores: ${resources.cpu?.cores || "N/A"}`,
    `Memory: ${formatBytes(resources.memory?.used)} used / ${formatBytes(resources.memory?.total)} total`,
    `Disk: ${formatBytes(resources.disk?.used)} used / ${formatBytes(resources.disk?.total)} total`,
    "",
    "NETWORK",
    `VPC: ${dashboard.network?.vpc || "N/A"}`,
    `Subnet: ${dashboard.network?.subnet || "N/A"}`,
    `Internal IP: ${dashboard.network?.internalIp || "N/A"}`,
    `External IP: ${dashboard.network?.externalIp || "N/A"}`,
    "",
    "LOCATION",
    `Region: ${dashboard.location?.region || "N/A"}`,
    `Zone: ${dashboard.location?.zone || "N/A"}`,
    `Uptime: ${dashboard.meta?.uptime || dashboard.location?.uptime || "N/A"}`,
    "",
    "MONITORING ENDPOINTS",
    ...(dashboard.monitoringEndpoints || []).map(
      (endpoint) => `${endpoint.name}: ${endpoint.url || "N/A"} [${endpoint.status || "unknown"}]`
    ),
    "",
    `SERVICES (${Math.min(serviceLimit, dashboard.services?.length || 0)} of ${dashboard.services?.length || 0})`,
    ...(dashboard.services || [])
      .slice(0, serviceLimit)
      .map((service) => `${service.label}: ${service.value || "N/A"} [${service.status || "unknown"}]`),
  ];

  return lines.filter((line) => line !== undefined).join("\n");
}

function buildJsonSnapshot({ dashboard, dashboardName, tagline, lastRefresh }) {
  return JSON.stringify(
    {
      snapshot: {
        title: "BASIC VM DASHBOARD SNAPSHOT",
        dashboard_name: dashboardName,
        tagline,
        taken_at: lastRefresh.toISOString(),
      },
      summary_cards: dashboard.summaryCards || [],
      identity: dashboard.identity || {},
      overview: dashboard.systemResources || {},
      network: dashboard.network || {},
      location: dashboard.location || {},
      monitoring_endpoints: dashboard.monitoringEndpoints || [],
      services: dashboard.services || [],
      metadata: dashboard.meta || {},
    },
    null,
    2
  );
}

export default function TextDashboard({
  dashboard,
  tagline = "",
  onExitTextDash,
  serviceLimit = 8,
  dashboardName = "Basic VM Dashboard",
  onCopyFailure,
  onCopySuccess,
  mockDataDiagnostics = [],
  serviceFilters: controlledServiceFilters,
  onServiceFiltersChange,
}) {
  const [copyFlash, setCopyFlash] = useState(false);
  const [copyJsonFlash, setCopyJsonFlash] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showHelp, setShowHelp] = useState(false);
  const [showMockDiagnostics, setShowMockDiagnostics] = useState(false);
  const [showServiceFilters, setShowServiceFilters] = useState(false);
  const [internalServiceFilters, setInternalServiceFilters] = useState({});
  const [serviceFilterCursor, setServiceFilterCursor] = useState(0);
  const [showAllServices, setShowAllServices] = useState(false);
  const [serviceSortMode, setServiceSortMode] = useState("name-asc");
  const copyFlashTimeoutRef = useRef(null);
  const copyJsonFlashTimeoutRef = useRef(null);
  const pendingServiceModalRef = useRef(null);
  const pendingServiceFilterRef = useRef(null);
  const allServicesModalRef = useRef(null);
  const serviceFiltersModalRef = useRef(null);
  const mockDiagnosticsModalRef = useRef(null);
  const serviceFilters = controlledServiceFilters ?? internalServiceFilters;
  const setServiceFilters = useCallback(
    (updater) => {
      const nextFilters =
        typeof updater === "function" ? updater(serviceFilters) : updater;
      if (onServiceFiltersChange) {
        onServiceFiltersChange(nextFilters);
      } else {
        setInternalServiceFilters(nextFilters);
      }
    },
    [serviceFilters, onServiceFiltersChange]
  );

  const serviceStats = useMemo(
    () => ({
      total: dashboard.services?.length || 0,
      healthy: dashboard.services?.filter((service) => service.status === "healthy").length || 0,
      warning: dashboard.services?.filter((service) => service.status === "warning").length || 0,
      critical: dashboard.services?.filter((service) => service.status === "critical").length || 0,
    }),
    [dashboard.services]
  );
  const hasIssues = serviceStats.critical > 0 || serviceStats.warning > 0;
  const hasMockData = mockDataDiagnostics.length > 0;
  const systemResources = dashboard.systemResources || {};
  const memory = systemResources.memory || {};
  const disk = systemResources.disk || {};
  const cpu = systemResources.cpu || {};
  const cpuRaw = dashboard.summaryCards?.find((card) => card.label === "CPU")?.value;
  const memRaw = dashboard.summaryCards?.find((card) => card.label === "Memory")?.value;
  const diskRaw = dashboard.summaryCards?.find((card) => card.label === "Disk")?.value;

  const serviceFilterSections = [
    {
      key: "name",
      label: "NAME",
      options: getUniqueOptions(dashboard.services || [], (service) => service.label).map((value) => ({
        value,
        label: value,
      })),
    },
    {
      key: "status",
      label: "STATUS",
      options: getUniqueOptions(dashboard.services || [], (service) => service.status).map((value) => ({
        value,
        label: value,
      })),
    },
  ];
  const serviceFilterItems = [
    { kind: "clear", label: "CLEAR FILTERS" },
    ...serviceFilterSections.flatMap((section) =>
      section.options.map((option, rowIndex) => ({
        kind: "option",
        key: section.key,
        group: section.label,
        value: option.value,
        label: option.label,
        columnIndex: serviceFilterSections.findIndex((item) => item.key === section.key),
        rowIndex,
      }))
    ),
  ];
  const getServiceFilterItemIndex = useCallback(
    (columnIndex, rowIndex) => {
      const column = serviceFilterSections[columnIndex];
      if (!column || !column.options.length) return serviceFilterCursor;

      const clampedRow = Math.min(rowIndex, column.options.length - 1);
      const option = column.options[clampedRow];

      return serviceFilterItems.findIndex(
        (item) =>
          item.kind === "option" &&
          item.key === column.key &&
          item.value === option.value
      );
    },
    [serviceFilterCursor, serviceFilterItems, serviceFilterSections]
  );

  const filteredServices = applyOptionFilters(
    dashboard.services || [],
    serviceFilters,
    SERVICE_FILTER_ACCESSORS
  );
  const sortedServices = sortServices(filteredServices, serviceSortMode);
  const visibleServices = sortedServices.slice(0, serviceLimit);
  const serviceSortLabel = getMode(serviceSortMode, SERVICE_SORT_MODES).label;
  const hasActiveServiceFilters = hasActiveFilters(serviceFilters);
  const currentFilteredServiceCount = hasActiveServiceFilters ? filteredServices.length : 0;

  const copySnapshot = useCallback(async () => {
    const snapshot = buildTextSnapshot({
      dashboard,
      dashboardName,
      tagline,
      lastRefresh,
      serviceLimit,
    });

    try {
      await writeClipboardText(snapshot);
      onCopySuccess?.("Dashboard snapshot copied to clipboard.");
      if (copyFlashTimeoutRef.current) clearTimeout(copyFlashTimeoutRef.current);
      setCopyFlash(true);
      copyFlashTimeoutRef.current = setTimeout(() => {
        setCopyFlash(false);
        copyFlashTimeoutRef.current = null;
      }, 2000);
    } catch (error) {
      console.error("Failed to copy snapshot:", error);
      onCopyFailure?.(snapshot, "dashboard snapshot");
    }
  }, [dashboard, dashboardName, lastRefresh, onCopyFailure, onCopySuccess, serviceLimit, tagline]);

  const copyJsonSnapshot = useCallback(async () => {
    const snapshot = buildJsonSnapshot({
      dashboard,
      dashboardName,
      tagline,
      lastRefresh,
    });

    try {
      await writeClipboardText(snapshot);
      onCopySuccess?.("JSON payload copied to clipboard.");
      if (copyJsonFlashTimeoutRef.current) clearTimeout(copyJsonFlashTimeoutRef.current);
      setCopyJsonFlash(true);
      copyJsonFlashTimeoutRef.current = setTimeout(() => {
        setCopyJsonFlash(false);
        copyJsonFlashTimeoutRef.current = null;
      }, 2000);
    } catch (error) {
      console.error("Failed to copy JSON snapshot:", error);
      onCopyFailure?.(snapshot, "JSON payload");
    }
  }, [dashboard, dashboardName, lastRefresh, onCopyFailure, onCopySuccess, tagline]);

  const toggleServiceSort = useCallback(() => {
    setServiceSortMode((current) => cycleMode(current, SERVICE_SORT_MODES));
  }, []);

  useEffect(() => {
    return () => {
      if (copyFlashTimeoutRef.current) clearTimeout(copyFlashTimeoutRef.current);
      if (copyJsonFlashTimeoutRef.current) clearTimeout(copyJsonFlashTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!hasMockData) setShowMockDiagnostics(false);
  }, [hasMockData]);

  useEffect(() => {
    setServiceFilterCursor((current) =>
      Math.min(current, Math.max(serviceFilterItems.length - 1, 0))
    );
  }, [serviceFilterItems.length]);

  useEffect(() => {
    const activeModal =
      (showMockDiagnostics && mockDiagnosticsModalRef.current) ||
      (showServiceFilters && serviceFiltersModalRef.current) ||
      (showAllServices && allServicesModalRef.current);

    if (!activeModal) return undefined;

    const frame = requestAnimationFrame(() => {
      activeModal.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [showMockDiagnostics, showServiceFilters, showAllServices]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      const isTextInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isTextInput && event.key !== "Escape") return;

      if (showMockDiagnostics) {
        if (event.key === "Escape") {
          event.preventDefault();
          setShowMockDiagnostics(false);
        }
        return;
      }

      if (showServiceFilters) {
        if (event.key === "Escape") {
          event.preventDefault();
          setShowServiceFilters(false);
          return;
        }

        if (event.key === "Backspace" || event.key === "Delete") {
          event.preventDefault();
          setServiceFilterCursor(0);
          setServiceFilters({});
          return;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          setServiceFilterCursor((current) => {
            const item = serviceFilterItems[current];
            if (!item || item.kind === "clear") return serviceFilterItems.length > 1 ? 1 : 0;
            const nextIndex = getServiceFilterItemIndex(item.columnIndex, item.rowIndex + 1);
            return nextIndex >= 0 ? nextIndex : current;
          });
          return;
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          setServiceFilterCursor((current) => {
            const item = serviceFilterItems[current];
            if (!item || item.kind === "clear") return 0;
            if (item.rowIndex === 0) return 0;
            const nextIndex = getServiceFilterItemIndex(item.columnIndex, item.rowIndex - 1);
            return nextIndex >= 0 ? nextIndex : current;
          });
          return;
        }

        if (event.key === "ArrowRight") {
          event.preventDefault();
          setServiceFilterCursor((current) => {
            const item = serviceFilterItems[current];
            if (!item || item.kind === "clear") return serviceFilterItems.length > 1 ? 1 : 0;
            const nextColumn = Math.min(item.columnIndex + 1, serviceFilterSections.length - 1);
            const nextIndex = getServiceFilterItemIndex(nextColumn, item.rowIndex);
            return nextIndex >= 0 ? nextIndex : current;
          });
          return;
        }

        if (event.key === "ArrowLeft") {
          event.preventDefault();
          setServiceFilterCursor((current) => {
            const item = serviceFilterItems[current];
            if (!item || item.kind === "clear") return 0;
            const nextColumn = Math.max(item.columnIndex - 1, 0);
            const nextIndex = getServiceFilterItemIndex(nextColumn, item.rowIndex);
            return nextIndex >= 0 ? nextIndex : current;
          });
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          const item = serviceFilterItems[serviceFilterCursor];
          if (!item) return;
          if (item.kind === "clear") {
            setServiceFilters({});
          } else {
            setServiceFilters((current) => toggleFilterValue(current, item.key, item.value));
          }
          return;
        }

        return;
      }

      if ((event.key === "s" || event.key === "S") && event.repeat) return;
      if ((event.key === "f" || event.key === "F") && event.repeat) return;
      if ((event.key === "h" || event.key === "H") && event.repeat) return;

      if (event.key === "Escape") {
        if (showAllServices) setShowAllServices(false);
        else onExitTextDash?.();
      } else if (event.key === "c" || event.key === "C") {
        copySnapshot();
      } else if (event.key === "j" || event.key === "J") {
        copyJsonSnapshot();
      } else if (event.key === "h" || event.key === "H") {
        setShowHelp((current) => !current);
      } else if (event.key === "b" || event.key === "B") {
        onExitTextDash?.();
      } else if (event.key === "s" || event.key === "S") {
        if (pendingServiceFilterRef.current) {
          clearTimeout(pendingServiceFilterRef.current);
          pendingServiceFilterRef.current = null;
          setShowServiceFilters(true);
          return;
        }

        if (pendingServiceModalRef.current) {
          clearTimeout(pendingServiceModalRef.current);
          pendingServiceModalRef.current = null;
          setShowAllServices(true);
          return;
        }

        pendingServiceModalRef.current = setTimeout(() => {
          toggleServiceSort();
          pendingServiceModalRef.current = null;
        }, 240);
      } else if (event.key === "f" || event.key === "F") {
        if (pendingServiceFilterRef.current) return;
        pendingServiceFilterRef.current = setTimeout(() => {
          pendingServiceFilterRef.current = null;
        }, 240);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (pendingServiceModalRef.current) {
        clearTimeout(pendingServiceModalRef.current);
        pendingServiceModalRef.current = null;
      }
      if (pendingServiceFilterRef.current) {
        clearTimeout(pendingServiceFilterRef.current);
        pendingServiceFilterRef.current = null;
      }
    };
  }, [
    copyJsonSnapshot,
    copySnapshot,
    getServiceFilterItemIndex,
    onExitTextDash,
    serviceFilterCursor,
    serviceFilterItems,
    serviceFilterSections.length,
    showAllServices,
    showMockDiagnostics,
    showServiceFilters,
    toggleServiceSort,
  ]);

  useEffect(() => {
    const interval = setInterval(() => setLastRefresh(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-black p-3 font-mono text-white md:p-6">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_30rem),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_34rem),linear-gradient(135deg,rgba(15,23,42,0.65),rgba(2,6,23,0.95))]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.035),transparent_1px)] bg-[size:18px_18px] opacity-40" />
      <div className="relative mx-auto w-full max-w-none min-w-0">
        <div className="mb-4 rounded border border-cyan-400/25 bg-slate-950/85 p-3 shadow-xl shadow-cyan-950/20">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-xl font-bold tracking-tight">{dashboardName}</div>

              {tagline && <div className="mt-0.5 text-xs text-white/40">{tagline}</div>}

              <div className="mt-1 text-xs text-white/40">
                {new Date().toLocaleDateString()} | {lastRefresh.toLocaleTimeString()} | auto-refresh: 30s
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 text-xs">
              {hasMockData && (
                <motion.button
                  onClick={() => setShowMockDiagnostics(true)}
                  animate={{
                    boxShadow: [
                      "0 0 0px rgba(251,191,36,0.20)",
                      "0 0 12px rgba(251,191,36,0.60)",
                      "0 0 0px rgba(251,191,36,0.20)",
                    ],
                    borderColor: [
                      "rgba(251,191,36,0.35)",
                      "rgba(251,191,36,0.90)",
                      "rgba(251,191,36,0.35)",
                    ],
                  }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  className="rounded border px-2 py-1 text-amber-300 hover:bg-amber-500/10"
                >
                  [WARNING]
                </motion.button>
              )}

              <button
                onClick={copySnapshot}
                className={`rounded border px-2 py-1 hover:bg-cyan-400/10 ${
                  copyFlash
                    ? "border-cyan-400/60 text-cyan-300 shadow-[0_0_8px_theme(colors.cyan.400)]"
                    : "border-cyan-400/25"
                }`}
              >
                [C] {copyFlash ? "COPIED" : "COPY"}
              </button>

              <button
                onClick={copyJsonSnapshot}
                className={`rounded border px-2 py-1 hover:bg-cyan-400/10 ${
                  copyJsonFlash
                    ? "border-cyan-400/60 text-cyan-300 shadow-[0_0_8px_theme(colors.cyan.400)]"
                    : "border-cyan-400/25"
                }`}
              >
                [J] {copyJsonFlash ? "COPIED" : "COPY JSON"}
              </button>

              <button
                onClick={() => setShowHelp(!showHelp)}
                className="rounded border border-cyan-400/25 px-2 py-1 hover:bg-cyan-400/10"
              >
                [H] HELP
              </button>

              <button
                onClick={onExitTextDash}
                className="rounded border border-cyan-400/25 px-2 py-1 hover:bg-cyan-400/10"
              >
                [B] BASIC
              </button>

              <button
                onClick={onExitTextDash}
                className="rounded border border-cyan-400/25 px-2 py-1 hover:bg-cyan-400/10"
              >
                [Esc] EXIT
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showMockDiagnostics && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 font-mono text-white"
            >
              <motion.div
                ref={mockDiagnosticsModalRef}
                tabIndex={-1}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="w-full max-w-4xl border border-amber-400/40 bg-black shadow-2xl shadow-amber-950/40 outline-none"
              >
                <div className="flex items-center justify-between border-b border-amber-400/30 p-3">
                  <div className="text-sm font-bold text-amber-300">
                    THE CURRENT DASHBOARD IS USING MOCK OR FALLBACK DATA.
                  </div>
                  <button
                    onClick={() => setShowMockDiagnostics(false)}
                    className="border border-cyan-400/25 px-2 py-1 text-xs text-white/60 hover:bg-cyan-400/10 hover:text-red-300"
                  >
                    [Esc] CLOSE
                  </button>
                </div>

                <div className="max-h-[65vh] overflow-y-auto p-3 text-xs">
                  <div className="space-y-2">
                    {mockDataDiagnostics.map((item, index) => (
                      <div
                        key={`${item.section}-${index}`}
                        className="border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-2"
                      >
                        <div className="text-amber-200">! {item.section}</div>
                        {item.route && <div className="mt-1 font-mono text-white/50">{item.route}</div>}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 border border-amber-500/30 bg-amber-500/5 p-3 text-amber-100/90">
                    Incomplete deployment configuration, disconnected local API, or backend startup failures may be preventing live data retrieval. Verify the startup logs, Nginx config, and dashboard API service.
                  </div>
                </div>

                <div className="border-t border-cyan-400/25 p-2 text-center text-xs text-white/30">
                  Press Esc to close.
                </div>
              </motion.div>
            </motion.div>
          )}

          {showHelp && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 rounded border border-cyan-400/25 bg-slate-950/85 p-3 text-xs shadow-xl shadow-cyan-950/10"
            >
              <div className="mb-1 font-bold">KEYBOARD SHORTCUTS</div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                <div>Esc - Exit text mode</div>
                <div>B - Return to Basic dashboard</div>
                <div>C - Copy snapshot</div>
                <div>J - Copy JSON snapshot</div>
                <div>H - Toggle help</div>
                <div>S - Sort services</div>
                <div>FS - Filter services</div>
                <div>SS - View all services</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className={`mb-4 border-l-4 p-2 ${
            hasIssues ? "border-red-500 bg-red-500/5" : "border-white/40"
          }`}
        >
          {hasIssues
            ? `ALERT: ${serviceStats.critical} critical, ${serviceStats.warning} warning`
            : "STATUS: All systems operational"}
        </div>

        <div className="mb-4 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded border border-cyan-400/20 bg-slate-950/80 p-3 shadow-xl shadow-cyan-950/10">
            <div className="mb-2 text-xs uppercase tracking-[0.22em] text-cyan-300">Identity</div>

            <div className="space-y-1 text-sm">
              <div><span className="text-cyan-400">Project:</span> {dashboard.identity?.project || "N/A"}</div>
              <div><span className="text-cyan-400">Instance ID:</span> {dashboard.identity?.instanceId || "N/A"}</div>
              <div><span className="text-cyan-400">Instance Name:</span> {dashboard.identity?.instanceName || "N/A"}</div>
              <div><span className="text-cyan-400">Machine type:</span> {dashboard.identity?.machineType || "N/A"}</div>
            </div>
          </div>

          <div className="rounded border border-cyan-400/20 bg-slate-950/80 p-3 shadow-xl shadow-cyan-950/10">
            <div className="mb-2 text-xs uppercase tracking-[0.22em] text-cyan-300">Overview</div>

            <div className="space-y-1 text-sm">
              <div>
                <span className="text-cyan-400">CPU:</span> {formatMetric(cpuRaw)} |{" "}
                <span className="text-cyan-400">Cores:</span> {cpu.cores || "?"}
              </div>
              <div>
                <span className="text-cyan-400">Memory:</span> {formatMetric(memRaw)} |{" "}
                <span className="text-cyan-400">Total:</span> {formatBytes(memory.total)} |{" "}
                <span className="text-cyan-400">Avail:</span> {formatBytes(memory.available || memory.free)} |{" "}
                <span className="text-cyan-400">Used:</span> {formatBytes(memory.used)}
              </div>
              <div>
                <span className="text-cyan-400">Disk:</span> {formatMetric(diskRaw)} |{" "}
                <span className="text-cyan-400">Total:</span> {formatBytes(disk.total)} |{" "}
                <span className="text-cyan-400">Avail:</span> {formatBytes(disk.available)} |{" "}
                <span className="text-cyan-400">Used:</span> {formatBytes(disk.used)}
              </div>
              <div>
                <span className="text-cyan-400">Estimated Cost:</span> {getCostValue(dashboard)}/month
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded border border-cyan-400/20 bg-slate-950/80 p-3 shadow-xl shadow-cyan-950/10">
            <div className="mb-2 text-xs uppercase tracking-[0.22em] text-cyan-300">Network</div>

            <div className="space-y-1 text-sm">
              <div><span className="text-cyan-400">VPC:</span> {dashboard.network?.vpc || "N/A"}</div>
              <div><span className="text-cyan-400">Subnet:</span> {dashboard.network?.subnet || "N/A"}</div>
              <div><span className="text-cyan-400">Internal IP:</span> {dashboard.network?.internalIp || "N/A"}</div>
              <div><span className="text-cyan-400">External IP:</span> {dashboard.network?.externalIp || "N/A"}</div>
            </div>
          </div>

          <div className="rounded border border-cyan-400/20 bg-slate-950/80 p-3 shadow-xl shadow-cyan-950/10">
            <div className="mb-2 text-xs uppercase tracking-[0.22em] text-cyan-300">Location</div>

            <div className="space-y-1 text-sm">
              <div><span className="text-cyan-400">Region:</span> {dashboard.location?.region || "N/A"}</div>
              <div><span className="text-cyan-400">Zone:</span> {dashboard.location?.zone || "N/A"}</div>
              <div><span className="text-cyan-400">Uptime:</span> {dashboard.meta?.uptime || dashboard.location?.uptime || "N/A"}</div>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded border border-cyan-400/20 bg-slate-950/80 p-3 shadow-xl shadow-cyan-950/10">
          <div className="mb-2 text-xs uppercase tracking-[0.22em] text-cyan-300">Monitoring Endpoints</div>

          <div className="space-y-1 text-sm">
            {dashboard.monitoringEndpoints?.length ? (
              dashboard.monitoringEndpoints.map((endpoint, index) => (
                <div key={`${endpoint.name}-${index}`} className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-white">{endpoint.name}:</span>
                  <span className="text-xs text-white">{endpoint.url}</span>
                  <span className={endpoint.status === "up" ? "text-green-400" : "text-red-400"}>
                    [{endpoint.status}]
                  </span>
                </div>
              ))
            ) : (
              <div className="text-white/30">No endpoints configured</div>
            )}
          </div>
        </div>

        <div className="mb-4 rounded border border-cyan-400/20 bg-slate-950/80 p-3 shadow-xl shadow-cyan-950/10">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0 text-xs uppercase tracking-wide text-white/40">
              SERVICES ({Math.min(serviceLimit, serviceStats.total)} of {serviceStats.total}) |{" "}
              {serviceStats.healthy} healthy | {serviceStats.warning} warning | {serviceStats.critical} critical
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={toggleServiceSort}
                className="rounded border border-cyan-400/25 px-2 py-1 text-xs text-white/60 hover:bg-cyan-400/10 hover:text-cyan-300"
              >
                [S] SORT {serviceSortLabel}
              </button>
              <button
                onClick={() => setShowServiceFilters(true)}
                className={`rounded border px-2 py-1 text-xs hover:bg-cyan-400/10 hover:text-cyan-300 ${
                  hasActiveServiceFilters
                    ? "border-cyan-400 text-cyan-300"
                    : "border-cyan-400/25 text-white/60"
                }`}
              >
                [FS] FILTER
              </button>
              <button
                onClick={() => setShowAllServices(true)}
                className="rounded border border-cyan-400/25 px-2 py-1 text-xs text-white hover:bg-cyan-400/10 hover:text-cyan-300"
              >
                [SS] ALL SERVICES
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            {visibleServices.map((service) => (
              <div key={service.label} className="flex items-center gap-2">
                <span className={getServiceLabelClass(service.status)}>{service.label}</span>
                <span className={`${getServiceStatusClass(service.status)} text-xs`}>[{service.status}]</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 border-t border-cyan-400/20 pt-2 text-center text-xs text-white/30">
          {dashboardName}
        </div>
      </div>

      <AnimatePresence>
        {showAllServices && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-x-hidden bg-black/90 p-3 md:p-6"
          >
            <motion.div
              ref={allServicesModalRef}
              tabIndex={-1}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden border border-cyan-400/25 bg-black font-mono text-white shadow-2xl outline-none"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-400/25 p-3">
                <div>
                  <div className="text-sm font-bold text-white">ALL SERVICES</div>
                  <div className="text-xs text-white/40">
                    services: {serviceStats.total} | {serviceStats.healthy} healthy |{" "}
                    {serviceStats.warning} warning | {serviceStats.critical} critical
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    onClick={toggleServiceSort}
                    className="border border-cyan-400/25 px-2 py-1 text-white/60 hover:bg-cyan-400/10 hover:text-cyan-300"
                    title="Toggle service sort order"
                  >
                    [S] SORT {serviceSortLabel}
                  </button>
                  <button
                    onClick={() => setShowServiceFilters(true)}
                    className={`border px-2 py-1 hover:bg-cyan-400/10 hover:text-cyan-300 ${
                      hasActiveServiceFilters
                        ? "border-cyan-400 text-cyan-300"
                        : "border-cyan-400/25 text-white/60"
                    }`}
                  >
                    [FS] FILTER
                  </button>
                  <button
                    onClick={() => setShowAllServices(false)}
                    className="border border-cyan-400/25 px-2 py-1 text-white/60 hover:bg-cyan-400/10 hover:text-red-300"
                  >
                    [Esc] CLOSE
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 text-xs leading-relaxed">
                {sortedServices.length ? (
                  sortedServices.map((service) => (
                    <div
                      key={service.label}
                      className="grid grid-cols-1 gap-1 border-b border-white/5 py-1 sm:grid-cols-[minmax(10rem,1fr)_minmax(8rem,2fr)_7rem] sm:gap-2"
                    >
                      <span className={getServiceLabelClass(service.status)}>{service.label}</span>
                      <span className="break-all text-white/60">{service.value || "N/A"}</span>
                      <span className={getServiceStatusClass(service.status)}>[{service.status}]</span>
                    </div>
                  ))
                ) : (
                  <div className="text-white/30">No services available</div>
                )}
              </div>

              <div className="border-t border-cyan-400/25 p-2 text-center text-xs text-white/30">
                Press S to sort services. Press FS to filter services. Press Esc to close.
              </div>
            </motion.div>
          </motion.div>
        )}

        {showServiceFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 font-mono text-white"
          >
            <motion.div
              ref={serviceFiltersModalRef}
              tabIndex={-1}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="w-full max-w-4xl border border-cyan-400/25 bg-black shadow-2xl outline-none"
            >
              <div className="flex items-center justify-between border-b border-cyan-400/25 p-3">
                <div>
                  <div className="text-sm font-bold text-cyan-300">SERVICE FILTERS</div>
                  <div className="text-xs text-white/40">
                    loaded: {dashboard.services?.length || 0} | filtered:{" "}
                    {currentFilteredServiceCount}
                  </div>
                </div>
                <button
                  onClick={() => setShowServiceFilters(false)}
                  className="border border-cyan-400/25 px-2 py-1 text-xs text-white/60 hover:bg-cyan-400/10 hover:text-red-300"
                >
                  [Esc] CLOSE
                </button>
              </div>

              <div className="max-h-[65vh] overflow-y-auto p-3 text-xs">
                <button
                  onMouseEnter={() => setServiceFilterCursor(0)}
                  onClick={() => {
                    setServiceFilterCursor(0);
                    setServiceFilters({});
                  }}
                  className={`mb-3 grid w-full grid-cols-[1rem_1fr] gap-2 border border-red-500/30 px-2 py-2 text-left text-red-300 hover:bg-red-500/10 ${
                    serviceFilterCursor === 0 ? "bg-red-500/10" : ""
                  }`}
                >
                  <span>{serviceFilterCursor === 0 ? ">" : " "}</span>
                  <span>[DEL] or [Backspace] CLEAR FILTERS</span>
                </button>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {serviceFilterSections.map((section, columnIndex) => (
                    <div key={section.key} className="border border-cyan-400/20">
                      <div className="border-b border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-cyan-300">
                        {section.label}
                      </div>
                      <div className="p-1">
                        {section.options.length ? (
                          section.options.map((option, rowIndex) => {
                            const itemIndex = getServiceFilterItemIndex(columnIndex, rowIndex);
                            const selected = (serviceFilters[section.key] || []).includes(option.value);
                            const activeCursor = itemIndex === serviceFilterCursor;

                            return (
                              <button
                                key={`${section.key}-${option.value}`}
                                onMouseEnter={() => setServiceFilterCursor(itemIndex)}
                                onClick={() => {
                                  setServiceFilterCursor(itemIndex);
                                  setServiceFilters((current) =>
                                    toggleFilterValue(current, section.key, option.value)
                                  );
                                }}
                                className={`grid w-full grid-cols-[1rem_3rem_1fr] gap-2 px-2 py-1 text-left hover:bg-cyan-400/10 ${
                                  activeCursor ? "bg-white/10 text-cyan-300" : "text-white/70"
                                }`}
                              >
                                <span>{activeCursor ? ">" : " "}</span>
                                <span>{selected ? "[x]" : "[ ]"}</span>
                                <span className="break-all">{option.label}</span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-2 py-4 text-white/30">No options</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {serviceFilterItems.length <= 1 && (
                  <div className="px-2 py-4 text-white/30">No filter options available</div>
                )}
              </div>

              <div className="border-t border-cyan-400/25 p-2 text-center text-xs text-white/30">
                Arrow keys move by row and column. Space or Enter toggles. Delete or Backspace clears. Esc closes.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
