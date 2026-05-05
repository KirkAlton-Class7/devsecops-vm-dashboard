export const mockDashboard = {
  summaryCards: [
    { label: "CPU", value: "18%", status: "healthy" },
    { label: "Memory", value: "41%", status: "healthy" },
    { label: "Disk", value: "29%", status: "healthy" },
    { label: "Uptime", value: "12 minutes", status: "info" },
  ],

  identity: {
    project: "local-or-gcp-project",
    instanceId: "unknown",
    instanceName: "basic-vm-dashboard",
    hostname: "basic-vm-dashboard",
    machineType: "e2-medium",
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
    uptime: "12 minutes",
  },

  systemResources: {
    cpu: {
      cores: 2,
      usage: 18,
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
    { name: "Health Check", url: "/healthz", status: "up" },
    { name: "Dashboard API", url: "/api/dashboard", status: "up" },
    { name: "Metadata", url: "/metadata", status: "up" },
  ],

  services: [
    { label: "Nginx", value: "serving static dashboard", status: "healthy" },
    { label: "Dashboard API", value: "serving basic VM metadata", status: "healthy" },
    { label: "Static Build", value: "React build deployed", status: "healthy" },
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
