import { motion } from "framer-motion";
import { ChevronRight, Server, Database, Shield, Code, AlertCircle, Info, AlertTriangle, RefreshCw } from "lucide-react";
import Card from "./Card";
import StatusDot from "./StatusDot";

const getScopeIcon = (scope) => {
  switch(scope?.toLowerCase()) {
    case "system": return <Server className="w-3 h-3" />;
    case "database": return <Database className="w-3 h-3" />;
    case "security": return <Shield className="w-3 h-3" />;
    default: return <Code className="w-3 h-3" />;
  }
};

const getLogIcon = (type) => {
  const typeLower = type?.toLowerCase() || "";
  if (typeLower.includes("error")) return <AlertCircle className="w-3 h-3 text-red-400" />;
  if (typeLower.includes("warning")) return <AlertTriangle className="w-3 h-3 text-amber-400" />;
  return <Info className="w-3 h-3 text-cyan-400" />;
};

const getStatusDotStatus = (rowStatus) => {
  const status = rowStatus?.toLowerCase() || "";
  if (status === "running" || status === "installed" || status === "reachable" || 
      status === "ready" || status === "successful" || status === "active" ||
      status === "serving" || status === "completed" || status === "healthy") {
    return "success";
  }
  if (status === "warning" || status === "pending" || status === "degraded") {
    return "warning";
  }
  if (status === "critical" || status === "error" || status === "failed" || 
      status === "unreachable" || status === "unavailable" || status === "stopped") {
    return "critical";
  }
  return "healthy";
};

export default function ResourceTable({ rows, title = "Resources", subtitle = "Service logs and operational events", isLogs = false, limit, onLimitChange }) {
  const totalRows = rows.length;
  
  const getIncrements = () => isLogs ? [5, 10, 15, 20, 25, 30] : [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
  
  const cycleLimit = () => {
    const increments = getIncrements();
    if (limit >= totalRows) {
      onLimitChange(increments[0]);
      return;
    }
    const currentIndex = increments.indexOf(limit);
    const nextIndex = (currentIndex + 1) % increments.length;
    onLimitChange(increments[nextIndex]);
  };
  
  const displayedRows = rows.slice(0, limit);
  const isShowingAll = limit >= totalRows;
  const displayText = isShowingAll ? `all ${totalRows}` : `${limit} of ${totalRows}`;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card title={title} subtitle={subtitle}>
        <div className="flex justify-between items-center mb-3 px-1">
          <div className="text-xs text-slate-500">
            Showing {displayText} {isLogs ? 'log entries' : 'resources'}
          </div>
          <button
            onClick={cycleLimit}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors px-2 py-1 rounded border border-slate-700 hover:border-cyan-500/50"
            title={`Cycle ${isLogs ? 'logs' : 'services'} (${isLogs ? '5‑30 step 5' : '3‑30 step 3'})`}
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Cycle {isLogs ? 'logs' : 'services'}</span>
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
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
                        transition: { duration: 0.2 }
                      }}
                      className="border-b border-slate-800/50 transition-all duration-200 cursor-pointer group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getLogIcon(row.type)}
                          <span className="text-xs font-mono text-slate-400">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          row.type === "error" ? "bg-red-500/20 text-red-400" :
                          row.type === "warning" ? "bg-amber-500/20 text-amber-400" :
                          "bg-cyan-500/20 text-cyan-400"
                        }`}>
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
                    key={`${row.name}-${row.type}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    whileHover={{ 
                      scale: 1.01,
                      backgroundColor: "rgba(15, 23, 42, 0.4)",
                      transition: { duration: 0.2 }
                    }}
                    className="border-b border-slate-800/50 transition-all duration-200 cursor-pointer group"
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
                        <StatusDot 
                          status={statusDotStatus} 
                          size="sm"
                          showTooltip={true}
                          animated={true}
                        />
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
            Showing {displayText} {isLogs ? 'log entry' : 'resource'}{totalRows !== 1 ? 's' : ''}
          </p>
        </div>
      </Card>
    </motion.div>
  );
}