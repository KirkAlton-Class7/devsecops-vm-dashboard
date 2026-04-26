import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";
import {
  ChevronRight,
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
  Copy,
  Check,
  X,
  ArrowDown
} from "lucide-react";
import Card from "./Card";
import StatusDot from "./StatusDot";

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

const getLogSortValue = (log) => {
  const raw =
    log.timestamp ||
    log.datetime ||
    log.isoTime ||
    log.iso_time ||
    log.createdAt ||
    log.created_at ||
    log.time ||
    "";

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

const orderLogsNewestFirst = (logs) =>
  logs
    .map((log, index) => ({ log, index }))
    .sort((a, b) => {
      const timeDiff = getLogSortValue(b.log) - getLogSortValue(a.log);
      return timeDiff || a.index - b.index;
    })
    .map(({ log }) => log);

const fetchLogsJson = async ({ limit, offset = 0, minutes } = {}) => {
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
  onLimitChange,
  cycleLabel,
  onRowClick,
}) {
  const [showAllLogsModal, setShowAllLogsModal] = useState(false);
  const [allLogs, setAllLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logError, setLogError] = useState(null);
  const [copiedLogId, setCopiedLogId] = useState(null);
  const [refreshMessage, setRefreshMessage] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingRange, setIsFetchingRange] = useState(false);
  const [isRangeFetchFlashing, setIsRangeFetchFlashing] = useState(false);
  const [timeRangeMinutes, setTimeRangeMinutes] = useState("10");
  const rangeFetchTimeoutRef = useRef(null);
  const logsContainerRef = useRef(null);

  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [offset, setOffset] = useState(0);
  const PAGE_SIZE = 200;

  const totalRowsCount = rows.length;
  const resolvedCycleLabel = cycleLabel || (isLogs ? "logs" : "resources");
  const getIncrements = () =>
    isLogs ? [5, 10, 15, 20, 25, 30] : [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];

  const scrollLogsToTop = () => {
    requestAnimationFrame(() => {
      logsContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const cycleLimit = () => {
    const increments = getIncrements();
    if (limit >= totalRowsCount) {
      onLimitChange?.(increments[0]);
      return;
    }
    const currentIndex = increments.indexOf(limit);
    const nextIndex = (currentIndex + 1) % increments.length;
    onLimitChange?.(increments[nextIndex]);
  };

  const displayedRows = rows.slice(0, limit);
  const displayText =
    limit >= totalRowsCount ? `all ${totalRowsCount}` : `${limit} of ${totalRowsCount}`;

  const handleRowClick = () => {
    if (onRowClick) {
      const url = typeof onRowClick === "string" ? onRowClick : onRowClick();
      if (url) window.open(url, "_blank");
    }
  };

  const fetchInitialLogs = async () => {
    setLoadingLogs(true);
    setLogError(null);
    setAllLogs([]);
    setCopiedLogId(null);
    setHasOlder(false);
    setOffset(0);
    try {
      const data = await fetchLogsJson({ limit: PAGE_SIZE, offset: 0 });
      const logs = data.logs || [];
      const hasMore = data.hasMore || false;

      setAllLogs(orderLogsNewestFirst(logs));
      setOffset(logs.length);
      setHasOlder(hasMore);
      scrollLogsToTop();
    } catch (err) {
      console.error(err);
      setLogError(err.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  const refreshLogs = async () => {
    setIsRefreshing(true);
    setLogError(null);
    setCopiedLogId(null);
    setHasOlder(false);
    setOffset(0);

    const raw = timeRangeMinutes.trim();
    const minutes = raw === "" ? 10 : parseInt(raw, 10);
    const refreshMinutes = isNaN(minutes) || minutes <= 0 ? 10 : minutes;

    try {
      const data = await fetchLogsJson({
        limit: PAGE_SIZE,
        offset: 0,
        minutes: refreshMinutes,
      });

      const fetchedLogs = data.logs || [];
      const hasMore = data.hasMore || false;
      const liveLogs = getLiveDashboardLogs(rows, refreshMinutes);
      const mergedLogs = orderLogsNewestFirst([...liveLogs, ...fetchedLogs]);

      setAllLogs(mergedLogs);
      setOffset(fetchedLogs.length);
      setHasOlder(hasMore);
      setRefreshMessage(
        mergedLogs.length
          ? `Newest logs from last ${refreshMinutes} min`
          : `No logs in last ${refreshMinutes} min`
      );
      setTimeout(() => setRefreshMessage(null), 2000);
      scrollLogsToTop();
    } catch (err) {
      console.error(err);
      setLogError(err.message);
    } finally {
      setIsRefreshing(false);
    }
  };


    try {
      const data = await fetchLogsJson({ limit: PAGE_SIZE, offset: 0 });
      const logs = data.logs || [];
      const hasMore = data.hasMore || false;

      setAllLogs(orderLogsNewestFirst(logs));
      setOffset(logs.length);
      setHasOlder(hasMore);
      setRefreshMessage(logs.length ? "Newest logs loaded" : "No logs found");
      setTimeout(() => setRefreshMessage(null), 2000);
      scrollLogsToTop();
    } catch (err) {
      console.error(err);
      setLogError(err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchLogsByTimeRange = async () => {
    const raw = timeRangeMinutes.trim();
    const minutes = raw === "" ? 0 : parseInt(raw, 10);
    if (isNaN(minutes) || minutes <= 0) return;

    if (rangeFetchTimeoutRef.current) clearTimeout(rangeFetchTimeoutRef.current);
    setIsRangeFetchFlashing(true);
    rangeFetchTimeoutRef.current = setTimeout(() => {
      setIsRangeFetchFlashing(false);
      rangeFetchTimeoutRef.current = null;
    }, 200);

    setIsFetchingRange(true);
    setLogError(null);
    setAllLogs([]);
    setCopiedLogId(null);
    setHasOlder(false);
    setOffset(0);

    try {
      const data = await fetchLogsJson({ limit: PAGE_SIZE, offset: 0, minutes });
      const logs = data.logs || [];
      const hasMore = data.hasMore || false;

      setAllLogs(orderLogsNewestFirst(logs));
      setOffset(logs.length);
      setHasOlder(hasMore);
      setRefreshMessage(
        logs.length ? `Newest logs from last ${minutes} min` : `No logs in last ${minutes} min`
      );
      setTimeout(() => setRefreshMessage(null), 3000);
      scrollLogsToTop();
    } catch (err) {
      console.error(err);
      setLogError(err.message);
    } finally {
      setIsFetchingRange(false);
    }
  };

  const loadOlderLogs = async () => {
    if (loadingOlder || !hasOlder) return;
    setLoadingOlder(true);
    try {
      const data = await fetchLogsJson({ limit: PAGE_SIZE, offset });
      const newLogs = data.logs || [];
      const more = data.hasMore || false;

      if (newLogs.length) {
        setAllLogs((prev) => orderLogsNewestFirst([...prev, ...newLogs]));
        setOffset((prevOffset) => prevOffset + newLogs.length);
        setHasOlder(more);
      } else {
        setHasOlder(false);
      }
    } catch (err) {
      console.error(err);
      setLogError(err.message);
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleCopyLog = (log, index) => {
    const text = `[${log.time}] ${log.level}: ${log.source} - ${log.message}`;
    navigator.clipboard.writeText(text);
    setCopiedLogId(index);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  const openModal = () => {
    fetchInitialLogs();
    setShowAllLogsModal(true);
  };

  const closeModal = () => setShowAllLogsModal(false);

  if (!isLogs && totalRowsCount === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card title={title} subtitle={subtitle}>
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

  const logsToDisplay = isLogs ? orderLogsNewestFirst(displayedRows) : displayedRows;
  const displayLogs = allLogs;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card title={title} subtitle={subtitle}>
          <div className="flex justify-between items-center mb-3 px-1">
            <div className="text-xs text-slate-500">
              Showing {displayText} {isLogs ? "log entries" : "resources"}
            </div>
            <div className="flex gap-2">
              {isLogs && (
                <button
                  onClick={openModal}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors px-2 py-1 rounded border border-slate-700 hover:border-cyan-500/50"
                  title="View all logs"
                >
                  <Eye className="w-3 h-3" />
                  <span className="hidden sm:inline">View All</span>
                </button>
              )}
              <button
                onClick={cycleLimit}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors px-2 py-1 rounded border border-slate-700 hover:border-cyan-500/50"
                title={`Cycle ${resolvedCycleLabel}`}
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">Cycle {resolvedCycleLabel}</span>
              </button>
            </div>
          </div>

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
                    const timestamp = row.time || row.name || "";
                    const level = (row.level || "INFO").toUpperCase();
                    const source = row.scope || row.source || "";
                    const message = row.message || row.status || "";
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
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              Showing {displayText} {isLogs ? "log entry" : "resource"}
              {totalRowsCount !== 1 ? "s" : ""}
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
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 flex-wrap gap-2">
                <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-cyan-400" />
                  System Logs ({allLogs.length} shown)
                </h2>
                <div className="flex items-center gap-3 flex-wrap">
                  {refreshMessage && (
                    <span className="text-emerald-400 text-xs flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {refreshMessage}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
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
                      onClick={fetchLogsByTimeRange}
                      disabled={isFetchingRange}
                      className={`px-2 py-1 text-xs rounded transition-all disabled:opacity-50 ${
                        isRangeFetchFlashing
                          ? "bg-cyan-500/30 text-white shadow-[0_0_8px_cyan] border-cyan-400"
                          : "border border-cyan-500/50 text-cyan-400 hover:text-cyan-300 hover:border-cyan-400"
                      }`}
                    >
                      {isFetchingRange ? "Fetching..." : "Fetch"}
                    </button>
                  </div>
                  <button
                    onClick={refreshLogs}
                    disabled={isRefreshing}
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                    title="Refresh logs"
                  >
                    {isRefreshing ? (
                      <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
                    ) : (
                      <RefreshCw className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  <button
                    onClick={closeModal}
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
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
                      onClick={fetchInitialLogs}
                      className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm"
                    >
                      Retry
                    </button>
                  </div>
                ) : allLogs.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">No logs found.</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {displayLogs.map((log, idx) => {
                        const level = (log.level || "INFO").toUpperCase();

                        return (
                          <div
                            key={`${log.time}-${log.source}-${idx}`}
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
                                  <span className="font-mono text-xs text-slate-500">{log.time}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${getLevelBadgeStyle(level)}`}>
                                    {level}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                                    {log.source}
                                  </span>
                                  {copiedLogId === idx && (
                                    <span className="text-emerald-400 text-xs flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Copied!
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-300 text-sm mt-1 break-words">{log.message}</p>
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
      </AnimatePresence>
    </>
  );
}
