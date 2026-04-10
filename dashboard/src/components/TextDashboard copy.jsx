import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function TextDashboard({ dashboard, onPowerOn, logLimit, serviceLimit, onLogLimitChange, onServiceLimitChange, dashboardName = "DevSecOps Dashboard" }) {
  const [copied, setCopied] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showHelp, setShowHelp] = useState(false);

  // Service stats
  const serviceStats = {
    total: dashboard.services?.length || 0,
    healthy: dashboard.services?.filter(s => s.status === "healthy").length || 0,
    warning: dashboard.services?.filter(s => s.status === "warning").length || 0,
    critical: dashboard.services?.filter(s => s.status === "critical").length || 0
  };

  const hasIssues = serviceStats.critical > 0 || serviceStats.warning > 0;

  // Logs cycle: if already showing all logs, reset to 5; else go to next step
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

  // Services cycle: if already showing all services, reset to 3; else go to next step
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
    const snapshot = generateTextSnapshot(dashboard, lastRefresh, logLimit, serviceLimit, dashboardName);
    navigator.clipboard.writeText(snapshot);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [dashboard, lastRefresh, logLimit, serviceLimit, dashboardName]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // For R and H: ignore repeated events (holding key)
      if ((e.key === "r" || e.key === "R" || e.key === "h" || e.key === "H") && e.repeat) {
        return;
      }

      if (e.key === "Escape") onPowerOn();
      else if (e.key === "c" || e.key === "C") copySnapshot();
      else if (e.key === "r" || e.key === "R") window.location.reload();
      else if (e.key === "h" || e.key === "H") setShowHelp(prev => !prev);
      else if (e.key === "l" || e.key === "L") cycleLogLimit();
      else if (e.key === "s" || e.key === "S") cycleServiceLimit();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [copySnapshot, onPowerOn, logLimit, serviceLimit]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => setLastRefresh(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-mono p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="border-b border-white/20 pb-2 mb-4">
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div>
              <div className="text-xl font-bold tracking-tight">{dashboardName}</div>
              <div className="text-xs text-white/40 mt-1">
                {new Date().toLocaleDateString()} | {lastRefresh.toLocaleTimeString()} | auto-refresh: 60s
              </div>
            </div>
            <div className="flex gap-2 text-xs">
              <button onClick={onPowerOn} className="px-2 py-1 border border-white/20 rounded hover:bg-white/10">[Esc] EXIT</button>
              <button onClick={copySnapshot} className="px-2 py-1 border border-white/20 rounded hover:bg-white/10">[C] {copied ? "COPIED" : "COPY"}</button>
              <button onClick={() => setShowHelp(!showHelp)} className="px-2 py-1 border border-white/20 rounded hover:bg-white/10">[H] HELP</button>
            </div>
          </div>
        </div>

        {/* Help Panel */}
        <AnimatePresence>
          {showHelp && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 border border-white/20 rounded bg-white/5 text-xs">
              <div className="font-bold mb-1">KEYBOARD SHORTCUTS</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div>Esc - Exit text mode</div>
                <div>C - Copy snapshot</div>
                <div>R - Refresh page</div>
                <div>H - Toggle help</div>
                <div>L - Cycle logs (5‑30, step 5)</div>
                <div>S - Cycle services (3‑30, step 3)</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status line */}
        <div className={`mb-4 p-2 border-l-4 ${hasIssues ? 'border-red-500 bg-red-500/5' : 'border-white/40'}`}>
          {hasIssues ? `ALERT: ${serviceStats.critical} critical, ${serviceStats.warning} warning` : "STATUS: All systems operational"}
        </div>

        {/* IDENTITY + OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-3 border border-white/10 rounded">
            <div className="text-white/40 text-xs mb-2 uppercase tracking-wide">Identity</div>
            <div className="space-y-1 text-sm">
              <div>Project:      {dashboard.identity?.project || "N/A"}</div>
              <div>Instance ID:  {dashboard.identity?.instanceId || "N/A"}</div>
              <div>Hostname:     {dashboard.identity?.hostname || "N/A"}</div>
              <div>Machine type: {dashboard.identity?.instanceType || "N/A"}</div>
            </div>
          </div>
          <div className="p-3 border border-white/10 rounded">
            <div className="text-white/40 text-xs mb-2 uppercase tracking-wide">Overview</div>
            <div className="space-y-1 text-sm">
              <div>CPU:     {dashboard.summaryCards?.find(c => c.label === "CPU")?.value || "N/A"}%</div>
              <div>Memory:  {dashboard.summaryCards?.find(c => c.label === "Memory")?.value || "N/A"}%</div>
              <div>Disk:    {dashboard.summaryCards?.find(c => c.label === "Disk")?.value || "N/A"}%</div>
              <div>Cost:    {dashboard.summaryCards?.find(c => c.label === "Cost")?.value || "$0.00"}/month</div>
            </div>
          </div>
        </div>

        {/* NETWORK + LOCATION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-3 border border-white/10 rounded">
            <div className="text-white/40 text-xs mb-2 uppercase tracking-wide">Network</div>
            <div className="space-y-1 text-sm">
              <div>VPC:         {dashboard.network?.vpcId || "N/A"}</div>
              <div>Subnet:      {dashboard.network?.subnetId || "N/A"}</div>
              <div>Internal IP: {dashboard.network?.privateIp || "N/A"}</div>
              <div>External IP: {dashboard.network?.publicIp || "N/A"}</div>
            </div>
          </div>
          <div className="p-3 border border-white/10 rounded">
            <div className="text-white/40 text-xs mb-2 uppercase tracking-wide">Location</div>
            <div className="space-y-1 text-sm">
              <div>Region: {dashboard.location?.region || "N/A"}</div>
              <div>Zone:   {dashboard.location?.availabilityZone || "N/A"}</div>
              <div>Uptime: {dashboard.meta?.uptime || "N/A"}</div>
              <div>5-min load avg: {dashboard.systemResources?.load5 || "0.00"}</div>
            </div>
          </div>
        </div>

        {/* MONITORING ENDPOINTS */}
        <div className="p-3 border border-white/10 rounded mb-4">
          <div className="text-white/40 text-xs mb-2 uppercase tracking-wide">Monitoring Endpoints</div>
          <div className="space-y-1 text-sm">
            {dashboard.monitoringEndpoints?.length ? (
              dashboard.monitoringEndpoints.map((ep, idx) => (
                <div key={idx} className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-white/60">{ep.name}:</span>
                  <span className="text-white/40 text-xs">{ep.url}</span>
                  <span className={ep.status === "up" ? "text-green-400" : "text-red-400"}>[{ep.status}]</span>
                </div>
              ))
            ) : (
              <div className="text-white/30">No endpoints configured</div>
            )}
          </div>
        </div>

        {/* SERVICES CARD */}
        <div className="p-3 border border-white/10 rounded mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="text-white/40 text-xs uppercase tracking-wide">
              SERVICES {serviceLimit >= serviceStats.total 
                ? `(all ${serviceStats.total})` 
                : `(${serviceLimit} of ${serviceStats.total})`} 
              | {serviceStats.healthy} healthy | {serviceStats.warning} warning | {serviceStats.critical} critical
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {dashboard.services?.slice(0, serviceLimit).map((service) => (
              <div key={service.label} className="flex items-center gap-2">
                <span className={service.status === "critical" ? "text-red-400" : service.status === "warning" ? "text-yellow-400" : "text-white"}>
                  {service.label}
                </span>
                <span className="text-white/30 text-xs">[{service.status}]</span>
              </div>
            ))}
          </div>
        </div>

        {/* LOGS CARD */}
        <div className="p-3 border border-white/10 rounded">
          <div className="flex justify-between items-center mb-2">
            <div className="text-white/40 text-xs uppercase tracking-wide">
              LOGS {logLimit >= (dashboard.logs?.length || 0) 
                ? `(all ${dashboard.logs?.length || 0})` 
                : `(last ${logLimit})`}
            </div>
          </div>
          <div className="space-y-1 text-xs">
            {dashboard.logs?.slice(0, logLimit).map((log, idx) => (
              <div key={idx} className="font-mono">
                <span className="text-white/30">[{log.time}]</span>{" "}
                <span className={log.level === "ERROR" ? "text-red-400" : log.level === "WARN" ? "text-yellow-400" : "text-white/60"}>
                  {log.level}
                </span>{" "}
                <span className="text-white/60">{log.message}</span>
              </div>
            ))}
            {(!dashboard.logs || dashboard.logs.length === 0) && <div className="text-white/30">No logs available</div>}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 pt-2 mt-4 text-center text-xs text-white/30">
          {dashboardName}
        </div>
      </div>
    </div>
  );
}

