export const formatCurrency = (value) => {
  if (!value && value !== 0) return "N/A";
  if (typeof value === "number") return `$${value.toFixed(2)}`;
  const numeric = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? `$${numeric.toFixed(2)}` : String(value);
};

export const formatPercent = (value) => {
  if (!value && value !== 0) return "N/A";
  if (typeof value === "string" && value.trim().endsWith("%")) return value.trim();
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric.toFixed(1)}%` : String(value);
};

export const formatBytes = (mb) => {
  if (!mb && mb !== 0) return "N/A";
  if (mb > 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
};

export const formatRows = (items, formatter, fallback = "None") =>
  items?.length ? items.map(formatter).join("\n") : fallback;

const formatSnapshotTime = (date = new Date()) => {
  const value = date instanceof Date ? date : new Date(date);
  const safeDate = Number.isNaN(value.getTime()) ? new Date() : value;
  const pad = (item) => String(item).padStart(2, "0");
  return `${safeDate.getFullYear()}-${pad(safeDate.getMonth() + 1)}-${pad(safeDate.getDate())} ${pad(safeDate.getHours())}:${pad(safeDate.getMinutes())}:${pad(safeDate.getSeconds())}`;
};

const snapshotHeader = (heading) => `${heading}

Taken: ${formatSnapshotTime()}`;

export const budgetStatus = (budget) => {
  const spent = Number(budget?.spent ?? 0);
  const limit = Number(budget?.amount ?? budget?.limit ?? 0);
  const percentUsed = limit > 0 ? (spent / limit) * 100 : 0;

  if (budget?.status) return String(budget.status).toUpperCase();
  if (percentUsed >= 100) return "OVER BUDGET";
  if (percentUsed >= 90) return "CRITICAL";
  if (percentUsed >= 80) return "WARNING";
  return "OK";
};

export const buildBudgetSnapshot = (budget) => {
  const spent = Number(budget?.spent ?? 0);
  const limit = Number(budget?.amount ?? budget?.limit ?? 0);
  const percentUsed = limit > 0 ? (spent / limit) * 100 : 0;

  return `${snapshotHeader("BUDGET")}

Name: ${budget?.name || "Unnamed budget"}
Status: ${budgetStatus(budget)}
Spent: ${formatCurrency(spent)} / ${formatCurrency(limit)}
Percent used: ${formatPercent(percentUsed)}
Forecast: ${formatCurrency(budget?.forecast)}`;
};

export const buildDailyCostTrendSnapshot = (data = [], dailyBudget = 0) => `${snapshotHeader("DAILY COST TREND")}

Daily Budget: ${formatCurrency(dailyBudget)}
${formatRows(data, (day) => `${day.date || "Unknown"}: ${formatCurrency(day.value)}`)}`;

export const buildTopServicesSnapshot = (services = []) => `${snapshotHeader("TOP SERVICES BY COST")}

${formatRows(services, (service) => `${service.name || service.service || "Unknown"}: ${formatCurrency(service.value ?? service.cost)}`)}`;

export const buildCpuUtilizationSnapshot = (rows = []) => `${snapshotHeader("CPU UTILIZATION")}

${formatRows(rows, (vm) => {
  const id = vm.id || vm.instanceId || vm.instance || vm.name || "N/A";
  const name = vm.name || vm.instance || id;
  return `ID: ${id} | Name: ${name} | P95 CPU: ${formatPercent(vm.cpuP95 ?? vm.p95Cpu ?? vm.p95CPU)}`;
})}`;

export const buildRightsizingItemSnapshot = (rec = {}) => {
  const level = rec.level || rec.impact || "INFO";
  const recommendation = rec.details || rec.description || rec.recommendation || "No recommendation provided";
  const savings = rec.monthlySavings ?? rec.savingsMonthly ?? rec.savings ?? 0;

  return `${snapshotHeader("RIGHTSIZING RECOMMENDATIONS")}

Resource: ${rec.resource || rec.name || "Unknown resource"} | Recommendation: ${recommendation} | Level: [${String(level).toUpperCase()}] | Savings: ${formatCurrency(savings)}/mo`;
};

export const buildRightsizingSnapshot = (rows = []) => `${snapshotHeader("RIGHTSIZING RECOMMENDATIONS")}

