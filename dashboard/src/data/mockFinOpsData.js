import {
  LayoutDashboard,
  BarChart3,
  Server,
  Cpu,
  DollarSign,
  Wallet,
  Gauge,
  Heart,
} from "lucide-react";

export const finopsNavItems = [
  { id: "finops-overview", label: "Overview", icon: LayoutDashboard },
  { id: "cost-trends", label: "Cost Trends", icon: BarChart3 },
  { id: "ambience", label: "Ambience", icon: Heart },
  { id: "budgets", label: "Budgets", icon: Wallet },
  { id: "utilization", label: "Utilization", icon: Gauge },
  { id: "idle-resources", label: "Idle Resources", icon: Server },
  { id: "rightsizing", label: "Rightsizing", icon: Cpu },
  { id: "savings", label: "Savings", icon: DollarSign },
];

export const mockFinOpsData = {
  summaryCards: [
    { label: "Total Cost (MTD)", value: "124.50", status: "info" },
    { label: "Forecast (EOM)", value: "158.20", status: "warning" },
    { label: "Potential Savings", value: "23.70", status: "healthy" },
    { label: "CUD Coverage", value: "68%", status: "healthy" },
  ],

  costTrend: [
    { date: "Apr 9", value: 12.3 },
    { date: "Apr 10", value: 11.8 },
    { date: "Apr 11", value: 13.1 },
    { date: "Apr 12", value: 10.5 },
    { date: "Apr 13", value: 12.9 },
    { date: "Apr 14", value: 11.2 },
    { date: "Apr 15", value: 13.4 },
    { date: "Apr 16", value: 12.1 },
    { date: "Apr 17", value: 11.5 },
    { date: "Apr 18", value: 12.7 },
  ],

  topServices: [
    { name: "Compute Engine", value: 87.2, status: "info" },
    { name: "Kubernetes Engine", value: 45.3, status: "info" },
    { name: "Cloud SQL", value: 32.1, status: "info" },
    { name: "Cloud Storage", value: 23.5, status: "info" },
    { name: "Pub/Sub", value: 12.45, status: "info" },
    { name: "Cloud Build", value: 11.3, status: "info" },
    { name: "Cloud Logging", value: 9.2, status: "info" },
    { name: "BigQuery", value: 8.9, status: "info" },
    { name: "Cloud Monitoring", value: 8.4, status: "info" },
    { name: "Cloud Functions", value: 7.8, status: "info" },
    { name: "Cloud CDN", value: 6.5, status: "info" },
    { name: "Cloud Armor", value: 5.2, status: "info" },
    { name: "Cloud NAT", value: 4.75, status: "info" },
    { name: "Cloud Run", value: 4.2, status: "info" },
    { name: "Cloud VPN", value: 3.9, status: "info" },
    { name: "Artifact Registry", value: 3.2, status: "info" },
    { name: "Cloud Interconnect", value: 2.3, status: "info" },
    { name: "Container Registry", value: 2.1, status: "info" },
    { name: "Cloud DNS", value: 1.8, status: "info" },
    { name: "Cloud Trace", value: 1.2, status: "info" },
    { name: "Cloud Profiler", value: 0.8, status: "info" },
    { name: "Cloud Debugger", value: 0.5, status: "info" },
  ],

  budgets: [
    {
      name: "Production budget",
      amount: 1000,
      spent: 300,
      forecast: 450,
      thresholds: [0.5, 0.8, 0.9],
    },
    {
      name: "Compute budget",
      amount: 600,
      spent: 390,
      forecast: 580,
      thresholds: [0.5, 0.8, 0.9],
    },
    {
      name: "Data & Analytics budget",
      amount: 400,
      spent: 368,
      forecast: 520,
      thresholds: [0.5, 0.8, 0.9],
    },
  ],

  idleResources: [
    {
      name: "dev-vm-01",
      type: "n1-standard-1",
      scope: "compute",
      status: "stopped",
      cpu: "2%",
      recommendation: "Stop or resize",
    },
    {
      name: "unused-ip-1",
      type: "External IP",
      scope: "network",
      status: "warning",
      cpu: "N/A",
      recommendation: "Release",
    },
    {
      name: "old-snapshot-2024",
      type: "Snapshot",
      scope: "storage",
      status: "warning",
      cpu: "N/A",
      recommendation: "Delete",
    },
  ],

  recommendations: [
    {
      resource: "db-server",
      description: "Resize n2-standard-4 to n2-standard-2",
      monthlySavings: 45,
      impact: "HIGH",
      actionUrl: "https://console.cloud.google.com/compute/instances",
    },
    {
      resource: "web-server-01",
      description: "Resize e2-standard-2 to e2-standard-1",
      monthlySavings: 22,
      impact: "MEDIUM",
      actionUrl: "https://console.cloud.google.com/compute/instances",
    },
  ],

  utilization: [
    { instance: "db-server", cpuP95: 12.5, recommendationMatch: true },
    { instance: "web-server-01", cpuP95: 35.2, recommendationMatch: false },
  ],

  quote: {
    text: "Optimize cloud costs with FinOps",
    author: "FinOps Team",
  },

  realizedSavings: 15.3,
  potentialSavings: 67,
};