// Helper: generate snapshot for copying (updated to include dashboardName)
function generateTextSnapshot(dashboard, lastRefresh, logLimit, serviceLimit, dashboardName) {
  const serviceStats = {
    total: dashboard.services?.length || 0,
    healthy: dashboard.services?.filter(s => s.status === "healthy").length || 0,
    warning: dashboard.services?.filter(s => s.status === "warning").length || 0,
    critical: dashboard.services?.filter(s => s.status === "critical").length || 0
  };
  const hasIssues = serviceStats.critical > 0 || serviceStats.warning > 0;
  const totalLogs = dashboard.logs?.length || 0;

  return `
${dashboardName.toUpperCase()} SNAPSHOT
Taken: ${lastRefresh.toLocaleString()}

STATUS: ${hasIssues ? `${serviceStats.critical} critical, ${serviceStats.warning} warning` : "All systems operational"}

IDENTITY
Project: ${dashboard.identity?.project || "N/A"}
Instance ID: ${dashboard.identity?.instanceId || "N/A"}
Hostname: ${dashboard.identity?.hostname || "N/A"}
Machine type: ${dashboard.identity?.instanceType || "N/A"}

OVERVIEW
CPU: ${dashboard.summaryCards?.find(c => c.label === "CPU")?.value || "N/A"}%
Memory: ${dashboard.summaryCards?.find(c => c.label === "Memory")?.value || "N/A"}%
Disk: ${dashboard.summaryCards?.find(c => c.label === "Disk")?.value || "N/A"}%
Cost: ${dashboard.summaryCards?.find(c => c.label === "Cost")?.value || "$0.00"}

NETWORK
VPC: ${dashboard.network?.vpcId || "N/A"}
Subnet: ${dashboard.network?.subnetId || "N/A"}
Internal IP: ${dashboard.network?.privateIp || "N/A"}
External IP: ${dashboard.network?.publicIp || "N/A"}

LOCATION
Region: ${dashboard.location?.region || "N/A"}
Zone: ${dashboard.location?.availabilityZone || "N/A"}
Uptime: ${dashboard.meta?.uptime || "N/A"}
5-min load avg: ${dashboard.systemResources?.load5 || "0.00"}

MONITORING ENDPOINTS
${dashboard.monitoringEndpoints?.map(ep => `${ep.name}: ${ep.url} [${ep.status}]`).join("\n") || "None"}

SERVICES (${serviceLimit >= serviceStats.total ? `all ${serviceStats.total}` : `${serviceLimit} of ${serviceStats.total}`})
${dashboard.services?.slice(0, serviceLimit).map(s => `${s.label} [${s.status}]`).join("\n")}

LOGS ${logLimit >= totalLogs ? `(all ${totalLogs})` : `(last ${logLimit})`}
${dashboard.logs?.slice(0, logLimit).map(log => `[${log.time}] ${log.level}: ${log.message}`).join("\n")}
`;
}