const formatLocalDateTime = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const formatSnapshotTime = (value) => {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? formatLocalDateTime(new Date()) : formatLocalDateTime(date);
};

const getLogTime = (log) =>
  log?.time || log?.timestamp || log?.datetime || log?.createdAt || "";

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

const formatMetric = (value) => {
  if (!value && value !== 0) return "N/A";
  const cleaned = value.toString().replace(/%$/, "");
  return `${cleaned}%`;
};

const formatBytes = (mb) => {
  if (!mb && mb !== 0) return "N/A";
  if (mb > 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return "N/A";
  if (typeof value === "number") return `$${value.toFixed(2)}`;
  const numeric = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isNaN(numeric)) return `$${numeric.toFixed(2)}`;
  return String(value);
};

const toNumber = (value, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const numeric = parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : fallback;
};

const formatPercent = (value) => {
  if (!value && value !== 0) return "N/A";
  if (typeof value === "string" && value.trim().endsWith("%")) return value.trim();
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric.toFixed(1)}%` : String(value);
};

const getSummaryValue = (summaryCards, label) => {
  const card = summaryCards?.find((item) => item.label === label);
  return card?.value;
};

const getCostValue = (dashboard) => {
  const costCard = dashboard.summaryCards?.find(
    (card) => card.label === "Estimated Cost" || card.label === "Cost"
  );
  return formatCurrency(costCard?.value);
};

const parseLoadValues = (value) => {
  if (Array.isArray(value)) return value.filter((item) => item || item === 0).map(String);
  if (!value && value !== 0) return [];
  return String(value)
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const getLoadMetrics = (dashboard) => {
  const systemResources = dashboard.systemResources || {};
  const cpu = systemResources.cpu || {};
  const location = dashboard.location || {};
  const source =
    cpu.loadAvg ||
    systemResources.loadAvg ||
    location.loadAvg ||
    systemResources.load5 ||
    location.load5 ||
    "";
  const parsed = parseLoadValues(source);

  return {
    one: cpu.load1 || systemResources.load1 || location.load1 || parsed[0] || "N/A",
    five:
      cpu.load5 ||
      systemResources.load5 ||
      location.load5 ||
      parsed[1] ||
      parsed[0] ||
      "N/A",
    fifteen:
      cpu.load15 ||
      systemResources.load15 ||
      location.load15 ||
      parsed[2] ||
      "N/A",
  };
};

const getBudgetStatus = (budget, percentUsed) => {
  if (budget?.status) return String(budget.status).toUpperCase();
  if (percentUsed >= 100) return "OVER BUDGET";
  if (percentUsed >= 90) return "CRITICAL";
  if (percentUsed >= 80) return "WARNING";
  return "OK";
};

const formatList = (items, formatter, fallback = "None") => {
  if (!items?.length) return fallback;
  return items.map(formatter).join("\n");
};

export function generateDashboardSnapshot({
  mode = "devsecops",
  dashboard = {},
  finopsData = null,
  lastRefresh = new Date(),
  logLimit = 30,
  serviceLimit = 10,
  dashboardName = "DevSecOps Dashboard",
  tagline = "Real-time infrastructure monitoring",
} = {}) {
  if (mode === "finops") {
    return generateFinOpsSnapshot({
      data: finopsData,
      lastRefresh,
    });
  }

  return generateDevSecOpsSnapshot({
    dashboard,
    lastRefresh,
    logLimit,
    serviceLimit,
    dashboardName,
    tagline,
  });
}

export function generateDashboardJsonSnapshot({
  mode = "devsecops",
  dashboard = {},
  finopsData = null,
  lastRefresh = new Date(),
  logLimit = 30,
  serviceLimit = 10,
  dashboardName = "DevSecOps Dashboard",
} = {}) {
  if (mode === "finops") {
    return generateFinOpsJsonSnapshot({
      data: finopsData,
      lastRefresh,
    });
  }

  return generateDevSecOpsJsonSnapshot({
    dashboard,
    lastRefresh,
    logLimit,
    serviceLimit,
    dashboardName,
  });
}

function generateDevSecOpsSnapshot({
  dashboard,
  lastRefresh,
  logLimit,
  serviceLimit,
  dashboardName,
  tagline,
}) {
  const serviceStats = {
    total: dashboard.services?.length || 0,
    healthy: dashboard.services?.filter((service) => service.status === "healthy").length || 0,
    warning: dashboard.services?.filter((service) => service.status === "warning").length || 0,
    critical: dashboard.services?.filter((service) => service.status === "critical").length || 0,
  };
  const hasIssues = serviceStats.critical > 0 || serviceStats.warning > 0;
  const totalLogs = dashboard.logs?.length || 0;
  const load = getLoadMetrics(dashboard);

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

  const cpuRaw = dashboard.summaryCards?.find((card) => card.label === "CPU")?.value;
  const memRaw = dashboard.summaryCards?.find((card) => card.label === "Memory")?.value;
  const diskRaw = dashboard.summaryCards?.find((card) => card.label === "Disk")?.value;

  return `${dashboardName.toUpperCase()} SNAPSHOT

