import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import {
  Server,
  Database,
  Shield,
  Code,
  AlertCircle,
  Info,
  AlertTriangle,
  RefreshCw,
  Pause,
  Eye,
  Filter,
  Copy,
  Check,
  X,
  Camera,
  ArrowDown,
  ArrowUp
} from "lucide-react";
import Card from "./Card";
import StatusDot from "./StatusDot";
import FilterOverlay, {
  applyOptionFilters,
  getUniqueOptions,
  hasActiveFilters,
  toggleFilterValue,
} from "./FilterOverlay";
import { getPaginatedMockLogs } from "../mockLogs";
import CopyValueButton from "./CopyValueButton";
import { writeClipboardText } from "../utils/clipboard";
import { buildSystemLogsSnapshot, buildIdleResourcesSnapshot } from "../utils/widgetSnapshots";

const getScopeIcon = (scope) => {
  switch (scope?.toLowerCase()) {
    case "system":
      return <Server className="w-3 h-3" />;
    case "database":
      return <Database className="w-3 h-3" />;
    case "security":
      return <Shield className="w-3 h-3" />;
    default:
      return <Code className="w-3 h-3" />;
  }
};

const getLogIcon = (level) => {
  const lvl = level?.toUpperCase() || "";
  if (lvl === "ERROR") return <AlertCircle className="w-3 h-3 text-red-400" />;
  if (lvl === "WARN") return <AlertTriangle className="w-3 h-3 text-amber-400" />;
  return <Info className="w-3 h-3 text-cyan-400" />;
};

const getLevelBadgeStyle = (level) => {
  const lvl = level?.toUpperCase() || "";
  if (lvl === "ERROR") return "bg-red-500/20 text-red-400";
  if (lvl === "WARN") return "bg-amber-500/20 text-amber-400";
  return "bg-cyan-500/20 text-cyan-400";
};

const getStatusDotStatus = (rowStatus) => {
  const status = rowStatus?.toLowerCase() || "";
  if (
    status === "running" ||
    status === "installed" ||
    status === "reachable" ||
    status === "ready" ||
    status === "successful" ||
    status === "active" ||
    status === "serving" ||
    status === "completed" ||
    status === "healthy"
  )
    return "success";
  if (status === "warning" || status === "pending" || status === "degraded")
    return "warning";
  if (
    status === "critical" ||
    status === "error" ||
    status === "failed" ||
    status === "unreachable" ||
    status === "unavailable" ||
    status === "stopped"
  )
    return "critical";
  return "healthy";
};

const STATUS_SORT_ORDER = {
  critical: 0,
  error: 1,
  failed: 2,
  unreachable: 3,
  unavailable: 4,
  warning: 5,
  pending: 6,
  degraded: 7,
  stopped: 8,
  healthy: 9,
  running: 10,
  installed: 11,
  reachable: 12,
  ready: 13,
  active: 14,
  successful: 15,
  serving: 16,
  completed: 17,
};

const RESOURCE_SORT_FIELDS = ["name", "scope", "status", "type"];
const RESOURCE_SORT_LABELS = {
  name: "Name",
  status: "Status",
  type: "Type",
  scope: "Scope",
};
const LOG_SORT_FIELDS = ["name", "level", "source"];
const LOG_SORT_LABELS = {
  name: "Time",
  level: "Level",
  source: "Source",
};
const LOG_LEVEL_SORT_ORDER = {
  ERROR: 0,
  WARN: 1,
  WARNING: 1,
  INFO: 2,
  DEBUG: 3,
};

const getLogRawTime = (log) =>
  log?.timestamp ||
  log?.datetime ||
  log?.isoTime ||
  log?.iso_time ||
  log?.createdAt ||
  log?.created_at ||
  log?.time ||
  log?.name ||
  "";

