import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  applyOptionFilters,
  getUniqueOptions,
  hasActiveFilters,
  toggleFilterValue,
} from "./FilterOverlay";
import { getPaginatedMockLogs } from "../mockLogs";
import { generateDashboardJsonSnapshot, generateDashboardSnapshot } from "../utils/snapshot";
import { writeClipboardText } from "../utils/clipboard";
import { buildSystemLogsSnapshot } from "../utils/widgetSnapshots";

// Helper: format bytes (MB → GB/MB)
const formatBytes = (mb) => {
  if (!mb && mb !== 0) return "N/A";
  if (mb > 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${Math.round(mb)} MB`;
};

const getLogTime = (log) =>
  log?.time || log?.timestamp || log?.datetime || log?.createdAt || "";

const formatLocalDateTime = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const getLogDisplayTime = (log) => {
  const raw = getLogTime(log);
  if (typeof raw === "number") return formatLocalDateTime(new Date(raw));

  const value = String(raw || "").trim();
  if (!value) return "";

  const parsedDate = Date.parse(value);
  if (!Number.isNaN(parsedDate)) return formatLocalDateTime(new Date(parsedDate));

  return value;
};

const getLogLevel = (log) => (log?.level || log?.type || "INFO").toUpperCase();

const getLogSource = (log) => log?.source || log?.scope || "system";

const getLogMessage = (log) => log?.message || log?.status || "";

const getLogLineKey = (log, index) =>
  `${getLogTime(log)}|${getLogLevel(log)}|${getLogSource(log)}|${getLogMessage(log)}|${index}`;

const LOG_LEVEL_SORT_ORDER = {
  ERROR: 0,
  WARN: 1,
  WARNING: 1,
  INFO: 2,
  DEBUG: 3,
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

const getLogSortValue = (log) => {
  const raw = getLogTime(log);

  if (typeof raw === "number") return raw;

  const value = String(raw).trim();
  if (!value) return 0;

  const parsedDate = Date.parse(value);
  if (!Number.isNaN(parsedDate)) return parsedDate;

  const timeMatch = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?$/);
  if (!timeMatch) return 0;

  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const seconds = Number(timeMatch[3] || 0);
  const millis = Number((timeMatch[4] || "0").padEnd(3, "0").slice(0, 3));

  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
};

const LOG_SORT_MODES = [
  { key: "name-desc", label: "TIME NEWEST", field: "name", direction: "desc" },
  { key: "name-asc", label: "TIME OLDEST", field: "name", direction: "asc" },
  { key: "level-asc", label: "LEVEL ERROR-DEBUG", field: "level", direction: "asc" },
  { key: "level-desc", label: "LEVEL DEBUG-ERROR", field: "level", direction: "desc" },
];

const SERVICE_SORT_MODES = [
  { key: "name-asc", label: "NAME A-Z", field: "name", direction: "asc" },
  { key: "name-desc", label: "NAME Z-A", field: "name", direction: "desc" },
  { key: "status-asc", label: "STATUS HEALTHY-CRITICAL", field: "status", direction: "asc" },
  { key: "status-desc", label: "STATUS CRITICAL-HEALTHY", field: "status", direction: "desc" },
];

const cycleMode = (current, modes) => {
  const currentIndex = modes.findIndex((mode) => mode.key === current);
  return modes[(currentIndex + 1) % modes.length].key;
};

const getMode = (key, modes) => modes.find((mode) => mode.key === key) || modes[0];

const sortLogs = (logs, modeKey) => {
  const mode = getMode(modeKey, LOG_SORT_MODES);
  return [...(logs || [])]
    .map((log, index) => ({ log, index }))
    .sort((a, b) => {
      let result;

      if (mode.field === "level") {
        result =
          (LOG_LEVEL_SORT_ORDER[getLogLevel(a.log)] ?? 99) -
          (LOG_LEVEL_SORT_ORDER[getLogLevel(b.log)] ?? 99);
      } else if (mode.field === "source") {
        result = getLogSource(a.log).localeCompare(getLogSource(b.log), undefined, {
          sensitivity: "base",
        });
      } else {
        result = getLogSortValue(a.log) - getLogSortValue(b.log);
      }

      const orderedResult = mode.direction === "asc" ? result : -result;
      return orderedResult || a.index - b.index;
    })
    .map(({ log }) => log);
};

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

const getLevelClass = (level) => {
  if (level === "ERROR") return "text-red-400";
  if (level === "WARN" || level === "WARNING") return "text-yellow-300";
  if (level === "INFO") return "text-cyan-300";
  return "text-white/60";
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

const LOG_SOURCE_CLASS = "break-all text-[#7f95a8]";

const getRequestedMinutes = (value) => {
  const parsed = parseInt(String(value).trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
};

const LOG_PREVIEW_LIMIT = 30;
const LOG_FILTER_ACCESSORS = {
  level: getLogLevel,
  source: getLogSource,
};
const SERVICE_FILTER_ACCESSORS = {
  name: (service) => service.label,
  status: (service) => service.status,
};

export default function TextDashboard({
  dashboard,
  tagline = "",
  onExitTextDash,
  logLimit,
  serviceLimit,
  dashboardName = "DevSecOps Dashboard",
  flashTitle = false,
  onOpenFinOps,
  onCopyFailure,
  onCopySuccess,
  authHeaders = {},
  mockDataDiagnostics = [],
  onSignOut,
  onSignOutEverywhere,
}) {
  const [copyFlash, setCopyFlash] = useState(false);
  const [copyJsonFlash, setCopyJsonFlash] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showHelp, setShowHelp] = useState(false);
  const [showMockDiagnostics, setShowMockDiagnostics] = useState(false);
  const [isTitleFlashing, setIsTitleFlashing] = useState(false);
  const [showLiveLogs, setShowLiveLogs] = useState(false);
  const [liveLogs, setLiveLogs] = useState([]);
  const [liveLogError, setLiveLogError] = useState(null);
  const [liveLogLoading, setLiveLogLoading] = useState(false);
  const [liveLogMinutes, setLiveLogMinutes] = useState("10");
  const [logSortMode, setLogSortMode] = useState("name-desc");
  const [liveLogUpdatedAt, setLiveLogUpdatedAt] = useState(null);
  const [showLogFilters, setShowLogFilters] = useState(false);
  const [showServiceFilters, setShowServiceFilters] = useState(false);
  const [logFilters, setLogFilters] = useState({});
  const [serviceFilters, setServiceFilters] = useState({});
  const [logFilterCursor, setLogFilterCursor] = useState(0);
  const [serviceFilterCursor, setServiceFilterCursor] = useState(0);
  const [showAllServices, setShowAllServices] = useState(false);
  const [serviceSortMode, setServiceSortMode] = useState("name-asc");
  const flashTimeoutRef = useRef(null);
  const copyFlashTimeoutRef = useRef(null);
  const copyJsonFlashTimeoutRef = useRef(null);
  const pendingLiveLogOpenRef = useRef(null);
  const pendingServiceModalRef = useRef(null);
  const pendingLogFilterRef = useRef(null);
  const allServicesModalRef = useRef(null);
  const liveLogsModalRef = useRef(null);
  const logFiltersModalRef = useRef(null);
  const serviceFiltersModalRef = useRef(null);
  const mockDiagnosticsModalRef = useRef(null);

  // New refs for "SO" and "SE" combo
  const pendingSignOutRef = useRef(null);
  const pendingSignOutEverywhereRef = useRef(null);

  // Flash effect
  useEffect(() => {
    if (!flashTitle) return undefined;

    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setIsTitleFlashing(true);
    flashTimeoutRef.current = setTimeout(() => {
      setIsTitleFlashing(false);
      flashTimeoutRef.current = null;
    }, 300);

    return undefined;
  }, [flashTitle]);

  // Service stats
  const serviceStats = {
    total: dashboard.services?.length || 0,
    healthy: dashboard.services?.filter((s) => s.status === "healthy").length || 0,
    warning: dashboard.services?.filter((s) => s.status === "warning").length || 0,
    critical: dashboard.services?.filter((s) => s.status === "critical").length || 0,
  };

  const hasIssues = serviceStats.critical > 0 || serviceStats.warning > 0;
  const hasMockData = mockDataDiagnostics.length > 0;

  const formatMetric = (value) => {
    if (!value && value !== 0) return "N/A";
    const cleaned = value.toString().replace(/%$/, "");
    return `${cleaned}%`;
  };

  const getCostValue = () => {
    const costCard = dashboard.summaryCards?.find(
      (c) => c.label === "Estimated Cost" || c.label === "Cost"
    );
    let raw = costCard?.value;

    if (!raw && raw !== 0) return "N/A";
    if (typeof raw === "number") return `$${raw.toFixed(2)}`;
    if (typeof raw === "string") {
      if (raw.startsWith("$")) return raw;
      const numeric = parseFloat(raw.replace(/[^0-9.-]/g, ""));
      if (!isNaN(numeric)) return `$${numeric.toFixed(2)}`;
      return raw;
    }

    return "N/A";
  };

  const loadAvg =
    dashboard.location?.loadAvg ||
    dashboard.systemResources?.cpu?.loadAvg ||
    dashboard.systemResources?.load5 ||
    "0.00";

  const systemResources = dashboard.systemResources || {};
  const memory = systemResources.memory || {
    total: 0,
    used: 0,
    free: 0,
    available: 0,
  };
  const disk = systemResources.disk || { total: 0, used: 0, available: 0 };
  const cpu = systemResources.cpu || {
    usage: 0,
    cores: null,
    frequency: null,
    loadAvg: null,
  };

  const fetchLiveLogs = useCallback(async () => {
    const minutes = getRequestedMinutes(liveLogMinutes);
    setLiveLogLoading(true);
    setLiveLogError(null);

    try {
      const params = new URLSearchParams({
        limit: "200",
        offset: "0",
        minutes: String(minutes),
        _: String(Date.now()),
      });
      const response = await fetch(`/api/logs?${params.toString()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          ...authHeaders,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const fetchedLogs = Array.isArray(data.logs) ? data.logs : [];
      if (fetchedLogs.length) {
        setLiveLogs(fetchedLogs);
      } else {
        const fallback = getPaginatedMockLogs(200, 0, minutes);
        setLiveLogs(fallback.logs);
      }
      setLiveLogUpdatedAt(new Date());
    } catch (error) {
      setLiveLogError(error.message || "Unable to fetch logs");
      setLiveLogs(getPaginatedMockLogs(200, 0, minutes).logs);
    } finally {
      setLiveLogLoading(false);
    }
  }, [authHeaders, dashboard.logs, liveLogMinutes]);

  const openLiveLogs = useCallback(() => {
    setLogFilters({});
    setShowLiveLogs(true);
    fetchLiveLogs();
  }, [fetchLiveLogs]);

  const refreshLiveLogs = useCallback(() => {
    setLogFilters({});
    fetchLiveLogs();
  }, [fetchLiveLogs]);

  const toggleLiveLogSort = useCallback(() => {
    setLogSortMode((current) => cycleMode(current, LOG_SORT_MODES));
  }, []);

  const toggleServiceSort = useCallback(() => {
    setServiceSortMode((current) => cycleMode(current, SERVICE_SORT_MODES));
  }, []);

  const currentFilterLogs = showLiveLogs ? liveLogs : dashboard.logs || [];
  const logFilterSections = [
    {
      key: "level",
      label: "LEVEL",
      options: getUniqueOptions(currentFilterLogs, getLogLevel).map((value) => ({
        value,
        label: value,
      })),
    },
    {
      key: "source",
      label: "SOURCE",
      options: getUniqueOptions(currentFilterLogs, getLogSource).map((value) => ({
        value,
        label: value,
      })),
    },
  ];
  const logFilterItems = [
    { kind: "clear", label: "CLEAR FILTERS" },
    ...logFilterSections.flatMap((section) =>
      section.options.map((option, rowIndex) => ({
        kind: "option",
        key: section.key,
        group: section.label,
        value: option.value,
        label: option.label,
        columnIndex: logFilterSections.findIndex((item) => item.key === section.key),
        rowIndex,
      }))
    ),
  ];
  const getFilterItemIndex = (columnIndex, rowIndex) => {
    const column = logFilterSections[columnIndex];
    if (!column || !column.options.length) return logFilterCursor;

    const clampedRow = Math.min(rowIndex, column.options.length - 1);
    const option = column.options[clampedRow];

    return logFilterItems.findIndex(
      (item) =>
        item.kind === "option" &&
        item.key === column.key &&
        item.value === option.value
    );
  };
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
  const getServiceFilterItemIndex = (columnIndex, rowIndex) => {
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
  };

  useEffect(() => {
    setLogFilterCursor((current) =>
      Math.min(current, Math.max(logFilterItems.length - 1, 0))
    );
  }, [logFilterItems.length]);

  useEffect(() => {
    setServiceFilterCursor((current) =>
      Math.min(current, Math.max(serviceFilterItems.length - 1, 0))
    );
  }, [serviceFilterItems.length]);

  const copySnapshot = useCallback(async () => {
    const snapshot = generateDashboardSnapshot({
      mode: "devsecops",
      dashboard,
      lastRefresh,
      logLimit,
      serviceLimit,
      dashboardName,
      tagline,
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
  }, [dashboard, lastRefresh, logLimit, serviceLimit, dashboardName, tagline, onCopyFailure, onCopySuccess]);

  const copyJsonSnapshot = useCallback(async () => {
    const payload = generateDashboardJsonSnapshot({
      mode: "devsecops",
      dashboard,
      lastRefresh,
      logLimit,
      serviceLimit,
      dashboardName,
      tagline,
    });
    const snapshot = JSON.stringify(payload, null, 2);

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
  }, [dashboard, lastRefresh, logLimit, serviceLimit, dashboardName, tagline, onCopyFailure, onCopySuccess]);

  const copyLiveLogsSnapshot = useCallback(async () => {
    const currentFilteredLogs = applyOptionFilters(liveLogs, logFilters, LOG_FILTER_ACCESSORS);
    const currentSortedLogs = sortLogs(currentFilteredLogs, logSortMode);
    const snapshot = buildSystemLogsSnapshot(currentSortedLogs);

    try {
      await writeClipboardText(snapshot);
      onCopySuccess?.("Logs snapshot copied to clipboard.");
    } catch (error) {
      console.error("Failed to copy logs snapshot:", error);
      onCopyFailure?.(snapshot, "System Logs snapshot");
    }
  }, [liveLogs, logFilters, logSortMode, onCopyFailure, onCopySuccess]);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      if (copyFlashTimeoutRef.current) clearTimeout(copyFlashTimeoutRef.current);
      if (copyJsonFlashTimeoutRef.current) clearTimeout(copyJsonFlashTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!hasMockData) setShowMockDiagnostics(false);
  }, [hasMockData]);

  useEffect(() => {
    const activeModal =
      (showMockDiagnostics && mockDiagnosticsModalRef.current) ||
      (showLogFilters && logFiltersModalRef.current) ||
      (showServiceFilters && serviceFiltersModalRef.current) ||
      (showLiveLogs && liveLogsModalRef.current) ||
      (showAllServices && allServicesModalRef.current);

    if (!activeModal) return undefined;

    const frame = requestAnimationFrame(() => {
      activeModal.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [showMockDiagnostics, showLogFilters, showServiceFilters, showLiveLogs, showAllServices]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
      const isTextInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isTextInput && e.key !== "Escape") {
        return;
      }

      if (showMockDiagnostics) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowMockDiagnostics(false);
        }
        return;
      }

      if (showServiceFilters) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowServiceFilters(false);
          return;
        }

        if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          setServiceFilterCursor(0);
          setServiceFilters({});
          return;
        }

        if (e.key === "ArrowDown") {
          e.preventDefault();
          setServiceFilterCursor((current) => {
            const item = serviceFilterItems[current];
            if (!item || item.kind === "clear") {
              return serviceFilterItems.length > 1 ? 1 : 0;
            }

            const nextIndex = getServiceFilterItemIndex(item.columnIndex, item.rowIndex + 1);
            return nextIndex >= 0 ? nextIndex : current;
          });
          return;
        }

        if (e.key === "ArrowUp") {
          e.preventDefault();
          setServiceFilterCursor((current) => {
            const item = serviceFilterItems[current];
            if (!item || item.kind === "clear") return 0;
            if (item.rowIndex === 0) return 0;

            const nextIndex = getServiceFilterItemIndex(item.columnIndex, item.rowIndex - 1);
            return nextIndex >= 0 ? nextIndex : current;
          });
          return;
        }

        if (e.key === "ArrowRight") {
          e.preventDefault();
          setServiceFilterCursor((current) => {
            const item = serviceFilterItems[current];
            if (!item || item.kind === "clear") {
              return serviceFilterItems.length > 1 ? 1 : 0;
            }

            const nextColumn = Math.min(item.columnIndex + 1, serviceFilterSections.length - 1);
            const nextIndex = getServiceFilterItemIndex(nextColumn, item.rowIndex);
            return nextIndex >= 0 ? nextIndex : current;
          });
          return;
        }

        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setServiceFilterCursor((current) => {
            const item = serviceFilterItems[current];
            if (!item || item.kind === "clear") return 0;

            const nextColumn = Math.max(item.columnIndex - 1, 0);
            const nextIndex = getServiceFilterItemIndex(nextColumn, item.rowIndex);
            return nextIndex >= 0 ? nextIndex : current;
          });
          return;
        }

        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
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

      if (showLogFilters) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowLogFilters(false);
          return;
        }

        if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          setLogFilterCursor(0);
          setLogFilters({});
          return;
        }

        if (e.key === "ArrowDown") {
          e.preventDefault();
          setLogFilterCursor((current) => {
            const item = logFilterItems[current];
            if (!item || item.kind === "clear") {
              return logFilterItems.length > 1 ? 1 : 0;
            }

            const nextIndex = getFilterItemIndex(item.columnIndex, item.rowIndex + 1);
            return nextIndex >= 0 ? nextIndex : current;
          });
          return;
        }

        if (e.key === "ArrowUp") {
          e.preventDefault();
          setLogFilterCursor((current) => {
            const item = logFilterItems[current];
            if (!item || item.kind === "clear") return 0;
            if (item.rowIndex === 0) return 0;

            const nextIndex = getFilterItemIndex(item.columnIndex, item.rowIndex - 1);
            return nextIndex >= 0 ? nextIndex : current;
          });
          return;
        }

        if (e.key === "ArrowRight") {
          e.preventDefault();
          setLogFilterCursor((current) => {
            const item = logFilterItems[current];
            if (!item || item.kind === "clear") {
              return logFilterItems.length > 1 ? 1 : 0;
            }

            const nextColumn = Math.min(item.columnIndex + 1, logFilterSections.length - 1);
            const nextIndex = getFilterItemIndex(nextColumn, item.rowIndex);
            return nextIndex >= 0 ? nextIndex : current;
          });
          return;
        }

        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setLogFilterCursor((current) => {
            const item = logFilterItems[current];
            if (!item || item.kind === "clear") return 0;

            const nextColumn = Math.max(item.columnIndex - 1, 0);
            const nextIndex = getFilterItemIndex(nextColumn, item.rowIndex);
            return nextIndex >= 0 ? nextIndex : current;
          });
          return;
        }

        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const item = logFilterItems[logFilterCursor];
          if (!item) return;
          if (item.kind === "clear") {
            setLogFilters({});
          } else {
            setLogFilters((current) => toggleFilterValue(current, item.key, item.value));
          }
          return;
        }

        return;
      }

      if ((e.key === "h" || e.key === "H") && e.repeat) {
        return;
      }
      if ((e.key === "l" || e.key === "L") && e.repeat) {
        return;
      }
      if ((e.key === "s" || e.key === "S") && e.repeat) {
        return;
      }
      if ((e.key === "f" || e.key === "F") && e.repeat) {
        return;
      }

      if (e.key === "Escape") {
        if (showAllServices) setShowAllServices(false);
        else if (showLiveLogs) setShowLiveLogs(false);
        else onExitTextDash();
      }
      else if ((e.key === "r" || e.key === "R") && showLiveLogs) {
        refreshLiveLogs();
      }
      else if (e.key === "c" || e.key === "C") copySnapshot();
      else if (e.key === "j" || e.key === "J") copyJsonSnapshot();
      else if (e.key === "h" || e.key === "H") setShowHelp((prev) => !prev);
      else if (e.key === "f" || e.key === "F") {
        if (pendingLogFilterRef.current) {
          return;
        }

        pendingLogFilterRef.current = setTimeout(() => {
          pendingLogFilterRef.current = null;
          onOpenFinOps?.();
        }, 240);
      }
      else if (e.key === "l" || e.key === "L") {
        if (pendingLogFilterRef.current) {
          clearTimeout(pendingLogFilterRef.current);
          pendingLogFilterRef.current = null;
          setShowLogFilters(true);
          return;
        }

        if (pendingLiveLogOpenRef.current) {
          clearTimeout(pendingLiveLogOpenRef.current);
          pendingLiveLogOpenRef.current = null;
          openLiveLogs();
          return;
        }

        pendingLiveLogOpenRef.current = setTimeout(() => {
          toggleLiveLogSort();
          pendingLiveLogOpenRef.current = null;
        }, 240);
      }
      else if (e.key === "s" || e.key === "S") {
        // SO / SE combos handling
        if (pendingSignOutRef.current) {
          clearTimeout(pendingSignOutRef.current);
          pendingSignOutRef.current = null;
          onSignOut?.("dev");
          return;
        }
        if (pendingSignOutEverywhereRef.current) {
          clearTimeout(pendingSignOutEverywhereRef.current);
          pendingSignOutEverywhereRef.current = null;
          onSignOutEverywhere?.();
          return;
        }

        if (showLiveLogs && pendingLiveLogOpenRef.current) {
          clearTimeout(pendingLiveLogOpenRef.current);
          pendingLiveLogOpenRef.current = null;
          copyLiveLogsSnapshot();
          return;
        }

        if (pendingLogFilterRef.current) {
          clearTimeout(pendingLogFilterRef.current);
          pendingLogFilterRef.current = null;
          setShowServiceFilters(true);
          return;
        }

        if (pendingServiceModalRef.current) {
          clearTimeout(pendingServiceModalRef.current);
          pendingServiceModalRef.current = null;
          setShowAllServices(true);
          return;
        }

        // Start timer for combo detection (O or E)
        pendingServiceModalRef.current = setTimeout(() => {
          toggleServiceSort();
          pendingServiceModalRef.current = null;
        }, 240);
      }
      else if (e.key === "o" || e.key === "O") {
        // If we are waiting for a sign out combo, trigger sign out
        if (pendingServiceModalRef.current) {
          clearTimeout(pendingServiceModalRef.current);
          pendingServiceModalRef.current = null;
          // Set a small delay to ensure we don't also capture other keys
          pendingSignOutRef.current = setTimeout(() => {
            pendingSignOutRef.current = null;
            onSignOut?.("dev");
          }, 0);
        }
      }
      else if (e.key === "e" || e.key === "E") {
        if (pendingServiceModalRef.current) {
          clearTimeout(pendingServiceModalRef.current);
          pendingServiceModalRef.current = null;
          pendingSignOutEverywhereRef.current = setTimeout(() => {
            pendingSignOutEverywhereRef.current = null;
            onSignOutEverywhere?.();
          }, 0);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (pendingLiveLogOpenRef.current) {
        clearTimeout(pendingLiveLogOpenRef.current);
        pendingLiveLogOpenRef.current = null;
      }
      if (pendingServiceModalRef.current) {
        clearTimeout(pendingServiceModalRef.current);
        pendingServiceModalRef.current = null;
      }
      if (pendingLogFilterRef.current) {
        clearTimeout(pendingLogFilterRef.current);
        pendingLogFilterRef.current = null;
      }
      if (pendingSignOutRef.current) {
        clearTimeout(pendingSignOutRef.current);
        pendingSignOutRef.current = null;
      }
      if (pendingSignOutEverywhereRef.current) {
        clearTimeout(pendingSignOutEverywhereRef.current);
        pendingSignOutEverywhereRef.current = null;
      }
    };
  }, [
    copySnapshot,
    copyJsonSnapshot,
    copyLiveLogsSnapshot,
    logFilterCursor,
    logFilterItems,
    serviceFilterCursor,
    serviceFilterItems,
    onOpenFinOps,
    onExitTextDash,
    openLiveLogs,
    refreshLiveLogs,
    showAllServices,
    showLiveLogs,
    showLogFilters,
    showMockDiagnostics,
    showServiceFilters,
    toggleLiveLogSort,
    toggleServiceSort,
    onSignOut,
    onSignOutEverywhere,
  ]);

  useEffect(() => {
    if (!showLiveLogs) return undefined;

    const interval = setInterval(fetchLiveLogs, 5000);

    return () => clearInterval(interval);
  }, [fetchLiveLogs, showLiveLogs]);

  useEffect(() => {
    const interval = setInterval(() => setLastRefresh(new Date()), 60000);

    return () => clearInterval(interval);
  }, []);

  const cpuRaw = dashboard.summaryCards?.find((c) => c.label === "CPU")?.value;
  const memRaw = dashboard.summaryCards?.find((c) => c.label === "Memory")?.value;
  const diskRaw = dashboard.summaryCards?.find((c) => c.label === "Disk")?.value;
  const filteredPreviewLogs = applyOptionFilters(dashboard.logs || [], logFilters, LOG_FILTER_ACCESSORS);
  const sortedPreviewLogs = sortLogs(filteredPreviewLogs, logSortMode).slice(0, LOG_PREVIEW_LIMIT);
  const filteredLiveLogs = applyOptionFilters(liveLogs, logFilters, LOG_FILTER_ACCESSORS);
  const sortedLiveLogs = sortLogs(filteredLiveLogs, logSortMode);
  const filteredServices = applyOptionFilters(dashboard.services || [], serviceFilters, SERVICE_FILTER_ACCESSORS);
  const sortedServices = sortServices(filteredServices, serviceSortMode);
  const visibleServices = sortedServices.slice(0, serviceLimit);
  const logSortLabel = getMode(logSortMode, LOG_SORT_MODES).label;
  const serviceSortLabel = getMode(serviceSortMode, SERVICE_SORT_MODES).label;

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-black p-3 font-mono text-white md:p-6">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_30rem),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_34rem),linear-gradient(135deg,rgba(15,23,42,0.65),rgba(2,6,23,0.95))]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.035),transparent_1px)] bg-[size:18px_18px] opacity-40" />
      <div className="relative mx-auto w-full max-w-none min-w-0">
        <div className="mb-4 rounded border border-cyan-400/25 bg-slate-950/85 p-3 shadow-xl shadow-cyan-950/20">
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <div
                className={`text-xl font-bold tracking-tight transition-all duration-200 ${
                  isTitleFlashing
                    ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.85)]"
                    : ""
                }`}
              >
                {dashboardName}
              </div>

              {tagline && (
                <div className="text-xs text-white/40 mt-0.5">{tagline}</div>
              )}

              <div className="text-xs text-white/40 mt-1">
                {new Date().toLocaleDateString()} |{" "}
                {lastRefresh.toLocaleTimeString()} | auto-refresh: 10s
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
                  className="px-2 py-1 border rounded text-amber-300 hover:bg-amber-500/10"
                >
                  [WARNING]
                </motion.button>
              )}
              <button
                onClick={copySnapshot}
                className={`px-2 py-1 border rounded hover:bg-cyan-400/10 ${
                  copyFlash
                    ? "border-cyan-400/60 text-cyan-300 shadow-[0_0_8px_theme(colors.cyan.400)]"
                    : "border-cyan-400/25"
                }`}
              >
                [C] {copyFlash ? "COPIED" : "COPY"}
              </button>

              <button
                onClick={copyJsonSnapshot}
                className={`px-2 py-1 border rounded hover:bg-cyan-400/10 ${
                  copyJsonFlash
                    ? "border-cyan-400/60 text-cyan-300 shadow-[0_0_8px_theme(colors.cyan.400)]"
                    : "border-cyan-400/25"
                }`}
              >
                [J] {copyJsonFlash ? "COPIED" : "COPY JSON"}
              </button>

              <button
                onClick={() => setShowHelp(!showHelp)}
                className="px-2 py-1 border border-cyan-400/25 rounded hover:bg-cyan-400/10"
              >
                [H] HELP
              </button>

              <button
                onClick={() => onSignOut?.("dev")}
                className="px-2 py-1 border border-rose-300/40 rounded text-rose-200 hover:bg-rose-500/10"
              >
                [SO] SIGN OUT
              </button>

              <button
                onClick={onSignOutEverywhere}
                className="px-2 py-1 border border-rose-300/40 rounded text-rose-200 hover:bg-rose-500/10"
              >
                [SE] SIGN OUT EVERYWHERE
              </button>

              <button
                onClick={onExitTextDash}
                className="px-2 py-1 border border-cyan-400/25 rounded hover:bg-cyan-400/10"
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
                  <div>
                    <div className="text-sm font-bold text-amber-300">
                      THE CURRENT DASHBOARD IS USING MOCK OR FALLBACK DATA.
                    </div>
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
                        {item.route && (
                          <div className="mt-1 font-mono text-white/50">{item.route}</div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 border border-amber-500/30 bg-amber-500/5 p-3 text-amber-100/90">
                    Incomplete deployment configuration, missing environment variables, disconnected APIs, or backend startup failures may be preventing live data retrieval. Verify deployment settings, confirm service integrations, and restart or redeploy after resolving issues.
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
              <div className="font-bold mb-1">KEYBOARD SHORTCUTS</div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div>Esc - Exit text mode</div>
                <div>C - Copy snapshot</div>
                <div>J - Copy JSON snapshot</div>
                <div>H - Toggle help</div>
                <div>L - Sort logs</div>
                <div>FL - Filter logs</div>
                <div>LL - View all logs</div>
                <div>LS - Copy logs snapshot</div>
                <div>S - Sort services</div>
                <div>FS - Filter services</div>
                <div>SS - View all services</div>
                <div>SO - Sign out</div>
                <div>SE - Sign out everywhere</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className={`mb-4 p-2 border-l-4 ${
            hasIssues ? "border-red-500 bg-red-500/5" : "border-white/40"
          }`}
        >
          {hasIssues
            ? `ALERT: ${serviceStats.critical} critical, ${serviceStats.warning} warning`
            : "STATUS: All systems operational"}
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 mb-4 md:grid-cols-2">
          <div className="rounded border border-cyan-400/20 bg-slate-950/80 p-3 shadow-xl shadow-cyan-950/10">
            <div className="mb-2 text-xs uppercase tracking-[0.22em] text-cyan-300">
              Identity
            </div>

            <div className="space-y-1 text-sm">
              <div>
                <span className="text-cyan-400">Project:</span>{" "}
                {dashboard.identity?.project || "N/A"}
              </div>
              <div>
                <span className="text-cyan-400">Instance ID:</span>{" "}
                {dashboard.identity?.instanceId || "N/A"}
              </div>
              <div>
                <span className="text-cyan-400">Instance Name:</span>{" "}
                {dashboard.identity?.instanceName || "N/A"}
              </div>
              <div>
                <span className="text-cyan-400">Machine type:</span>{" "}
                {dashboard.identity?.machineType || "N/A"}
              </div>
            </div>
          </div>

          <div className="rounded border border-cyan-400/20 bg-slate-950/80 p-3 shadow-xl shadow-cyan-950/10">
            <div className="mb-2 text-xs uppercase tracking-[0.22em] text-cyan-300">
              Overview
            </div>

            <div className="space-y-1 text-sm">
              <div>
                <span className="text-cyan-400">CPU:</span>{" "}
                {formatMetric(cpuRaw)} |{" "}
                <span className="text-cyan-400">Cores:</span>{" "}
                {cpu.cores || "?"} |{" "}
                <span className="text-cyan-400">Load (1min):</span>{" "}
                {cpu.loadAvg || loadAvg || "?"}
              </div>

              <div>
                <span className="text-cyan-400">Memory:</span>{" "}
                {formatMetric(memRaw)} |{" "}
                <span className="text-cyan-400">Total:</span>{" "}
                {formatBytes(memory.total)} |{" "}
                <span className="text-cyan-400">Avail:</span>{" "}
                {formatBytes(memory.available || memory.free)} |{" "}
                <span className="text-cyan-400">Used:</span>{" "}
                {formatBytes(memory.used)}
              </div>

              <div>
                <span className="text-cyan-400">Disk:</span>{" "}
                {formatMetric(diskRaw)} |{" "}
                <span className="text-cyan-400">Total:</span>{" "}
                {formatBytes(disk.total)} |{" "}
                <span className="text-cyan-400">Avail:</span>{" "}
                {formatBytes(disk.available)} |{" "}
                <span className="text-cyan-400">Used:</span>{" "}
                {formatBytes(disk.used)}
              </div>

              <div>
                <span className="text-cyan-400">Estimated Cost:</span>{" "}
                {getCostValue()}/month
              </div>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 mb-4 md:grid-cols-2">
          <div className="rounded border border-cyan-400/20 bg-slate-950/80 p-3 shadow-xl shadow-cyan-950/10">
            <div className="mb-2 text-xs uppercase tracking-[0.22em] text-cyan-300">
              Network
            </div>

            <div className="space-y-1 text-sm">
              <div>
                <span className="text-cyan-400">VPC:</span>{" "}
                {dashboard.network?.vpc || "N/A"}
              </div>
              <div>
                <span className="text-cyan-400">Subnet:</span>{" "}
                {dashboard.network?.subnet || "N/A"}
              </div>
              <div>
                <span className="text-cyan-400">Internal IP:</span>{" "}
                {dashboard.network?.internalIp || "N/A"}
              </div>
              <div>
                <span className="text-cyan-400">External IP:</span>{" "}
                {dashboard.network?.externalIp || "N/A"}
              </div>
            </div>
          </div>

          <div className="rounded border border-cyan-400/20 bg-slate-950/80 p-3 shadow-xl shadow-cyan-950/10">
            <div className="mb-2 text-xs uppercase tracking-[0.22em] text-cyan-300">
              Location
            </div>

            <div className="space-y-1 text-sm">
              <div>
                <span className="text-cyan-400">Region:</span>{" "}
                {dashboard.location?.region || "N/A"}
              </div>
              <div>
                <span className="text-cyan-400">Zone:</span>{" "}
                {dashboard.location?.zone || "N/A"}
              </div>
              <div>
                <span className="text-cyan-400">Uptime:</span>{" "}
                {dashboard.meta?.uptime || "N/A"}
              </div>
              <div>
                <span className="text-cyan-400">5-min load avg:</span>{" "}
                {loadAvg}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded border border-cyan-400/20 bg-slate-950/80 p-3 shadow-xl shadow-cyan-950/10">
          <div className="mb-2 text-xs uppercase tracking-[0.22em] text-cyan-300">
            Monitoring Endpoints
          </div>

          <div className="space-y-1 text-sm">
            {dashboard.monitoringEndpoints?.length ? (
              dashboard.monitoringEndpoints.map((ep, idx) => (
                <div key={idx} className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-white">{ep.name}:</span>
                  <span className="text-white text-xs">{ep.url}</span>
                  <span
                    className={
                      ep.status === "up" ? "text-green-400" : "text-red-400"
                    }
                  >
                    [{ep.status}]
                  </span>
                </div>
              ))
            ) : (
              <div className="text-white/30">No endpoints configured</div>
            )}
          </div>
        </div>

        <div className="mb-4 rounded border border-cyan-400/20 bg-slate-950/80 p-3 shadow-xl shadow-cyan-950/10">
          <div className="flex justify-between items-center gap-2 mb-2">
            <div className="min-w-0 text-xs uppercase tracking-[0.22em] text-cyan-300">
              SERVICES ({Math.min(serviceLimit, serviceStats.total)} of {serviceStats.total}){" "}
              | {serviceStats.healthy} healthy | {serviceStats.warning} warning
              | {serviceStats.critical} critical
            </div>

            <div className="flex flex-wrap justify-end gap-2">
                <button
                  onClick={toggleServiceSort}
                  className="px-2 py-1 border border-cyan-400/25 rounded text-xs text-white/60 hover:bg-cyan-400/10 hover:text-cyan-300"
                >
                [S] SORT {serviceSortLabel}
              </button>
              <button
                onClick={() => setShowServiceFilters(true)}
                className={`px-2 py-1 border rounded text-xs hover:bg-cyan-400/10 hover:text-cyan-300 ${
                  hasActiveFilters(serviceFilters)
                    ? "border-cyan-400 text-cyan-300"
                    : "border-cyan-400/25 text-white/60"
                }`}
              >
                [FS] FILTER
              </button>
              <button
                onClick={() => setShowAllServices(true)}
                className="px-2 py-1 border border-cyan-400/25 rounded text-xs text-white hover:bg-cyan-400/10 hover:text-cyan-300"
              >
                [SS] ALL SERVICES
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {visibleServices.map((service) => (
              <div key={service.label} className="flex items-center gap-2">
                <span className={getServiceLabelClass(service.status)}>{service.label}</span>

                <span className={`${getServiceStatusClass(service.status)} text-xs`}>
                  [{service.status}]
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded border border-cyan-400/20 bg-slate-950/80 p-3 shadow-xl shadow-cyan-950/10">
          <div className="flex justify-between items-center gap-2 mb-2">
            <div className="text-xs uppercase tracking-[0.22em] text-cyan-300">
              LOGS (LAST 30)
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={toggleLiveLogSort}
                className="px-2 py-1 border border-cyan-400/25 rounded text-xs text-white/60 hover:bg-cyan-400/10 hover:text-cyan-300"
              >
                [L] SORT {logSortLabel}
              </button>
              <button
                onClick={() => setShowLogFilters(true)}
                className={`px-2 py-1 border rounded text-xs hover:bg-cyan-400/10 hover:text-cyan-300 ${
                  hasActiveFilters(logFilters)
                    ? "border-cyan-400 text-cyan-300"
                    : "border-cyan-400/25 text-white/60"
                }`}
              >
                [FL] FILTER
              </button>
              <button
                onClick={openLiveLogs}
                className="px-2 py-1 border border-cyan-400/25 rounded text-xs text-white/60 hover:bg-cyan-400/10 hover:text-cyan-300"
              >
                [LL] ALL LOGS
              </button>
            </div>
          </div>

          <div className="space-y-1 text-xs">
            {sortedPreviewLogs.map((log, idx) => {
              const level = getLogLevel(log);
              const source = getLogSource(log);

              return (
              <div
                key={idx}
                className="grid grid-cols-1 gap-1 font-mono sm:grid-cols-[minmax(9rem,12rem)_5rem_minmax(5rem,10rem)_1fr] sm:gap-2"
              >
                <span className="text-white/30">[{getLogDisplayTime(log)}]</span>
                <span className={getLevelClass(level)}>[{level}]</span>
                <span className={LOG_SOURCE_CLASS}>[{source}]</span>
                <span className="break-words text-white/60">{getLogMessage(log)}</span>
              </div>
              );
            })}

            {sortedPreviewLogs.length === 0 && (
              <div className="text-white/30">
                {hasActiveFilters(logFilters) ? "No logs match the active filters" : "No logs available"}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-cyan-400/20 pt-2 mt-4 text-center text-xs text-white/30">
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
                  <div className="text-sm font-bold text-white">
                    ALL SERVICES
                  </div>
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
                      hasActiveFilters(serviceFilters)
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
                      <span className="break-all text-white/60">
                        {service.value || "N/A"}
                      </span>
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

        {showLiveLogs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-x-hidden bg-black/90 p-3 md:p-6"
          >
            <motion.div
              ref={liveLogsModalRef}
              tabIndex={-1}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden border border-cyan-400/25 bg-black font-mono text-white shadow-2xl outline-none"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-400/25 p-3">
                <div>
                  <div className="text-sm font-bold text-cyan-300">
                    ALL SYSTEM LOGS
                  </div>
                  <div className="text-xs text-white/40">
                    /api/logs | refresh: 5s | lines: {liveLogs.length}
                    {liveLogUpdatedAt
                      ? ` | updated: ${liveLogUpdatedAt.toLocaleTimeString()}`
                      : ""}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-white/40">LAST</span>
                  <input
                    value={liveLogMinutes}
                    onChange={(e) => setLiveLogMinutes(e.target.value)}
                    className="w-14 border border-cyan-400/25 bg-black px-2 py-1 text-white outline-none focus:border-cyan-400"
                    aria-label="Live log minutes"
                  />
                  <span className="text-white/40">MIN</span>
                  <button
                    onClick={refreshLiveLogs}
                    className="border border-cyan-400/25 px-2 py-1 text-white/60 hover:bg-cyan-400/10 hover:text-cyan-300"
                    disabled={liveLogLoading}
                  >
                    {liveLogLoading ? "[R] LOADING" : "[R] REFRESH"}
                  </button>
                  <button
                    onClick={() => setShowLogFilters(true)}
                    className={`border px-2 py-1 hover:bg-cyan-400/10 hover:text-cyan-300 ${
                      hasActiveFilters(logFilters)
                        ? "border-cyan-400 text-cyan-300"
                        : "border-cyan-400/25 text-white/60"
                    }`}
                    title="Filter loaded logs"
                  >
                    [FL] FILTER
                  </button>
                  <button
                    onClick={toggleLiveLogSort}
                    className="border border-cyan-400/25 px-2 py-1 text-white/60 hover:bg-cyan-400/10 hover:text-cyan-300"
                    title="Toggle log sort order"
                  >
                    [L] SORT {logSortLabel}
                  </button>
                  <button
                    onClick={copyLiveLogsSnapshot}
                    className="border border-cyan-400/25 px-2 py-1 text-white/60 hover:bg-cyan-400/10 hover:text-cyan-300"
                    title="Copy System Logs snapshot"
                  >
                    [LS] SNAPSHOT
                  </button>
                  <button
                    onClick={() => setShowLiveLogs(false)}
                    className="border border-cyan-400/25 px-2 py-1 text-white/60 hover:bg-cyan-400/10 hover:text-red-300"
                  >
                    [Esc] CLOSE
                  </button>
                </div>
              </div>

              {liveLogError && (
                <div className="border-b border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  API ERROR: {liveLogError} | showing dashboard snapshot logs if available
                </div>
              )}

              <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 text-xs leading-relaxed">
                {sortedLiveLogs.length ? (
                  sortedLiveLogs.map((log, index) => {
                    const level = getLogLevel(log);
                    const source = getLogSource(log);
                    const message = getLogMessage(log);

                    return (
                      <div
                        key={getLogLineKey(log, index)}
                        className="grid grid-cols-1 gap-1 border-b border-white/5 py-1 sm:grid-cols-[minmax(9rem,12rem)_5rem_minmax(5rem,10rem)_1fr] sm:gap-2"
                      >
                        <span className="text-white/30">[{getLogDisplayTime(log)}]</span>
                        <span className={getLevelClass(level)}>[{level}]</span>
                        <span className={LOG_SOURCE_CLASS}>[{source}]</span>
                        <span className="break-words text-white/70">{message}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-white/30">
                    {liveLogLoading
                      ? "Loading logs..."
                      : hasActiveFilters(logFilters)
                        ? "No logs match the active filters."
                        : "No logs available for this range."}
                  </div>
                )}
              </div>

              <div className="border-t border-cyan-400/25 p-2 text-center text-xs text-white/30">
                Press R to refresh logs. Press FL to filter logs. Press L to sort logs. Press LS to copy logs. Press Esc to close.
              </div>
            </motion.div>
          </motion.div>
        )}

        {showLogFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 font-mono text-white"
          >
            <motion.div
              ref={logFiltersModalRef}
              tabIndex={-1}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="w-full max-w-5xl border border-cyan-400/25 bg-black shadow-2xl outline-none"
            >
              <div className="flex items-center justify-between border-b border-cyan-400/25 p-3">
                <div>
                  <div className="text-sm font-bold text-cyan-300">LOG FILTERS</div>
                  <div className="text-xs text-white/40">
                    loaded: {currentFilterLogs.length} | filtered:{" "}
                    {applyOptionFilters(currentFilterLogs, logFilters, LOG_FILTER_ACCESSORS).length}
                  </div>
                </div>
                <button
                  onClick={() => setShowLogFilters(false)}
                  className="border border-cyan-400/25 px-2 py-1 text-xs text-white/60 hover:bg-cyan-400/10 hover:text-red-300"
                >
                  [Esc] CLOSE
                </button>
              </div>

              <div className="max-h-[65vh] overflow-y-auto p-3 text-xs">
                <button
                  onMouseEnter={() => setLogFilterCursor(0)}
                  onClick={() => {
                    setLogFilterCursor(0);
                    setLogFilters({});
                  }}
                  className={`mb-3 grid w-full grid-cols-[1rem_1fr] gap-2 border border-red-500/30 px-2 py-2 text-left text-red-300 hover:bg-red-500/10 ${
                    logFilterCursor === 0 ? "bg-red-500/10" : ""
                  }`}
                >
                  <span>{logFilterCursor === 0 ? ">" : " "}</span>
                  <span>[DEL] or [Backspace] CLEAR FILTERS</span>
                </button>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {logFilterSections.map((section, columnIndex) => (
                    <div key={section.key} className="border border-cyan-400/20">
                      <div className="border-b border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-cyan-300">
                        {section.label}
                      </div>
                      <div className="p-1">
                        {section.options.length ? (
                          section.options.map((option, rowIndex) => {
                            const itemIndex = getFilterItemIndex(columnIndex, rowIndex);
                            const selected = (logFilters[section.key] || []).includes(option.value);
                            const activeCursor = itemIndex === logFilterCursor;

                            return (
                              <button
                                key={`${section.key}-${option.value}`}
                                onMouseEnter={() => setLogFilterCursor(itemIndex)}
                                onClick={() => {
                                  setLogFilterCursor(itemIndex);
                                  setLogFilters((current) =>
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

                {logFilterItems.length <= 1 && (
                  <div className="px-2 py-4 text-white/30">No filter options available</div>
                )}
              </div>

              <div className="border-t border-cyan-400/25 p-2 text-center text-xs text-white/30">
                Arrow keys move by row and column. Space or Enter toggles. Delete or Backspace clears. Esc closes.
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
                    {applyOptionFilters(dashboard.services || [], serviceFilters, SERVICE_FILTER_ACCESSORS).length}
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