Taken: ${formatSnapshotTime(lastRefresh)}

STATUS: ${hasIssues ? `${serviceStats.critical} critical, ${serviceStats.warning} warning` : "All systems operational"}

IDENTITY
Project: ${dashboard.identity?.project || "N/A"}
Instance ID: ${dashboard.identity?.instanceId || "N/A"}
Hostname: ${dashboard.identity?.hostname || "N/A"}
Machine type: ${dashboard.identity?.machineType || "N/A"}

OVERVIEW
CPU: ${formatMetric(cpuRaw)} | Cores: ${cpu.cores || "?"} | Load (1min): ${load.one}
Memory: ${formatMetric(memRaw)} | Total: ${formatBytes(memory.total)} | Avail: ${formatBytes(memory.available || memory.free)} | Used: ${formatBytes(memory.used)}
Disk: ${formatMetric(diskRaw)} | Total: ${formatBytes(disk.total)} | Avail: ${formatBytes(disk.available)} | Used: ${formatBytes(disk.used)}
Estimated Cost: ${getCostValue(dashboard)}

NETWORK
VPC: ${dashboard.network?.vpc || "N/A"}
Subnet: ${dashboard.network?.subnet || "N/A"}
Internal IP: ${dashboard.network?.internalIp || "N/A"}
External IP: ${dashboard.network?.externalIp || "N/A"}

LOCATION
Region: ${dashboard.location?.region || "N/A"}
Zone: ${dashboard.location?.zone || "N/A"}
Uptime: ${dashboard.meta?.uptime || "N/A"}

LOAD
1-min load avg: ${load.one}
5-min load avg: ${load.five}
15-min load avg: ${load.fifteen}

MONITORING ENDPOINTS
${formatList(dashboard.monitoringEndpoints, (endpoint) => `${endpoint.name}: ${endpoint.url} [${endpoint.status}]`)}

SERVICES (${Math.min(serviceLimit, serviceStats.total)} of ${serviceStats.total})
${formatList(dashboard.services?.slice(0, serviceLimit), (service) => `${service.label} [${service.status}]`)}

