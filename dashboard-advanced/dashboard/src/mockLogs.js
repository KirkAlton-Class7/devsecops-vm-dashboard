// src/mockLogs.js
const TOTAL_LOGS = 1500;
const LOG_INTERVAL_MS = 3000;

const logTemplates = [
  {
    level: "INFO",
    source: "nginx",
    message: (i) => `GET / completed 200 in ${18 + (i % 37)} ms; static dashboard served from /var/www/html`,
  },
  {
    level: "INFO",
    source: "api",
    message: (i) => `GET /api/dashboard completed 200 in ${64 + (i % 41)} ms; services=${14 + (i % 4)} logs=30`,
  },
  {
    level: "INFO",
    source: "metadata",
    message: () => "Resolved project kirk-devsecops-sandbox, zone us-central1-a, instance devsecops-dashboard-vm",
  },
  {
    level: "WARN",
    source: "monitoring",
    message: (i) => `Cloud Monitoring CPU sample lag is ${2 + (i % 5)} minutes; keeping last known utilization`,
  },
  {
    level: "INFO",
    source: "finops",
    message: (i) => `BigQuery billing export returned ${8 + (i % 7)} cost rows; estimated month-to-date spend $${(36 + (i % 23) * 1.27).toFixed(2)}`,
  },
  {
    level: "WARN",
    source: "budgets",
    message: (i) => `Budget devsecops-sandbox-monthly forecast is ${78 + (i % 15)}% of limit; threshold notification evaluated`,
  },
  {
    level: "INFO",
    source: "recommender",
    message: (i) => `Rightsizing recommendations refreshed; ${7 + (i % 9)} candidates with projected savings $${(12 + (i % 11) * 3.4).toFixed(2)}/mo`,
  },
  {
    level: "WARN",
    source: "storage",
    message: (i) => `Root disk usage at ${84 + (i % 10)}%; build cache and journal archives eligible for cleanup`,
  },
  {
    level: "ERROR",
    source: "cleanup",
    message: (i) => `Disk cleanup attempt ${1 + (i % 3)} failed: apt lock held by unattended-upgrades`,
  },
  {
    level: "INFO",
    source: "frontend",
    message: (i) => `Text mode rendered all-logs modal with ${180 + (i % 21)} loaded entries and client-side filters enabled`,
  },
  {
    level: "WARN",
    source: "security",
    message: (i) => `SSH deny burst detected: ${4 + (i % 8)} failed attempts from 203.0.113.${20 + (i % 60)}`,
  },
  {
    level: "INFO",
    source: "logging",
    message: (i) => `Journal logs page returned 200 entries; next offset=${200 + ((i * 17) % 1200)}`,
  },
  {
    level: "DEBUG",
    source: "system",
    message: (i) => `Load average sample captured: ${(0.72 + (i % 80) / 100).toFixed(2)} across 2 vCPUs`,
  },
  {
    level: "INFO",
    source: "bootstrap",
    message: () => "Startup script marker present; nginx, python3, git, nodejs, jq verified",
  },
  {
    level: "ERROR",
    source: "logging",
    message: (i) => `Cloud Logging export retry ${1 + (i % 4)}/5 failed with 429; retaining local journal page`,
  },
  {
    level: "INFO",
    source: "quotes",
    message: (i) => `Quote dataset synced ${38 + (i % 9)} records to /var/www/html/data/quotes.json`,
  },
  {
    level: "WARN",
    source: "network",
    message: (i) => `Cloud NAT projected spend up ${9 + (i % 12)}% from yesterday; checking idle address inventory`,
  },
  {
    level: "INFO",
    source: "health",
    message: (i) => `/healthz returned ok in ${7 + (i % 18)} ms; metadata probe and dashboard API reachable`,
  },
];

const formatTimestamp = (date) => date.toISOString().replace(/\.\d{3}Z$/, "Z");

const pickTemplate = (index) => {
  if (index > 0 && index % 67 === 0) {
    return logTemplates.find((template) => template.level === "ERROR" && template.source === "cleanup");
  }

  if (index > 0 && index % 41 === 0) {
    return logTemplates.find((template) => template.level === "ERROR" && template.source === "logging");
  }

  if (index > 0 && index % 11 === 0) {
    return logTemplates.find((template) => template.level === "WARN" && template.source === "storage");
  }

  return logTemplates[index % logTemplates.length];
};

const generateMockLogs = () => {
  const logs = [];
  const now = new Date();

  for (let i = 0; i < TOTAL_LOGS; i += 1) {
    const date = new Date(now.getTime() - i * LOG_INTERVAL_MS);
    const template = pickTemplate(i);

    logs.push({
      time: formatTimestamp(date),
      timestamp: date.getTime(),
      level: template.level,
      source: template.source,
      message: template.message(i),
    });
  }

  return logs;
};

const allLogs = generateMockLogs();

export const getPaginatedMockLogs = (limit = 200, offset = 0, minutes = null) => {
  const filteredLogs = minutes
    ? allLogs.filter((log) => log.timestamp >= Date.now() - minutes * 60 * 1000)
    : allLogs;
  const start = offset;
  const end = offset + limit;
  const logs = filteredLogs
    .slice(start, end)
    .map(({ timestamp, ...log }) => log);
  const hasMore = end < filteredLogs.length;
  return { logs, hasMore, offset: end };
};
