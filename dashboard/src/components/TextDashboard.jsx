import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Helper: format bytes (MB → GB/MB)
const formatBytes = (mb) => {
  if (!mb && mb !== 0) return "N/A";
  if (mb > 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${Math.round(mb)} MB`;
};

export default function TextDashboard({
  dashboard,
  tagline = "",
  onExitTextDash,
  logLimit,
  serviceLimit,
  onLogLimitChange,
  onServiceLimitChange,
  dashboardName = "DevSecOps Dashboard",
  flashTitle = false,
}) {
  const [copied, setCopied] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showHelp, setShowHelp] = useState(false);
  const [isTitleFlashing, setIsTitleFlashing] = useState(false);
  const flashTimeoutRef = useRef(null);
  const isFlashingRef = useRef(false);

  // Flash effect
  useEffect(() => {
    if (flashTitle && !isFlashingRef.current) {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      isFlashingRef.current = true;
      setIsTitleFlashing(true);
      flashTimeoutRef.current = setTimeout(() => {
        setIsTitleFlashing(false);
        isFlashingRef.current = false;
        flashTimeoutRef.current = null;
      }, 300);
    }
  }, [flashTitle]);

  // Service stats
  const serviceStats = {
    total: dashboard.services?.length || 0,
    healthy: dashboard.services?.filter((s) => s.status === "healthy").length || 0,
    warning: dashboard.services?.filter((s) => s.status === "warning").length || 0,
    critical: dashboard.services?.filter((s) => s.status === "critical").length || 0,
  };

  const hasIssues = serviceStats.critical > 0 || serviceStats.warning > 0;

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

  const cycleLogLimit = () => {
    const totalLogs = dashboard.logs?.length || 0;

    if (logLimit >= totalLogs) {
      onLogLimitChange(5);
      return;
    }

    const increments = [5, 10, 15, 20, 25, 30];
    const currentIndex = increments.indexOf(logLimit);
    const nextIndex = (currentIndex + 1) % increments.length;

    onLogLimitChange(increments[nextIndex]);
  };

  const cycleServiceLimit = () => {
    if (serviceLimit >= serviceStats.total) {
      onServiceLimitChange(3);
      return;
    }

    const increments = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
    const currentIndex = increments.indexOf(serviceLimit);
    const nextIndex = (currentIndex + 1) % increments.length;

    onServiceLimitChange(increments[nextIndex]);
  };

  const copySnapshot = useCallback(() => {
    const snapshot = generateTextSnapshot(
      dashboard,
      lastRefresh,
      logLimit,
      serviceLimit,
      dashboardName,
      tagline
    );

    navigator.clipboard.writeText(snapshot);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [dashboard, lastRefresh, logLimit, serviceLimit, dashboardName, tagline]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === "h" || e.key === "H") && e.repeat) {
        return;
      }

      if (e.key === "Escape") onExitTextDash();
      else if (e.key === "c" || e.key === "C") copySnapshot();
      else if (e.key === "h" || e.key === "H") setShowHelp((prev) => !prev);
      else if (e.key === "l" || e.key === "L") cycleLogLimit();
      else if (e.key === "s" || e.key === "S") cycleServiceLimit();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [copySnapshot, onExitTextDash, logLimit, serviceLimit]);

  useEffect(() => {
    const interval = setInterval(() => setLastRefresh(new Date()), 60000);

    return () => clearInterval(interval);
  }, []);

  const cpuRaw = dashboard.summaryCards?.find((c) => c.label === "CPU")?.value;
  const memRaw = dashboard.summaryCards?.find((c) => c.label === "Memory")?.value;
  const diskRaw = dashboard.summaryCards?.find((c) => c.label === "Disk")?.value;

  return (
    <div className="min-h-screen bg-black text-white font-mono p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="border-b border-white/20 pb-2 mb-4">
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <div
                className={`text-xl font-bold tracking-tight transition-all duration-200 ${
                  isTitleFlashing
                    ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
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

            <div className="flex gap-2 text-xs">
              <button
                onClick={onExitTextDash}
                className="px-2 py-1 border border-white/20 rounded hover:bg-white/10"
              >
                [Esc] EXIT
              </button>

              <button
                onClick={copySnapshot}
                className="px-2 py-1 border border-white/20 rounded hover:bg-white/10"
              >
                [C] {copied ? "COPIED" : "COPY"}
              </button>

              <button
                onClick={() => setShowHelp(!showHelp)}
                className="px-2 py-1 border border-white/20 rounded hover:bg-white/10"
              >
                [H] HELP
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 border border-white/20 rounded bg-white/5 text-xs"
            >
              <div className="font-bold mb-1">KEYBOARD SHORTCUTS</div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div>Esc - Exit text mode</div>
                <div>C - Copy snapshot</div>
                <div>H - Toggle help</div>
                <div>L - Cycle logs (5-30, step 5)</div>
                <div>S - Cycle services (3-30, step 3)</div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-3 border border-white/10 rounded">
            <div className="text-white/40 text-xs mb-2 uppercase tracking-wide">
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

          <div className="p-3 border border-white/10 rounded">
            <div className="text-white/40 text-xs mb-2 uppercase tracking-wide">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-3 border border-white/10 rounded">
            <div className="text-white/40 text-xs mb-2 uppercase tracking-wide">
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

          <div className="p-3 border border-white/10 rounded">
            <div className="text-white/40 text-xs mb-2 uppercase tracking-wide">
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

        <div className="p-3 border border-white/10 rounded mb-4">
          <div className="text-white/40 text-xs mb-2 uppercase tracking-wide">
            Monitoring Endpoints
          </div>

          <div className="space-y-1 text-sm">
            {dashboard.monitoringEndpoints?.length ? (
              dashboard.monitoringEndpoints.map((ep, idx) => (
                <div key={idx} className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-cyan-400">{ep.name}:</span>
                  <span className="text-white/40 text-xs">{ep.url}</span>
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

        <div className="p-3 border border-white/10 rounded mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="text-white/40 text-xs uppercase tracking-wide">
              SERVICES{" "}
              {serviceLimit >= serviceStats.total
                ? `(all ${serviceStats.total})`
                : `(${serviceLimit} of ${serviceStats.total})`}{" "}
              | {serviceStats.healthy} healthy | {serviceStats.warning} warning
              | {serviceStats.critical} critical
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {dashboard.services?.slice(0, serviceLimit).map((service) => (
              <div key={service.label} className="flex items-center gap-2">
                <span
                  className={
                    service.status === "critical"
                      ? "text-red-400"
                      : service.status === "warning"
                        ? "text-yellow-400"
                        : "text-white"
                  }
                >
                  {service.label}
                </span>

                <span className="text-white/30 text-xs">
                  [{service.status}]
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 border border-white/10 rounded">
          <div className="flex justify-between items-center mb-2">
            <div className="text-white/40 text-xs uppercase tracking-wide">
              LOGS{" "}
              {logLimit >= (dashboard.logs?.length || 0)
                ? `(all ${dashboard.logs?.length || 0})`
                : `(last ${logLimit})`}
            </div>
          </div>

          <div className="space-y-1 text-xs">
            {dashboard.logs?.slice(0, logLimit).map((log, idx) => (
              <div key={idx} className="font-mono">
                <span className="text-white/30">[{log.time}]</span>{" "}
                <span
                  className={
                    log.level === "ERROR"
                      ? "text-red-400"
                      : log.level === "WARN"
                        ? "text-yellow-400"
                        : "text-white/60"
                  }
                >
                  {log.level}
                </span>{" "}
                <span className="text-white/60">{log.message}</span>
              </div>
            ))}

            {(!dashboard.logs || dashboard.logs.length === 0) && (
              <div className="text-white/30">No logs available</div>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 pt-2 mt-4 text-center text-xs text-white/30">
          {dashboardName}
        </div>
      </div>
    </div>
  );
}

// Helper: generate snapshot for copying (includes detailed overview)
function generateTextSnapshot(
  dashboard,
  lastRefresh,
  logLimit,
  serviceLimit,
  dashboardName,
  tagline
) {
  const serviceStats = {
    total: dashboard.services?.length || 0,
    healthy: dashboard.services?.filter((s) => s.status === "healthy").length || 0,
    warning: dashboard.services?.filter((s) => s.status === "warning").length || 0,
    critical: dashboard.services?.filter((s) => s.status === "critical").length || 0,
  };
  const hasIssues = serviceStats.critical > 0 || serviceStats.warning > 0;
  const totalLogs = dashboard.logs?.length || 0;
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

  const cpuRaw = dashboard.summaryCards?.find((c) => c.label === "CPU")?.value;
  const memRaw = dashboard.summaryCards?.find((c) => c.label === "Memory")?.value;
  const diskRaw = dashboard.summaryCards?.find((c) => c.label === "Disk")?.value;

  const formatBytes = (mb) => {
    if (!mb && mb !== 0) return "N/A";
    if (mb > 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${Math.round(mb)} MB`;
  };

  return `
${dashboardName.toUpperCase()} SNAPSHOT
${tagline ? `${tagline}\n` : ""}
Taken: ${lastRefresh.toLocaleString()}

STATUS: ${hasIssues ? `${serviceStats.critical} critical, ${serviceStats.warning} warning` : "All systems operational"}

IDENTITY
Project: ${dashboard.identity?.project || "N/A"}
Instance ID: ${dashboard.identity?.instanceId || "N/A"}
Hostname: ${dashboard.identity?.hostname || "N/A"}
Machine type: ${dashboard.identity?.machineType || "N/A"}

OVERVIEW
CPU: ${formatMetric(cpuRaw)} | Cores: ${cpu.cores || "?"} | Load (1min): ${cpu.loadAvg || loadAvg || "?"}
Memory: ${formatMetric(memRaw)} | Total: ${formatBytes(memory.total)} | Avail: ${formatBytes(memory.available || memory.free)} | Used: ${formatBytes(memory.used)}
Disk: ${formatMetric(diskRaw)} | Total: ${formatBytes(disk.total)} | Avail: ${formatBytes(disk.available)} | Used: ${formatBytes(disk.used)}
Estimated Cost: ${getCostValue()}

NETWORK
VPC: ${dashboard.network?.vpc || "N/A"}
Subnet: ${dashboard.network?.subnet || "N/A"}
Internal IP: ${dashboard.network?.internalIp || "N/A"}
External IP: ${dashboard.network?.externalIp || "N/A"}

LOCATION
Region: ${dashboard.location?.region || "N/A"}
Zone: ${dashboard.location?.zone || "N/A"}
Uptime: ${dashboard.meta?.uptime || "N/A"}
5-min load avg: ${loadAvg}

MONITORING ENDPOINTS
${dashboard.monitoringEndpoints?.map((ep) => `${ep.name}: ${ep.url} [${ep.status}]`).join("\n") || "None"}

SERVICES (${serviceLimit >= serviceStats.total ? `all ${serviceStats.total}` : `${serviceLimit} of ${serviceStats.total}`})
${dashboard.services?.slice(0, serviceLimit).map((s) => `${s.label} [${s.status}]`).join("\n")}

LOGS ${logLimit >= totalLogs ? `(all ${totalLogs})` : `(last ${logLimit})`}
${dashboard.logs?.slice(0, logLimit).map((log) => `[${log.time}] ${log.level}: ${log.message}`).join("\n")}
`;
}