SYSTEM LOGS ${logLimit >= totalLogs ? `(last ${totalLogs})` : `(last ${logLimit})`}
${formatList(
  dashboard.logs?.slice(0, logLimit),
  (log) => `[${getLogDisplayTime(log)}] [${getLogLevel(log)}] [${getLogSource(log)}] ${getLogMessage(log)}`
)}
`;
}

const formatIsoTimestamp = (value) => {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return safeDate.toISOString().replace(/\.\d{3}Z$/, "Z");
};

const toNullableNumber = (value, decimals = null) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = toNumber(value, NaN);
  if (!Number.isFinite(numeric)) return null;
  return decimals === null ? numeric : Number(numeric.toFixed(decimals));
};

const mbToGb = (value) => {
  const numeric = toNullableNumber(value, 1);
  return numeric === null ? null : Number((numeric / 1024).toFixed(1));
};

const parseUptime = (value) => {
  const humanReadable = String(value || "N/A");
  const days = humanReadable.match(/(\d+)\s*day/i);
  const hours = humanReadable.match(/(\d+)\s*hour/i);

  return {
    days: days ? Number(days[1]) : null,
    hours: hours ? Number(hours[1]) : null,
    human_readable: humanReadable,
  };
};

const normalizeDateLabel = (value, lastRefresh) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const withYear = `${raw} ${new Date(lastRefresh || Date.now()).getFullYear()}`;
  const parsedDate = Date.parse(withYear);
  if (Number.isNaN(parsedDate)) return raw;

  return new Date(parsedDate).toISOString().slice(0, 10);
};

const getServiceName = (service) => service?.name || service?.label || "Unknown service";

const getOverallState = (critical, warning) => {
  if (critical > 0) return "degraded";
  if (warning > 0) return "warning";
  return "healthy";
};

const buildAlertSummary = (dashboard) => {
  const services = dashboard.services || [];
  const logs = dashboard.logs || [];
  const criticalIssues = services
    .filter((service) => service.status === "critical")
    .map((service) => ({
      category: getServiceName(service),
      issue: service.value || `${getServiceName(service)} reported critical status`,
      impact: "Requires operator review",
    }));
  const warnings = services
    .filter((service) => service.status === "warning")
    .map((service) => ({
      category: getServiceName(service),
      issue: service.value || `${getServiceName(service)} reported warning status`,
    }));

  logs.forEach((log) => {
    const level = getLogLevel(log);
    if (level === "ERROR") {
      criticalIssues.push({
        category: getLogSource(log),
        issue: getLogMessage(log),
        impact: "Error-level log event detected",
      });
    } else if (level === "WARN" || level === "WARNING") {
      warnings.push({
        category: getLogSource(log),
        issue: getLogMessage(log),
      });
    }
  });

  return {
    critical_issues: criticalIssues.slice(0, 10),
    warnings: warnings.slice(0, 10),
  };
};

function generateDevSecOpsJsonSnapshot({
  dashboard,
  lastRefresh,
  logLimit,
  serviceLimit,
  dashboardName,
}) {
  const services = dashboard.services || [];
  const warning = services.filter((service) => service.status === "warning").length;
  const critical = services.filter((service) => service.status === "critical").length;
  const summaryCards = dashboard.summaryCards || [];
  const systemResources = dashboard.systemResources || {};
  const cpu = systemResources.cpu || {};
  const memory = systemResources.memory || {};
  const disk = systemResources.disk || {};
  const load = getLoadMetrics(dashboard);
  const cpuUsage = getSummaryValue(summaryCards, "CPU") ?? cpu.usage;
  const memoryUsage = getSummaryValue(summaryCards, "Memory");
  const diskUsage = getSummaryValue(summaryCards, "Disk");
  const dashboardTitle = `${String(dashboardName || "DevSecOps Dashboard").toUpperCase()} SNAPSHOT`;

  return {
    snapshot: {
      title: dashboardTitle,
      taken_at: formatIsoTimestamp(lastRefresh),
      currency: "USD",
    },
    status: {
      critical,
      warning,
      overall_state: getOverallState(critical, warning),
    },
    identity: {
      project: dashboard.identity?.project || null,
      instance_id: dashboard.identity?.instanceId || dashboard.identity?.instance_id || null,
      hostname: dashboard.identity?.hostname || null,
      machine_type: dashboard.identity?.machineType || dashboard.identity?.machine_type || null,
    },
    overview: {
      cpu: {
        usage_percent: toNullableNumber(cpuUsage, 1),
        cores: toNullableNumber(cpu.cores, 0),
        load_1m: toNullableNumber(load.one, 2),
      },
      memory: {
        usage_percent: toNullableNumber(memoryUsage, 1),
        total_gb: mbToGb(memory.total),
        available_gb: mbToGb(memory.available || memory.free),
        used_gb: mbToGb(memory.used),
      },
      disk: {
        usage_percent: toNullableNumber(diskUsage, 1),
        total_gb: mbToGb(disk.total),
        available_gb: mbToGb(disk.available),
        used_gb: mbToGb(disk.used),
        state: summaryCards.find((card) => card.label === "Disk")?.status || null,
      },
      estimated_cost_monthly: toNullableNumber(getSummaryValue(summaryCards, "Estimated Cost") ?? getSummaryValue(summaryCards, "Cost"), 2),
    },
    network: {
      vpc: dashboard.network?.vpc || null,
      subnet: dashboard.network?.subnet || null,
      internal_ip: dashboard.network?.internalIp || dashboard.network?.internal_ip || null,
      external_ip: dashboard.network?.externalIp || dashboard.network?.external_ip || null,
    },
    location: {
      region: dashboard.location?.region || null,
      zone: dashboard.location?.zone || null,
      uptime: parseUptime(dashboard.meta?.uptime || dashboard.location?.uptime),
    },
    load: {
      load_avg_1m: toNullableNumber(load.one, 2),
      load_avg_5m: toNullableNumber(load.five, 2),
      load_avg_15m: toNullableNumber(load.fifteen, 2),
    },
    monitoring_endpoints: (dashboard.monitoringEndpoints || []).map((endpoint) => ({
      name: endpoint.name || null,
      url: endpoint.url || null,
      status: endpoint.status || null,
    })),
    services: {
      reported_count: Math.min(serviceLimit, services.length),
      total_expected: services.length,
      items: services.slice(0, serviceLimit).map((service) => ({
        name: getServiceName(service),
        status: service.status || null,
      })),
    },
    system_logs: (dashboard.logs || []).slice(0, logLimit).map((log) => ({
      timestamp: getLogTime(log) || null,
      level: getLogLevel(log),
      component: getLogSource(log),
      message: getLogMessage(log),
    })),
    alerts: buildAlertSummary(dashboard),
    recommended_actions: [],
    metadata: {
      schema_version: "1.0.0",
      provider: "GCP",
      dashboard_type: "devsecops-observability",
      generated_by: "devsecops-dashboard",
      tags: [
        "devsecops",
        "observability",
        "gcp",
        "vm-health",
        "security",
        "finops",
      ],
    },
  };
}

function generateFinOpsSnapshot({ data, lastRefresh }) {
  const summaryCards = data?.summaryCards || [];
  const totalCost = getSummaryValue(summaryCards, "Total Cost (MTD)");
  const forecast = getSummaryValue(summaryCards, "Forecast (EOM)");

  return `FINOPS SNAPSHOT

