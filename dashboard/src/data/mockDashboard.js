export const mockDashboard = {
  summaryCards: [
    { label: "CPU", value: "72%", status: "warning" },
    { label: "Memory", value: "68%", status: "warning" },
    { label: "Disk", value: "45%", status: "healthy" },
    { label: "Cost", value: "$12.48/month", status: "info" },
  ],
  
  vmInformation: [
    { label: "Hostname", value: "prod-worker-03.internal", status: "healthy" },
    { label: "Instance ID", value: "1234567890123456789", status: "healthy" },
    { label: "Zone", value: "us-central1-a", status: "healthy" },
    { label: "Machine Type", value: "e2-standard-2", status: "healthy" },
    { label: "OS", value: "Ubuntu 24.04 LTS", status: "healthy" },
    { label: "Project ID", value: "devsecops-production", status: "healthy" },
    { label: "Estimated Cost (Usage)", value: "$45.50/month", status: "info" }
  ],
  services: [
    { label: "Nginx", value: "Running (12 req/s)", status: "healthy" },
    { label: "Python", value: "Installed", status: "healthy" },
    { label: "Metadata Service", value: "Reachable", status: "healthy" },
    { label: "HTTP Service", value: "Serving (1.2k req/min)", status: "warning" },
    { label: "Startup Script", value: "Completed", status: "healthy" },
    { label: "GitHub Quotes Sync", value: "Successful", status: "healthy" },
    { label: "Bootstrap Packages", value: "nginx, python3, curl, jq", status: "healthy" },
  ],
  security: [
    { label: "Host Firewall (UFW)", value: "active", status: "healthy" },
    { label: "SSH Service", value: "Running (22/tcp)", status: "healthy" },
    { label: "System Updates", value: "Pending (2)", status: "warning" },
    { label: "Internal IP", value: "10.128.0.5", status: "healthy" },
    { label: "Public IP", value: "34.122.10.22", status: "warning" },
    { label: "Failed Login Attempts", value: "12 (last hour)", status: "warning" },
  ],
  
  systemLoad: "2.45",
  
  resourceTable: [
    { name: "nginx.service", type: "systemd", status: "Running", scope: "vm" },
    { name: "python3", type: "runtime", status: "Installed", scope: "vm" },
    { name: "postgresql", type: "database", status: "Running", scope: "vm" },
    { name: "redis", type: "cache", status: "Running", scope: "vm" },
    { name: "metadata", type: "cloud", status: "Reachable", scope: "gcp" },
    { name: "quotes.json", type: "content", status: "Ready", scope: "app" },
  ],
  
    // Fixed logs structure - proper columns for ResourceTable
    logs: [
    { 
      time: "14:32:15", 
      level: "warn", 
      message: "High CPU usage detected (72%)",
      scope: "system"
    },
    { 
      time: "14:30:22", 
      level: "info", 
      message: "Nginx request rate increased to 12 req/s",
      scope: "nginx"
    },
    { 
      time: "14:28:05", 
      level: "info", 
      message: "Database connection pool at 85%",
      scope: "postgres"
    },
    { 
      time: "14:25:30", 
      level: "info", 
      message: "GitHub quotes sync: Successful",
      scope: "app"
    },
    { 
      time: "14:20:00", 
      level: "warn", 
      message: "12 failed login attempts detected",
      scope: "security"
    },
  ],
  meta: {
    appName: "DevSecOps",
    tagline: "Production monitoring • High activity detected",
    uptime: "up 6 days, 14 hours",
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