export const mockDashboard = {
  summaryCards: [
    { label: "CPU", value: "18%", status: "healthy" },
    { label: "Memory", value: "42%", status: "healthy" },
    { label: "Network", value: "Moderate", status: "warning" },
  ],
  vmInformation: [
    { label: "Hostname", value: "sandbox.internal", status: "healthy" },
    { label: "Instance ID", value: "1234567890123456789", status: "healthy" },
    { label: "Zone", value: "us-central1-a", status: "healthy" },
    { label: "Machine Type", value: "e2-micro", status: "healthy" },
    { label: "OS", value: "Ubuntu 24.04 LTS", status: "healthy" },
    { label: "Project ID", value: "devsecops-sandbox-demo", status: "healthy" },
    { label: "Estimated Cost (Usage)", value: "$0.50/month", status: "info" }
  ],
  services: [
    { label: "Nginx", value: "Running", status: "healthy" },
    { label: "Python", value: "Installed", status: "healthy" },
    { label: "Metadata Service", value: "Reachable", status: "healthy" },
    { label: "HTTP Service", value: "Serving", status: "healthy" },
    { label: "Startup Script", value: "Completed", status: "healthy" },
    { label: "GitHub Quotes Sync", value: "Successful", status: "healthy" },
    { label: "Bootstrap Packages", value: "nginx, python3, curl, jq", status: "healthy" },
  ],
  security: [
    { label: "Host Firewall (UFW)", value: "active", status: "healthy" },
    { label: "SSH Service", value: "Running", status: "warning" },
    { label: "System Updates", value: "Pending (4)", status: "warning" },
    { label: "Internal IP", value: "10.128.0.5", status: "healthy" },
    { label: "Public IP", value: "34.122.10.22", status: "warning" },
  ],
  chartSeries: [
    { name: "Mon", value: 14 },
    { name: "Tue", value: 22 },
    { name: "Wed", value: 19 },
    { name: "Thu", value: 27 },
    { name: "Fri", value: 24 },
    { name: "Sat", value: 18 },
    { name: "Sun", value: 21 },
  ],
  resourceTable: [
    { name: "nginx.service", type: "systemd", status: "Running", scope: "vm" },
    { name: "python3", type: "runtime", status: "Installed", scope: "vm" },
    { name: "metadata", type: "cloud", status: "Reachable", scope: "gcp" },
    { name: "quotes.json", type: "content", status: "Ready", scope: "app" },
  ],
  logs: [
    { time: "startup", message: "Bootstrap completed successfully", level: "info" },
    { time: "services", message: "GitHub quotes sync: Successful", level: "info" },
    { time: "security", message: "Public IP exposure detected", level: "warn" },
  ],
  meta: {
    appName: "DevSecOps Sandbox",
    tagline: "Cloud VM posture, service health, and metadata visibility",
    uptime: "up 11 minutes",
  },
};

export const mockQuotes = [
  {
    id: 1,
    text: "Automation turns good habits into repeatable systems.",
    author: "DevSecOps Sandbox",
    tag: "automation",
  },
  {
    id: 2,
    text: "Security works best when it is built in early, not bolted on later.",
    author: "DevSecOps Sandbox",
    tag: "shift-left",
  },
  {
    id: 3,
    text: "Logs are evidence, not decoration.",
    author: "DevSecOps Sandbox",
    tag: "observability",
  },
];