Taken: ${formatSnapshotTime(lastRefresh)}

SUMMARY
Total Cost (MTD): ${formatCurrency(totalCost)}
Forecast (EOM): ${formatCurrency(forecast)}

DAILY COST TREND
${formatList(data?.costTrend, (day) => `${day.date || "Unknown"}: ${formatCurrency(day.value)}`)}

TOP SERVICES BY COST
${formatList(data?.topServices, (service) => `${service.name || service.service || "Unknown"}: ${formatCurrency(service.value ?? service.cost)}`)}

BUDGETS
${formatList(data?.budgets, (budget) => {
  const spent = toNumber(budget.spent ?? budget.currentSpend ?? 0);
  const limit = toNumber(budget.amount ?? budget.limit ?? 0);
  const percentUsed = limit > 0 ? (spent / limit) * 100 : 0;
  return `${budget.name || "Unnamed budget"} [${getBudgetStatus(budget, percentUsed)}] Spent: ${formatCurrency(spent)} / ${formatCurrency(limit)} (${formatPercent(percentUsed)} used)`;
})}

CPU UTILIZATION
${formatList(data?.utilization, (vm) => {
  const id = vm.id || vm.instanceId || vm.instance || vm.name || "N/A";
  const name = vm.name || vm.instance || id;
  return `ID: ${id} | Name: ${name} | P95 CPU: ${formatPercent(vm.cpuP95 ?? vm.p95Cpu ?? vm.p95CPU)}`;
})}

