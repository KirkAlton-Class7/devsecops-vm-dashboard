import { motion } from "framer-motion";
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

const getLogIcon = (type) => {
  const typeLower = type?.toLowerCase() || "";
  if (typeLower.includes("error")) {
    return <AlertCircle className="w-3 h-3 text-red-400" />;
  }
  if (typeLower.includes("warning")) {
    return <AlertTriangle className="w-3 h-3 text-amber-400" />;
  }
  return <Info className="w-3 h-3 text-cyan-400" />;
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
  ) {
    return "success";
  }
  if (status === "warning" || status === "pending" || status === "degraded") {
    return "warning";
  }
  if (
    status === "critical" ||
    status === "error" ||
    status === "failed" ||
    status === "unreachable" ||
    status === "unavailable" ||
    status === "stopped"
  ) {
    return "critical";
  }
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
  const totalRows = rows.length;
  const resolvedCycleLabel = cycleLabel || (isLogs ? "logs" : "resources");

  const getIncrements = () =>
    isLogs
      ? [5, 10, 15, 20, 25, 30]
      : [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];

  const cycleLimit = () => {
    const increments = getIncrements();
    if (limit >= totalRows) {
      onLimitChange?.(increments[0]);
      return;
    }
    const currentIndex = increments.indexOf(limit);
    const nextIndex = (currentIndex + 1) % increments.length;
    onLimitChange?.(increments[nextIndex]);
  };

  const displayedRows = rows.slice(0, limit);
  const displayText = limit >= totalRows ? `all ${totalRows}` : `${limit} of ${totalRows}`;

  const handleRowClick = () => {
    if (onRowClick) {
      const url = typeof onRowClick === "string" ? onRowClick : onRowClick();
      if (url) window.open(url, "_blank");
    }
  };

  // Empty state for idle resources (non‑logs)
  if (!isLogs && totalRows === 0) {
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

  return (
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
          <button
            onClick={cycleLimit}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors px-2 py-1 rounded border border-slate-700 hover:border-cyan-500/50"
            title={`Cycle ${resolvedCycleLabel} (${isLogs ? "5-30 step 5" : "3-30 step 3"})`}
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Cycle {resolvedCycleLabel}</span>
          </button>
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
              {displayedRows.map((row, idx) => {
                if (isLogs) {
                  return (
                    <motion.tr
                      key={`${row.name}-${idx}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      whileHover={{
                        scale: 1.01,
                        backgroundColor: "rgba(15, 23, 42, 0.4)",
                        transition: { duration: 0.2 },
                      }}
                      className="border-b border-slate-800/50 transition-all duration-200 cursor-pointer group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getLogIcon(row.type)}
                          <span className="text-xs font-mono text-slate-400">
                            {row.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            row.type === "error"
                              ? "bg-red-500/20 text-red-400"
                              : row.type === "warning"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-cyan-500/20 text-cyan-400"
                          }`}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300">
                          {row.scope}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{row.status}</td>
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
            {totalRows !== 1 ? "s" : ""}
          </p>
        </div>
      </Card>
    </motion.div>
  );
}