const formatLocalDateTime = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const formatLogTimestamp = (log) => {
  const raw = getLogRawTime(log);
  if (typeof raw === "number") return formatLocalDateTime(new Date(raw));

  const value = String(raw || "").trim();
  if (!value) return "";

  const parsedDate = Date.parse(value);
  if (!Number.isNaN(parsedDate)) return formatLocalDateTime(new Date(parsedDate));

  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(value)) return value;
  if (/^\d{1,2}:\d{2}/.test(value)) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${value}`;
  }
  return value;
};

const getLogLevelValue = (log) => (log?.level || log?.type || "INFO").toUpperCase();
const getLogSourceValue = (log) => log?.source || log?.scope || "";
const getLogMessageValue = (log) => log?.message || log?.status || "";

const matchesSearch = (item, query, getValues) => {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return true;

  return getValues(item).some((value) =>
    String(value || "").toLowerCase().includes(normalizedQuery)
  );
};

const getLogSortValue = (log) => {
  const raw = getLogRawTime(log);

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

const getLogRecentTimestamp = (log) => {
  const raw = getLogRawTime(log);

  if (typeof raw === "number") return raw;

  const value = String(raw).trim();
  if (!value) return 0;

  const parsedDate = Date.parse(value);
  if (!Number.isNaN(parsedDate)) return parsedDate;

  const timeMatch = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?$/);
  if (!timeMatch) return 0;

  const now = new Date();
  const logDate = new Date(now);

  logDate.setHours(
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    Number(timeMatch[3] || 0),
    Number((timeMatch[4] || "0").padEnd(3, "0").slice(0, 3))
  );

  if (logDate.getTime() > now.getTime() + 60000) {
    logDate.setDate(logDate.getDate() - 1);
  }

  return logDate.getTime();
};

const isLogWithinLastMinutes = (log, minutes) => {
  const timestamp = getLogRecentTimestamp(log);
  if (!timestamp) return true;
  return Date.now() - timestamp <= minutes * 60 * 1000;
};

const getLogDedupeKey = (log) =>
  [
    getLogRawTime(log),
    getLogLevelValue(log),
    getLogSourceValue(log),
    getLogMessageValue(log),
  ]
    .map((value) => String(value).trim().toLowerCase())
    .join("|");

const dedupeLogs = (logs) => {
  const seen = new Set();

  return (logs || []).filter((log) => {
    if (!log) return false;

    const key = getLogDedupeKey(log);
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

const orderLogs = (logs, direction = "desc", field = "name") =>
  dedupeLogs(logs)
    .map((log, index) => ({ log, index }))
    .sort((a, b) => {
      let result;

      if (field === "level") {
        result =
          (LOG_LEVEL_SORT_ORDER[getLogLevelValue(a.log)] ?? 99) -
          (LOG_LEVEL_SORT_ORDER[getLogLevelValue(b.log)] ?? 99);
      } else if (field === "source") {
        result = getLogSourceValue(a.log).localeCompare(
          getLogSourceValue(b.log),
          undefined,
          { sensitivity: "base" }
        );
      } else if (field === "status") {
        result = getLogMessageValue(a.log).localeCompare(
          getLogMessageValue(b.log),
          undefined,
          { sensitivity: "base" }
        );
      } else {
        const aTime = getLogSortValue(a.log);
        const bTime = getLogSortValue(b.log);
        result = aTime - bTime;
      }

      const orderedResult = direction === "asc" ? result : -result;
      return orderedResult || a.index - b.index;
    })
    .map(({ log }) => log);

const getLiveDashboardLogs = (rows, minutes, direction = "desc") => {
  const logs = rows || [];
  const filteredLogs = minutes
    ? logs.filter((log) => isLogWithinLastMinutes(log, minutes))
    : logs;

  return orderLogs(filteredLogs, direction);
};

const fetchLogsJson = async ({ limit, offset = 0, minutes, authHeaders = {} } = {}) => {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    _: String(Date.now()),
  });

  if (minutes) params.set("minutes", String(minutes));

  const res = await fetch(`/api/logs?${params.toString()}`, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...authHeaders,
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

export default function ResourceTable({
  rows = [],
  title = "Resources",
  subtitle = "Service logs and operational events",
  isLogs = false,
  limit,
  onRowClick,
  filterResetKey,
  onCopyFailure,
  onCopySuccess,
  snapshotText,
  snapshotLabel,
  authHeaders = {},
}) {
  const [showAllLogsModal, setShowAllLogsModal] = useState(false);
  const [showAllResourcesModal, setShowAllResourcesModal] = useState(false);
  const [showLogFilters, setShowLogFilters] = useState(false);
  const [showResourceFilters, setShowResourceFilters] = useState(false);
  const [logFilters, setLogFilters] = useState({});
  const [resourceFilters, setResourceFilters] = useState({});
  const [logSearch, setLogSearch] = useState("");
  const [resourceSearch, setResourceSearch] = useState("");
  const [allLogs, setAllLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logError, setLogError] = useState(null);
  const [copiedLogId, setCopiedLogId] = useState(null);
  const [refreshMessage, setRefreshMessage] = useState(null);
  const [isFetchingRange, setIsFetchingRange] = useState(false);
  const [timeRangeMinutes, setTimeRangeMinutes] = useState("10");
  const [sortDirection, setSortDirection] = useState(() => (isLogs ? "desc" : "asc"));
  const [logSortField, setLogSortField] = useState("name");
  const [resourceSortField, setResourceSortField] = useState("name");
  const logsContainerRef = useRef(null);
  const allLogsModalRef = useRef(null);
  const allResourcesModalRef = useRef(null);

  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(true);
  const [olderOffset, setOlderOffset] = useState(0);
  const PAGE_SIZE = 200;

  const totalRowsCount = rows.length;

  useEffect(() => {
    if (filterResetKey !== undefined) {
      setResourceFilters({});
      setResourceSearch("");
    }
  }, [filterResetKey]);

  useEffect(() => {
    if (showLogFilters || showResourceFilters) return undefined;

    const activeModal =
      (showAllLogsModal && allLogsModalRef.current) ||
      (showAllResourcesModal && allResourcesModalRef.current);

    if (!activeModal) return undefined;

    const frame = requestAnimationFrame(() => {
      activeModal.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [showAllLogsModal, showAllResourcesModal, showLogFilters, showResourceFilters]);

  const scrollLogsToTop = () => {
    requestAnimationFrame(() => {
      logsContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const toggleSortDirection = () => {
    setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
  };

  const cycleResourceSortField = () => {
    setResourceSortField((current) => {
      const currentIndex = RESOURCE_SORT_FIELDS.indexOf(current);
      return RESOURCE_SORT_FIELDS[(currentIndex + 1) % RESOURCE_SORT_FIELDS.length];
    });
  };

  const cycleLogSortField = () => {
    setLogSortField((current) => {
      const currentIndex = LOG_SORT_FIELDS.indexOf(current);
      return LOG_SORT_FIELDS[(currentIndex + 1) % LOG_SORT_FIELDS.length];
    });
  };

  const getRequestedMinutes = () => {
    const raw = timeRangeMinutes.trim();
    const minutes = raw === "" ? 10 : parseInt(raw, 10);
    return isNaN(minutes) || minutes <= 0 ? 10 : minutes;
  };

  const mergeFetchedAndLiveLogs = (fetchedLogs, minutes) => {
    const liveLogs = getLiveDashboardLogs(rows, minutes, sortDirection);
    return dedupeLogs([...liveLogs, ...fetchedLogs]);
  };

  const orderResources = (resourceRows) =>
    [...(resourceRows || [])].sort((a, b) => {
      let result;

      if (resourceSortField === "status") {
        const aStatus = String(a?.status || "").toLowerCase();
        const bStatus = String(b?.status || "").toLowerCase();
        result =
          (STATUS_SORT_ORDER[aStatus] ?? 99) -
          (STATUS_SORT_ORDER[bStatus] ?? 99);
      } else {
        result = String(a?.[resourceSortField] || "").localeCompare(
          String(b?.[resourceSortField] || ""),
          undefined,
          { sensitivity: "base" }
        );
      }

      if (result === 0) {
        result = String(a?.name || "").localeCompare(String(b?.name || ""), undefined, {
          sensitivity: "base",
        });
      }

      return sortDirection === "asc" ? result : -result;
    });

  const logAccessors = {
    level: (log) => getLogLevelValue(log),
    source: (log) => getLogSourceValue(log),
  };
  const resourceAccessors = {
    type: (row) => row.type,
    scope: (row) => row.scope,
    status: (row) => row.status,
  };
  const filteredPreviewLogs = applyOptionFilters(rows, logFilters, logAccessors);
  const filteredResources = applyOptionFilters(rows, resourceFilters, resourceAccessors);
  const sortedRows = isLogs ? rows : orderResources(filteredResources);
  const displayedRows = sortedRows.slice(0, limit);
  const displayText =
    isLogs
      ? `last ${limit}`
      : `${Math.min(limit, filteredResources.length)} of ${totalRowsCount}`;

  const handleRowClick = () => {
    if (onRowClick) {
      const url = typeof onRowClick === "string" ? onRowClick : onRowClick();
      if (url) window.open(url, "_blank");
    }
  };

  const updateLogs = async ({ initialLoad = false } = {}) => {
    const minutes = getRequestedMinutes();

    if (initialLoad) {
      setLoadingLogs(true);
      setAllLogs([]);
      setLogFilters({});
      setLogSearch("");
      setOlderOffset(0);
      setHasOlder(true);
    }

    setIsFetchingRange(true);
    setLogError(null);
    setCopiedLogId(null);

    try {
      const data = await fetchLogsJson({
        limit: PAGE_SIZE,
        offset: 0,
        minutes,
        authHeaders,
      });

      const fetchedLogs = data.logs?.length
        ? data.logs
        : getPaginatedMockLogs(PAGE_SIZE, 0, minutes).logs;
      const mergedLogs = mergeFetchedAndLiveLogs(fetchedLogs, minutes);

      setAllLogs(mergedLogs);
      setOlderOffset(data.offset || fetchedLogs.length);
      setHasOlder(data.hasMore ?? fetchedLogs.length >= PAGE_SIZE);
      setRefreshMessage(
        mergedLogs.length ? `Updated last ${minutes} min` : `No logs in last ${minutes} min`
      );
      setTimeout(() => setRefreshMessage(null), 3000);
      scrollLogsToTop();
    } catch (err) {
      console.error(err);
      const fallback = getPaginatedMockLogs(PAGE_SIZE, 0, minutes);
      const mergedLogs = mergeFetchedAndLiveLogs(fallback.logs, minutes);
      setAllLogs(mergedLogs);
      setOlderOffset(fallback.offset);
      setHasOlder(fallback.hasMore);
      setRefreshMessage(`Showing mock logs for last ${minutes} min`);
      setTimeout(() => setRefreshMessage(null), 3000);
      scrollLogsToTop();
    } finally {
      setIsFetchingRange(false);
      setLoadingLogs(false);
    }
  };

  const loadOlderLogs = async () => {
    if (loadingOlder || !hasOlder) return;
    const minutes = getRequestedMinutes();
    setLoadingOlder(true);

    try {
      const data = await fetchLogsJson({ limit: PAGE_SIZE, offset: olderOffset, minutes, authHeaders });
      const newLogs = data.logs?.length
        ? data.logs
        : getPaginatedMockLogs(PAGE_SIZE, olderOffset, minutes).logs;
      const more = data.hasMore || false;

      if (newLogs.length) {
        setAllLogs((prev) => dedupeLogs([...prev, ...newLogs]));
        setOlderOffset(data.offset || olderOffset + newLogs.length);
        setHasOlder(more || newLogs.length >= PAGE_SIZE);
      } else {
        setHasOlder(false);
      }
    } catch (err) {
      console.error(err);
      const fallback = getPaginatedMockLogs(PAGE_SIZE, olderOffset, minutes);
      if (fallback.logs.length) {
        setAllLogs((prev) => dedupeLogs([...prev, ...fallback.logs]));
        setOlderOffset(fallback.offset);
        setHasOlder(fallback.hasMore);
      } else {
        setHasOlder(false);
      }
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleCopyLog = async (log, index) => {
    const text = buildSystemLogsSnapshot([log]);
    try {
      await writeClipboardText(text);
      setCopiedLogId(index);
      onCopySuccess?.("Log entry copied to clipboard.");
      setTimeout(() => setCopiedLogId(null), 2000);
    } catch (error) {
      console.error("Failed to copy log:", error);
      onCopyFailure?.(text, "log entry");
    }
  };

  const copyCustomSnapshot = async (text, label, successMessage = "Widget snapshot copied to clipboard.") => {
    try {
      await writeClipboardText(text);
      onCopySuccess?.(successMessage);
    } catch (error) {
      console.error(`Failed to copy ${label}:`, error);
      onCopyFailure?.(text, label);
    }
  };

  const openModal = () => {
    setShowAllLogsModal(true);
    updateLogs({ initialLoad: true });
  };

  const closeModal = () => setShowAllLogsModal(false);

  if (!isLogs && totalRowsCount === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card
          title={title}
          subtitle={subtitle}
          snapshotText={snapshotText || buildIdleResourcesSnapshot(rows)}
          snapshotLabel={snapshotLabel || "Idle Resources snapshot"}
          onCopyFailure={onCopyFailure}
          onCopySuccess={onCopySuccess}
        >
          <div className="py-12 text-center text-slate-400">
            <Pause className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p>No idle resources available yet.</p>
            <p className="text-xs mt-1">
              GCP Recommender API may take up to 48 hours to generate insights.
            </p>
          </div>
        </Card>
      </motion.div>
    );
  }

  const logsToDisplay = isLogs
    ? orderLogs(filteredPreviewLogs, sortDirection, logSortField).slice(0, limit)
    : displayedRows;
  const filteredLogs = applyOptionFilters(allLogs, logFilters, logAccessors);
  const searchedLogs = filteredLogs.filter((log) =>
    matchesSearch(log, logSearch, (item) => [
      formatLogTimestamp(item),
      getLogLevelValue(item),
      getLogSourceValue(item),
      getLogMessageValue(item),
    ])
  );
  const displayLogs = orderLogs(searchedLogs, sortDirection, logSortField);
  const resourcesToDisplay = orderResources(filteredResources).filter((row) =>
    matchesSearch(row, resourceSearch, (item) => [
      item.name,
      item.type,
      item.scope,
      item.status,
    ])
  );
  const logFilterSource = allLogs.length ? allLogs : rows;
  const logFilterSections = [
    {
      key: "level",
      label: "Level",
      options: getUniqueOptions(logFilterSource, getLogLevelValue).map((value) => ({ value, label: value })),
    },
    {
      key: "source",
      label: "Source",
      options: getUniqueOptions(logFilterSource, getLogSourceValue).map((value) => ({ value, label: value })),
    },
  ];
  const resourceFilterSections = [
    {
      key: "scope",
      label: "Scope",
      options: getUniqueOptions(rows, (row) => row.scope).map((value) => ({ value, label: value })),
    },
    {
      key: "status",
      label: "Status",
      options: getUniqueOptions(rows, (row) => row.status).map((value) => ({ value, label: value })),
    },
    {
      key: "type",
      label: "Resource Type",
      options: getUniqueOptions(rows, (row) => row.type).map((value) => ({ value, label: value })),
    },
  ];
  const SortIcon = isLogs
    ? sortDirection === "desc" ? ArrowDown : ArrowUp
    : sortDirection === "asc" ? ArrowDown : ArrowUp;
  const sortTitle =
    isLogs
      ? logSortField === "name"
        ? sortDirection === "desc"
          ? "Sorted newest first. Click for oldest first."
          : "Sorted oldest first. Click for newest first."
        : logSortField === "level"
          ? sortDirection === "asc"
            ? "Sorted ERROR to DEBUG. Click to reverse."
            : "Sorted DEBUG to ERROR. Click to reverse."
          : sortDirection === "asc"
            ? `Sorted ${LOG_SORT_LABELS[logSortField]} A-Z. Click for Z-A.`
            : `Sorted ${LOG_SORT_LABELS[logSortField]} Z-A. Click for A-Z.`
      : resourceSortField === "status"
        ? sortDirection === "asc"
          ? "Sorted by status priority. Click to reverse."
          : "Sorted by reversed status priority. Click to reverse."
        : sortDirection === "asc"
          ? `Sorted ${RESOURCE_SORT_LABELS[resourceSortField]} A-Z. Click for Z-A.`
          : `Sorted ${RESOURCE_SORT_LABELS[resourceSortField]} Z-A. Click for A-Z.`;
  const resolvedSnapshotText =
    snapshotText ||
    (isLogs
      ? buildSystemLogsSnapshot(logsToDisplay)
      : buildIdleResourcesSnapshot(resourcesToDisplay));
  const resolvedSnapshotLabel =
    snapshotLabel || (isLogs ? "System Logs snapshot" : "Idle Resources snapshot");
  const customLogsSnapshot = buildSystemLogsSnapshot(displayLogs);
  const customIdleResourcesSnapshot = buildIdleResourcesSnapshot(
    resourcesToDisplay,
    "IDLE RESOURCES (CUSTOM FILTER)"
  );
  const resourceModalTitle = typeof title === "string" ? title : "Idle Resources";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card
          title={title}
          subtitle={subtitle}
          snapshotText={resolvedSnapshotText}
          snapshotLabel={resolvedSnapshotLabel}
          onCopyFailure={onCopyFailure}
          onCopySuccess={onCopySuccess}
        >
          {isLogs ? (
            <div className="flex justify-between items-center mb-3 px-1">
              <div className="text-xs text-slate-500">
                Showing {displayText} log entries
              </div>
              <div className="flex gap-2">
                <button
                  onClick={toggleSortDirection}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors px-2 py-1 rounded border border-slate-700 hover:border-cyan-500/50"
                  title={sortTitle}
                >
                  <SortIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">Sort</span>
                </button>
                <button
                  onClick={cycleLogSortField}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors px-2 py-1 rounded border border-slate-700 hover:border-cyan-500/50"
                  title="Switch log sort field"
                >
                  <span className="hidden sm:inline">{LOG_SORT_LABELS[logSortField]}</span>
                </button>
                <button
                  onClick={() => setShowLogFilters(true)}
                  className={`flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded border ${
                    hasActiveFilters(logFilters)
                      ? "border-cyan-500/60 text-cyan-300"
                      : "border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50"
                  }`}
                  title="Filter logs"
                >
                  <Filter className="w-3 h-3" />
                  <span className="hidden sm:inline">Filter</span>
                </button>
                <button
                  onClick={openModal}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors px-2 py-1 rounded border border-slate-700 hover:border-cyan-500/50"
                  title="View all logs"
                >
                  <Eye className="w-3 h-3" />
                  <span className="hidden sm:inline">View All</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center mb-3 px-1">
              <div className="text-xs text-slate-500">
                Showing {displayText} resources
              </div>
              <div className="flex gap-2">
                <button
                  onClick={toggleSortDirection}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors px-2 py-1 rounded border border-slate-700 hover:border-cyan-500/50"
                  title={sortTitle}
                >
                  <SortIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">Sort</span>
                </button>
                <button
                  onClick={cycleResourceSortField}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors px-2 py-1 rounded border border-slate-700 hover:border-cyan-500/50"
                  title="Switch resource sort field"
                >
                  <span className="hidden sm:inline">{RESOURCE_SORT_LABELS[resourceSortField]}</span>
                </button>
                <button
                  onClick={() => setShowResourceFilters(true)}
                  className={`flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded border ${
                    hasActiveFilters(resourceFilters)
                      ? "border-cyan-500/60 text-cyan-300"
                      : "border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50"
                  }`}
                  title="Filter resources"
                >
                  <Filter className="w-3 h-3" />
                  <span className="hidden sm:inline">Filter</span>
                </button>
                <button
                  onClick={() => setShowAllResourcesModal(true)}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors px-2 py-1 rounded border border-slate-700 hover:border-cyan-500/50"
                  title="View all resources"
                >
                  <Eye className="w-3 h-3" />
                  <span className="hidden sm:inline">View all</span>
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {isLogs ? (
                    <>
                      <th className="px-4 py-3 font-medium">Time</th>
                      <th className="px-4 py-3 font-medium">Level</th>
                      <th className="px-4 py-3 font-medium">Source</th>
                      <th className="px-4 py-3 font-medium">Message</th>
                      <th className="px-4 py-3 font-medium w-8"></th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Scope</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium w-8"></th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {logsToDisplay.map((row, idx) => {
                  if (isLogs) {
                    const timestamp = formatLogTimestamp(row);
                    const level = getLogLevelValue(row);
                    const source = getLogSourceValue(row);
                    const message = getLogMessageValue(row);

                    return (
                      <motion.tr
                        key={`log-${idx}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        whileHover={{
                          scale: 1.01,
                          backgroundColor: "rgba(15, 23, 42, 0.4)",
                          transition: { duration: 0.2 },
                        }}
                        className="border-b border-slate-800/50 transition-all duration-200 cursor-pointer group"
                        onClick={handleRowClick}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getLogIcon(level)}
                            <span className="text-xs font-mono text-slate-400">
                              {timestamp}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${getLevelBadgeStyle(level)}`}>
                            {level}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300">
                            {source}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{message}</td>
                        <td className="px-4 py-3">
                          <CopyValueButton
                            value={buildSystemLogsSnapshot([row])}
                            label="log entry"
                            onCopyFailure={onCopyFailure}
                            onCopySuccess={onCopySuccess}
                            hoverOnly
                          />
                        </td>
                      </motion.tr>
                    );
                  }

                  const statusDotStatus = getStatusDotStatus(row.status);

                  return (
                    <motion.tr
                      key={`${row.name}-${row.type}-${idx}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      whileHover={{
                        scale: 1.01,
                        backgroundColor: "rgba(15, 23, 42, 0.4)",
                        transition: { duration: 0.2 },
                      }}
                      className="border-b border-slate-800/50 transition-all duration-200 cursor-pointer group"
                      onClick={handleRowClick}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                            {getScopeIcon(row.scope)}
                          </div>
                          <span className="text-slate-200 font-medium group-hover:text-cyan-400 transition-colors">
                            {row.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300 font-mono">
                          {row.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{row.scope}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusDot status={statusDotStatus} size="sm" showTooltip animated />
                          <span className="text-sm text-slate-300">{row.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <CopyValueButton
                          value={`${row.name || "Unknown"} | Type: ${row.type || "N/A"} | Scope: ${row.scope || "N/A"} | Status: ${row.status || "N/A"}`}
                          label="resource details"
                          onCopyFailure={onCopyFailure}
                          onCopySuccess={onCopySuccess}
                          hoverOnly
                        />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              {isLogs
                ? `Showing ${displayText} log entries`
                : `Showing ${displayText} resource${totalRowsCount !== 1 ? "s" : ""}`}
            </p>
          </div>
        </Card>
      </motion.div>

      <AnimatePresence>
        {showAllLogsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              ref={allLogsModalRef}
              tabIndex={-1}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col outline-none"
            >
              <div className="flex items-start justify-between p-4 border-b border-white/10 gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-cyan-400" />
                    System Logs ({displayLogs.length} of {allLogs.length} shown)
                  </h2>
                  {refreshMessage && (
                    <div className="mt-1 text-emerald-400 text-xs flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {refreshMessage}
                    </div>
                  )}
                </div>
                <div className="ml-auto flex items-center justify-end gap-2 flex-wrap">
                    <span className="text-xs text-slate-300 whitespace-nowrap">
                      View Logs from Last
                    </span>
                    <input
                      type="text"
                      value={timeRangeMinutes}
                      onChange={(e) => setTimeRangeMinutes(e.target.value)}
                      className="w-14 px-2 py-1 text-sm bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-cyan-500"
                      placeholder="min"
                    />
                    <span className="text-xs text-slate-300">minutes.</span>
                    <button
                      onClick={() => updateLogs({ initialLoad: true })}
                      disabled={isFetchingRange}
                      className="px-3 py-1 text-xs rounded border border-cyan-500/50 text-cyan-400 hover:text-cyan-300 hover:border-cyan-400 transition-colors disabled:opacity-50"
                    >
                      {isFetchingRange ? "Refreshing..." : "Refresh"}
                    </button>
                    <button
                      onClick={toggleSortDirection}
                      className="flex items-center gap-1 px-3 py-1 text-xs rounded border border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors"
                      title={sortTitle}
                    >
                      <SortIcon className="w-3 h-3" />
                      Sort
                    </button>
                    <button
                      onClick={cycleLogSortField}
                      className="flex items-center gap-1 px-3 py-1 text-xs rounded border border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors"
                      title="Switch log sort field"
                    >
                      {LOG_SORT_LABELS[logSortField]}
                    </button>
                    <button
                      onClick={() => setShowLogFilters(true)}
                      className={`flex items-center gap-1 px-3 py-1 text-xs rounded border transition-colors ${
                        hasActiveFilters(logFilters)
                          ? "border-cyan-500/60 text-cyan-300"
                          : "border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50"
                      }`}
                      title="Filter loaded logs"
                    >
                      <Filter className="w-3 h-3" />
                      Filter
                    </button>
                    <button
                      onClick={() =>
                        copyCustomSnapshot(
                          customLogsSnapshot,
                          "System Logs Custom Filter snapshot",
                          "Logs snapshot copied to clipboard."
                        )
                      }
                      className="flex items-center gap-1 px-3 py-1 text-xs rounded border border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors"
                      title="Copy System Logs custom filter snapshot"
                    >
                      <Camera className="w-3 h-3" />
                      Snapshot
                    </button>
                  <button
                    onClick={closeModal}
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="border-b border-white/10 p-3">
                <input
                  type="search"
                  value={logSearch}
                  onChange={(event) => setLogSearch(event.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-500"
                  placeholder="Search loaded logs by time, level, source, or message"
                />
              </div>

              <div ref={logsContainerRef} className="flex-1 overflow-y-auto p-4">
                {loadingLogs ? (
                  <div className="flex justify-center py-12">
                    <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
                  </div>
                ) : logError ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
                    <p className="text-red-400">Error: {logError}</p>
                    <button
                      onClick={() => updateLogs({ initialLoad: true })}
                      className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm"
                    >
                      Retry
                    </button>
                  </div>
                ) : allLogs.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">No logs found.</p>
                ) : displayLogs.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">No logs match the active filters or search.</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {displayLogs.map((log, idx) => {
                        const timestamp = formatLogTimestamp(log);
                        const level = getLogLevelValue(log);
                        const source = getLogSourceValue(log);
                        const message = getLogMessageValue(log);

                        return (
                          <div
                            key={`${timestamp}-${source}-${idx}`}
                            onClick={() => handleCopyLog(log, idx)}
                            className={`group p-3 rounded-xl border border-white/5 transition-all cursor-pointer ${
                              level === "ERROR"
                                ? "hover:bg-red-500/10"
                                : level === "WARN"
                                ? "hover:bg-amber-500/10"
                                : "hover:bg-cyan-500/10"
                            }`}
                          >
                            <div className="flex items-start gap-2 text-sm">
                              <div className="flex-shrink-0 mt-0.5">
                                {getLogIcon(level)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-xs text-slate-500">{timestamp}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${getLevelBadgeStyle(level)}`}>
                                    {level}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                                    {source}
                                  </span>
                                  {copiedLogId === idx && (
                                    <span className="text-emerald-400 text-xs flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Copied!
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-300 text-sm mt-1 break-words">
                                  {message}
                                </p>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Copy className="w-4 h-4 text-slate-400" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {hasOlder && (
                      <div className="flex justify-center pt-3">
                        <button
                          onClick={loadOlderLogs}
                          disabled={loadingOlder}
                          className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors px-4 py-2 rounded-lg border border-slate-700 hover:border-cyan-500/50 disabled:opacity-50"
                        >
                          {loadingOlder ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <ArrowDown className="w-4 h-4" />
                              SHOW OLDER LOGS
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {showAllResourcesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              ref={allResourcesModalRef}
              tabIndex={-1}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col outline-none"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 flex-wrap gap-2">
                <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                  <Server className="w-5 h-5 text-cyan-400" />
                  {resourceModalTitle} ({resourcesToDisplay.length} of {totalRowsCount} shown)
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSortDirection}
                    className="flex items-center gap-1 px-3 py-1 text-xs rounded border border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors"
                    title={sortTitle}
                  >
                    <SortIcon className="w-3 h-3" />
                    Sort
                  </button>
                  <button
                    onClick={cycleResourceSortField}
                    className="flex items-center gap-1 px-3 py-1 text-xs rounded border border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors"
                    title="Switch resource sort field"
                  >
                    {RESOURCE_SORT_LABELS[resourceSortField]}
                  </button>
                  <button
                    onClick={() => setShowResourceFilters(true)}
                    className={`flex items-center gap-1 px-3 py-1 text-xs rounded border transition-colors ${
                      hasActiveFilters(resourceFilters)
                        ? "border-cyan-500/60 text-cyan-300"
                        : "border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50"
                    }`}
                    title="Filter resources"
                  >
                    <Filter className="w-3 h-3" />
                    Filter
                  </button>
                  <button
                    onClick={() =>
                      copyCustomSnapshot(
                        customIdleResourcesSnapshot,
                        "Idle Resources Custom Filter snapshot",
                        "Widget snapshot copied to clipboard."
                      )
                    }
                    className="flex items-center gap-1 px-3 py-1 text-xs rounded border border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors"
                    title="Copy Idle Resources custom filter snapshot"
                  >
                    <Camera className="w-3 h-3" />
                    Snapshot
                  </button>
                  <button
                    onClick={() => setShowAllResourcesModal(false)}
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                    title="Close resources"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="border-b border-white/10 p-3">
                <input
                  type="search"
                  value={resourceSearch}
                  onChange={(event) => setResourceSearch(event.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-500"
                  placeholder="Search resources by name, type, scope, or status"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Scope</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {resourcesToDisplay.map((row, idx) => {
                      const statusDotStatus = getStatusDotStatus(row.status);

                      return (
                        <motion.tr
                          key={`${row.name}-${row.type}-${idx}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          whileHover={{
                            scale: 1.01,
                            backgroundColor: "rgba(15, 23, 42, 0.4)",
                            transition: { duration: 0.2 },
                          }}
                          className="border-b border-slate-800/50 transition-all duration-200 cursor-pointer group"
                          onClick={handleRowClick}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                {getScopeIcon(row.scope)}
                              </div>
                              <span className="text-slate-200 font-medium group-hover:text-cyan-400 transition-colors">
                                {row.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300 font-mono">
                              {row.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{row.scope}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <StatusDot status={statusDotStatus} size="sm" showTooltip animated />
                              <span className="text-sm text-slate-300">{row.status}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <CopyValueButton
                              value={`${row.name || "Unknown"} | Type: ${row.type || "N/A"} | Scope: ${row.scope || "N/A"} | Status: ${row.status || "N/A"}`}
                              label="resource details"
                              onCopyFailure={onCopyFailure}
                              onCopySuccess={onCopySuccess}
                              hoverOnly
                            />
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
                {resourcesToDisplay.length === 0 && (
                  <p className="py-8 text-center text-slate-400">No resources match the active filters or search.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {showLogFilters && (
          <FilterOverlay
            title="Filter Logs"
            sections={logFilterSections}
            filters={logFilters}
            onToggle={(key, value) => setLogFilters((current) => toggleFilterValue(current, key, value))}
            onClear={() => setLogFilters({})}
            onClose={() => setShowLogFilters(false)}
          />
        )}

        {showResourceFilters && (
          <FilterOverlay
            title="Filter Resources"
            sections={resourceFilterSections}
            filters={resourceFilters}
            onToggle={(key, value) => setResourceFilters((current) => toggleFilterValue(current, key, value))}
            onClear={() => setResourceFilters({})}
            onClose={() => setShowResourceFilters(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
