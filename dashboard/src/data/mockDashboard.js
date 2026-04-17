export const mockDashboard = {
  summaryCards: [
    { label: "CPU", value: "72%", status: "warning" },
    { label: "Memory", value: "68%", status: "warning" },
    { label: "Disk", value: "45%", status: "healthy" },
    { label: "Estimated Cost", value: "$12.48", status: "info" },
  ],

  identity: {
    project: "devsecops-production",
    instanceId: "i-0a1b2c3d4e5f67890",
    instanceName: "prod-worker-03",
    hostname: "prod-worker-03.internal",
    machineType: "t3.medium",
  },

  network: {
    vpc: "vpc-abc123def",
    subnet: "subnet-xyz789",
    internalIp: "10.128.0.5",
    externalIp: "34.122.10.22",
  },

  location: {
    region: "us-east-1",
    zone: "us-east-1a",
    loadAvg: "2.45",            // 5‑minute load average
    uptime: "6 days, 14 hours", // for LocationCard
  },

  systemResources: {
    cpu: {
      cores: 2,
      usage: 72,
      loadAvg: "2.45",
      history: [                // for LoadTrendChart
        { time: "14:20", value: 68 },
        { time: "14:22", value: 71 },
        { time: "14:24", value: 73 },
        { time: "14:26", value: 70 },
        { time: "14:28", value: 74 },
        { time: "14:30", value: 72 },
        { time: "14:32", value: 75 },
        { time: "14:34", value: 73 },
        { time: "14:36", value: 71 },
        { time: "14:38", value: 69 },
        { time: "14:40", value: 72 },
        { time: "14:42", value: 74 },
        { time: "14:44", value: 76 },
        { time: "14:46", value: 73 },
        { time: "14:48", value: 71 },
        { time: "14:50", value: 70 },
        { time: "14:52", value: 72 },
        { time: "14:54", value: 74 },
        { time: "14:56", value: 75 },
        { time: "14:58", value: 72 },
      ],
    },
    memory: { total: 8192, used: 5570 },
  },

  systemLoad: 2.45,            // 1‑minute load average

  monitoringEndpoints: [
    { name: "Health Check", url: "https://api.devsecops.com/healthz", status: "up" },
    { name: "Metadata API", url: "https://metadata.google.internal/computeMetadata/v1/", status: "up" },
    { name: "Metrics Scraper", url: "http://localhost:8080/metrics", status: "up" },
    { name: "Log Forwarder", url: "https://logs.googleapis.com/v2/entries", status: "degraded" },
  ],

  services: [
    { label: "Nginx", value: "Running (12 req/s)", status: "healthy" },
    { label: "Python API", value: "Healthy", status: "healthy" },
    { label: "PostgreSQL", value: "Running (85% pool)", status: "healthy" },
    { label: "Redis Cache", value: "Memory 78%", status: "warning" },
    { label: "Metadata Service", value: "Reachable", status: "healthy" },
    { label: "Startup Script", value: "Completed", status: "healthy" },
    { label: "GitHub Quotes Sync", value: "Successful", status: "healthy" },
    { label: "CloudWatch Agent", value: "Failed to publish", status: "critical" },
  ],

  logs: [
    { time: "14:32:15", level: "WARN", message: "High CPU usage detected (72%)", scope: "system" },
    { time: "14:31:02", level: "INFO", message: "Nginx request rate increased to 12 req/s", scope: "nginx" },
    { time: "14:30:00", level: "INFO", message: "Database connection pool at 85%", scope: "postgres" },
    { time: "14:28:30", level: "WARN", message: "Redis memory usage at 78%", scope: "redis" },
    { time: "14:27:45", level: "ERROR", message: "CloudWatch agent failed to publish metrics", scope: "monitoring" },
    { time: "14:25:10", level: "INFO", message: "GitHub quotes sync completed successfully", scope: "app" },
    { time: "14:22:00", level: "WARN", message: "12 failed login attempts detected from 203.0.113.45", scope: "security" },
    { time: "14:18:22", level: "INFO", message: "Backup routine started", scope: "system" },
    { time: "14:15:55", level: "INFO", message: "Metadata endpoint responded in 45ms", scope: "metadata" },
    { time: "14:10:33", level: "INFO", message: "Disk usage at 45%, 56.3GB free", scope: "storage" },
    { time: "14:08:10", level: "WARN", message: "System load average 2.45 above threshold 2.0", scope: "system" },
    { time: "14:03:00", level: "INFO", message: "Python API health check passed", scope: "api" },
    { time: "14:00:01", level: "INFO", message: "Hourly cron job completed", scope: "cron" },
    { time: "13:58:30", level: "WARN", message: "Slow query detected (2.3s) on analytics table", scope: "postgres" },
    { time: "13:55:20", level: "INFO", message: "Cache hit ratio 87%", scope: "redis" },
    { time: "13:52:10", level: "ERROR", message: "Failed to fetch external quote API (timeout)", scope: "app" },
    { time: "13:45:30", level: "INFO", message: "Backup completed, size 2.3GB", scope: "system" },
    { time: "13:42:15", level: "WARN", message: "CPU throttling detected (0.5% of time)", scope: "system" },
    { time: "13:40:00", level: "INFO", message: "Metadata service version check: up-to-date", scope: "metadata" },
    { time: "13:37:22", level: "INFO", message: "GitHub sync: no new quotes", scope: "app" },
    { time: "13:35:00", level: "WARN", message: "CloudWatch agent memory leak suspected", scope: "monitoring" },
    { time: "13:32:45", level: "ERROR", message: "Log forwarder connection reset", scope: "logging" },
    { time: "13:30:10", level: "INFO", message: "Nginx access log rotated", scope: "nginx" },
    { time: "13:28:00", level: "INFO", message: "Database vacuum scheduled", scope: "postgres" },
    { time: "13:25:33", level: "WARN", message: "Failed login attempt from 192.168.1.100 (bruteforce pattern)", scope: "security" },
    { time: "13:22:00", level: "INFO", message: "System updates available: 2 packages", scope: "system" },
    { time: "13:18:00", level: "ERROR", message: "Redis connection pool exhausted", scope: "redis" },
    { time: "13:15:30", level: "WARN", message: "High disk I/O wait 15%", scope: "storage" },
    { time: "13:10:00", level: "INFO", message: "Metadata endpoint status 200", scope: "metadata" },
    { time: "13:07:00", level: "INFO", message: "Nginx worker processes restarted", scope: "nginx" },
  ],

  meta: {
    appName: "DevSecOps",
    tagline: "Mock Dashboard • Dev/Test | Prod Fallback • Degraded: NGINX serving, backend unavailable",
    dashboardUser: "Kirk Alton",
    dashboardName: "DevSecOps Dashboard",
    uptime: "6 days, 14 hours",
    lastDeploy: "2025-03-27 10:23:00",
  },
};

export const mockQuotes = [
  {
    id: 1,
    text: "High load means you're doing something right. Just make sure it scales.",
    author: "DevSecOps Sandbox",
    tag: "performance",
  },
  {
    id: 2,
    text: "Security never sleeps, and neither does your production workload.",
    author: "DevSecOps Sandbox",
    tag: "security",
  },
  {
    id: 3,
    text: "Logs are evidence, not decoration. Your 12 failed logins prove it.",
    author: "DevSecOps Sandbox",
    tag: "observability",
  },
];