${formatRows(rows, (rec) => {
  const level = rec.level || rec.impact || "INFO";
  const recommendation = rec.details || rec.description || rec.recommendation || "No recommendation provided";
  const savings = rec.monthlySavings ?? rec.savingsMonthly ?? rec.savings ?? 0;
  return `Resource: ${rec.resource || rec.name || "Unknown resource"} | Recommendation: ${recommendation} | Level: [${String(level).toUpperCase()}] | Savings: ${formatCurrency(savings)}/mo`;
})}`;

export const buildIdleResourcesSnapshot = (rows = [], heading = "IDLE RESOURCES") => `${snapshotHeader(heading)}

${formatRows(rows, (resource) => `${resource.name || "Unknown"} | Type: ${resource.type || "N/A"} | Scope: ${resource.scope || "N/A"} | Status: ${resource.status || "N/A"}`)}`;

export const buildSystemLoadTrendSnapshot = ({ currentLoad, historicalLoad = [], maxLoad }) => `${snapshotHeader("SYSTEM LOAD TREND")}

Current Load: ${currentLoad}
Peak: ${historicalLoad.length ? Math.max(...historicalLoad).toFixed(2) : "N/A"}
Average: ${historicalLoad.length ? (historicalLoad.reduce((sum, value) => sum + value, 0) / historicalLoad.length).toFixed(2) : "N/A"}
Max Scale: ${maxLoad}
Samples:
${formatRows(historicalLoad, (value, index) => `Sample ${index + 1}: ${Number(value).toFixed(2)}`)}`;

export const buildIdentitySnapshot = (identity = {}) => `${snapshotHeader("IDENTITY")}

Project: ${identity.project || "N/A"}
Instance ID: ${identity.instanceId || "N/A"}
Instance Name: ${identity.instanceName || "N/A"}
Hostname: ${identity.hostname || "N/A"}
Machine Type: ${identity.machineType || "N/A"}`;

export const buildNetworkSnapshot = (network = {}) => `${snapshotHeader("NETWORK")}

VPC: ${network.vpc || "N/A"}
Subnet: ${network.subnet || "N/A"}
Internal IP: ${network.internalIp || "N/A"}
External IP: ${network.externalIp || "N/A"}`;

export const buildLocationSnapshot = (location = {}) => `${snapshotHeader("LOCATION")}

Region: ${location.region || "N/A"}
Zone: ${location.zone || "N/A"}
Uptime: ${location.uptime || "N/A"}
Load (5m): ${location.loadAvg || "N/A"}`;

export const buildSystemResourcesSnapshot = (resources = {}) => {
  const memory = resources.memory || {};
  const disk = resources.disk || {};
  const cpu = resources.cpu || {};

  return `${snapshotHeader("SYSTEM RESOURCES")}

CPU Usage: ${formatPercent(cpu.usage)}
CPU Cores: ${cpu.cores || "N/A"}
CPU Frequency: ${cpu.frequency || "N/A"}
Load Avg: ${cpu.loadAvg || "N/A"}
Memory Total: ${formatBytes(memory.total)}
Memory Used: ${formatBytes(memory.used)}
Memory Available: ${formatBytes(memory.available)}
Disk Total: ${formatBytes(disk.total)}
Disk Used: ${formatBytes(disk.used)}
Disk Available: ${formatBytes(disk.available)}`;
};

export const buildMonitoringEndpointsSnapshot = (endpoints = []) => `${snapshotHeader("MONITORING ENDPOINTS")}

${formatRows(endpoints, (endpoint) => `${endpoint.name}: ${endpoint.url} [${endpoint.status}]`)}`;

export const buildServicesSnapshot = (services = []) => `${snapshotHeader("SERVICES")}

${formatRows(services, (service) => `${service.label}: ${service.value || "N/A"} [${service.status}]`)}`;

export const buildSystemLogsPayload = (logs = []) => ({
  system_logs: (logs || []).map((log) => ({
    timestamp:
      log?.timestamp ||
      log?.time ||
      log?.datetime ||
      log?.createdAt ||
      log?.name ||
      "N/A",
    level: String(log?.level || log?.type || "INFO").toUpperCase(),
    component: log?.component || log?.scope || log?.source || "app",
    message: log?.message || log?.status || "",
  })),
});

export const buildSystemLogsSnapshot = (logs = []) =>
  JSON.stringify(buildSystemLogsPayload(logs), null, 2);