RIGHTSIZING RECOMMENDATIONS
${formatList(data?.recommendations, (rec) => {
  const level = rec.level || rec.impact || "INFO";
  const details = rec.details || rec.description || rec.recommendation || "No details provided";
  const savings = rec.monthlySavings ?? rec.savingsMonthly ?? rec.savings ?? 0;
  return `Resource: ${rec.resource || rec.name || "Unknown resource"} | Recommendation: ${details} | Level: [${String(level).toUpperCase()}] | Savings: ${formatCurrency(savings)}/mo`;
})}

IDLE RESOURCES
${formatList(data?.idleResources, (resource) => `${resource.name || "Unknown"} | Type: ${resource.type || "N/A"} | Scope: ${resource.scope || "N/A"} | Status: ${resource.status || "N/A"}`)}
`;
}

function generateFinOpsJsonSnapshot({ data, lastRefresh }) {
  const summaryCards = data?.summaryCards || [];
  const totalCost = getSummaryValue(summaryCards, "Total Cost (MTD)");
  const forecast = getSummaryValue(summaryCards, "Forecast (EOM)");

  return {
    snapshot: {
      title: "FINOPS SNAPSHOT",
      taken_at: formatIsoTimestamp(lastRefresh),
      currency: "USD",
      period: {
        type: "MTD",
        month: formatIsoTimestamp(lastRefresh).slice(0, 7),
      },
    },
    summary: {
      total_cost_mtd: toNullableNumber(totalCost, 2),
      forecast_eom: toNullableNumber(forecast, 2),
    },
    daily_cost_trend: (data?.costTrend || []).map((day) => ({
      date: normalizeDateLabel(day.date, lastRefresh),
      cost: toNullableNumber(day.value ?? day.cost, 2),
    })),
    top_services_by_cost: (data?.topServices || []).map((service) => ({
      service: service.name || service.service || "Unknown",
      cost: toNullableNumber(service.value ?? service.cost, 2),
    })),
    budgets: (data?.budgets || []).map((budget) => {
      const spent = toNumber(budget.spent ?? budget.currentSpend ?? 0);
      const limit = toNumber(budget.amount ?? budget.limit ?? 0);
      const percentUsed = limit > 0 ? (spent / limit) * 100 : 0;

      return {
        name: budget.name || "Unnamed budget",
        status: getBudgetStatus(budget, percentUsed),
        spent: Number(spent.toFixed(2)),
        limit: Number(limit.toFixed(2)),
        percent_used: Number(percentUsed.toFixed(1)),
      };
    }),
    cpu_utilization: (data?.utilization || []).map((vm) => {
      const id = vm.id || vm.instanceId || vm.instance || vm.name || null;

      return {
        id,
        name: vm.name || vm.instance || id,
        p95_cpu_percent: toNullableNumber(vm.cpuP95 ?? vm.p95Cpu ?? vm.p95CPU, 1),
      };
    }),
    rightsizing_recommendations: (data?.recommendations || []).map((rec) => ({
      resource: rec.resource || rec.name || "Unknown resource",
      recommendation: rec.details || rec.description || rec.recommendation || "No details provided",
      priority: String(rec.level || rec.impact || rec.priority || "INFO").toUpperCase(),
      estimated_monthly_savings: toNullableNumber(
        rec.monthlySavings ?? rec.savingsMonthly ?? rec.savings ?? rec.estimatedMonthlySavings,
        2
      ),
    })),
    idle_resources: (data?.idleResources || []).map((resource) => ({
      resource: resource.resource || resource.name || "Unknown",
      type: resource.type || null,
      scope: resource.scope || null,
      status: resource.status || null,
    })),
    metadata: {
      schema_version: "1.0.0",
      provider: "GCP",
      generated_by: "finops-dashboard",
      tags: ["finops", "cost-optimization", "rightsizing", "budgeting"],
    },
  };
}
