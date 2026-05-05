export const mockDashboard = {
  summaryCards: [
    { label: "CPU", value: "18%", status: "healthy" },
    { label: "Memory", value: "41%", status: "healthy" },
    { label: "Disk", value: "29%", status: "healthy" },
    { label: "Estimated Cost", value: "24.46", status: "info" },
  ],

  identity: {
    project: "local-or-gcp-project",
    instanceId: "unknown",
    instanceName: "basic-vm-dashboard",
    hostname: "basic-vm-dashboard",
    machineType: "e2-medium",
    billingAccountId: "not configured",
  },

  network: {
    vpc: "unknown",
    subnet: "unknown",
    internalIp: "127.0.0.1",
    externalIp: "unknown",
  },

  location: {
    region: "unknown",
    zone: "unknown",
    loadAvg: "0.18",
    uptime: "12 minutes",
  },

  systemResources: {
    cpu: {
      cores: 2,
      usage: 18,
      loadAvg: "0.18",
      frequency: "unknown",
      history: [{ time: "now", value: 18 }],
    },
    memory: {
      total: 4096,
      used: 1679,
      available: 2417,
      usage: 41,
    },
    disk: {
      total: 25600,
      used: 7424,
      available: 18176,
      usage: 29,
    },
  },

  monitoringEndpoints: [
    { name: "Health Check", url: "http://localhost/healthz", status: "up" },
    { name: "Metadata API", url: "http://localhost:8080/metadata", status: "up" },
    { name: "Dashboard API", url: "http://localhost:8080/api/dashboard", status: "up" },
    { name: "Static Assets", url: "http://localhost/data/quotes.json", status: "up" },
  ],

  services: [
    { label: "Nginx", value: "active; serving dashboard on port 80", status: "healthy" },
    { label: "Dashboard API", value: "basic VM metadata endpoint active on port 8080", status: "healthy" },
    { label: "React Static Build", value: "assets present in /var/www/basic-vm-dashboard", status: "healthy" },
    { label: "Metadata Service", value: "best-effort project/zone resolution", status: "healthy" },
    { label: "Shared Assets", value: "quotes and gallery manifest staged from shared/assets", status: "healthy" },
    { label: "Startup Script", value: "ClickOps startup-script friendly", status: "healthy" },
  ],

  meta: {
    appName: "Basic VM Dashboard",
    tagline: "Lightweight VM health and metadata",
    dashboardUser: "VM Operator",
    dashboardName: "Basic VM Dashboard",
    uptime: "12 minutes",
    lastRefresh: "unknown",
    variant: "basic",
  },
};

export const mockQuotes = [
  {
    id: 1,
    text: "A basic dashboard should answer the first question quickly: is this VM alive?",
    author: "Basic VM Dashboard",
    tag: "health",
  },
  {
    id: 2,
    text: "Small deployments are easier to trust when their moving parts are visible.",
    author: "Basic VM Dashboard",
    tag: "operations",
  },
  {
    id: 3,
    text: "The best smoke test is boring, fast, and repeatable.",
    author: "Basic VM Dashboard",
    tag: "testing",
  },
];
