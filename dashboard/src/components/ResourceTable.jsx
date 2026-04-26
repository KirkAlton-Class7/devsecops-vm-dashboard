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

  // Pagination states (offset‑based, older logs only)
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [offset, setOffset] = useState(0);
  const PAGE_SIZE = 200;

  const totalRowsCount = rows.length;
  const resolvedCycleLabel = cycleLabel || (isLogs ? "logs" : "resources");
  const getIncrements = () =>
    isLogs ? [5, 10, 15, 20, 25, 30] : [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];

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

  // Fetch initial logs (newest first, offset=0)
  const fetchInitialLogs = async () => {
    setLoadingLogs(true);
    setLogError(null);
    setAllLogs([]);
    setCopiedLogId(null);
    setHasOlder(false);
    setOffset(0);
    try {
      const url = `/api/logs?limit=${PAGE_SIZE}&offset=0`;
      console.log('[Modal] Fetching', url);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Expecting { logs: [...], hasMore: boolean, offset: number }
      const logs = data.logs || [];
      const hasMore = data.hasMore || false;
      if (logs.length) {
        setAllLogs(logs);
        setOffset(logs.length);
        setHasOlder(hasMore);
      } else {
        setAllLogs([]);
      }
    } catch (err) {
      console.error('[Modal] Fetch error', err);
      setLogError(err.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Load older logs (append to the end, increase offset)
  const loadOlderLogs = async () => {
    if (loadingOlder || !hasOlder) return;
    setLoadingOlder(true);
    try {
      const url = `/api/logs?limit=${PAGE_SIZE}&offset=${offset}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const newLogs = data.logs || [];
      const more = data.hasMore || false;
      if (newLogs.length) {
        setAllLogs((prev) => [...prev, ...newLogs]);
        setOffset(offset + newLogs.length);
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

  // For the main table, newest logs at the top when isLogs is true
  const logsToDisplay = isLogs ? [...displayedRows].reverse() : displayedRows;
  // In the modal, allLogs is already newest-first (from API)
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

      {/* All Logs Modal with offset‑based pagination */}
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
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-cyan-400" />
                  System Logs ({allLogs.length} shown)
                </h2>
                <button
                  onClick={closeModal}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
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
                    {/* Log entries (already sorted newest first) */}
                    <div className="space-y-2">
                      {displayLogs.map((log, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleCopyLog(log, idx)}
                          className={`group p-3 rounded-xl border border-white/5 transition-all cursor-pointer ${
                            log.level === "ERROR"
                              ? "hover:bg-red-500/10"
                              : log.level === "WARN"
                              ? "hover:bg-amber-500/10"
                              : "hover:bg-cyan-500/10"
                          }`}
                        >
                          <div className="flex items-start gap-2 text-sm">
                            <div className="flex-shrink-0 mt-0.5">
                              {log.level === "ERROR" && <AlertCircle className="w-4 h-4 text-red-400" />}
                              {log.level === "WARN" && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                              {log.level === "INFO" && <Info className="w-4 h-4 text-cyan-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs text-slate-500">{log.time}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getLevelBadgeStyle(log.level)}`}>
                                  {log.level}
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
                      ))}
                    </div>

                    {/* Button: Show Older Logs (at the bottom) */}
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