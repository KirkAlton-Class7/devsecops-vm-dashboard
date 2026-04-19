import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, BarChart3, Server, Cpu, DollarSign } from "lucide-react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import StatCard from "./StatCard";
import Card from "./Card";
import ResourceTable from "./ResourceTable";
import SectionList from "./SectionList";
import CostTrendChart from "./CostTrendChart";

// FinOps specific navigation items
const finopsNavItems = [
  { id: "finops-overview", label: "Overview", icon: LayoutDashboard },
  { id: "cost-trends", label: "Cost Trends", icon: BarChart3 },
  { id: "idle-resources", label: "Idle Resources", icon: Server },
  { id: "rightsizing", label: "Rightsizing", icon: Cpu },
  { id: "savings", label: "Savings", icon: DollarSign },
];

// Mock data for when API is unavailable
const mockFinOpsData = {
  summaryCards: [
    { label: "Total Cost (MTD)", value: "$124.50", status: "info" },
    { label: "Forecast (EOM)", value: "$158.20", status: "warning" },
    { label: "Potential Savings", value: "$23.70", status: "healthy" },
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
    { name: "Compute Engine", value: "$87.20", status: "info" },
    { name: "Cloud Storage", value: "$23.50", status: "info" },
    { name: "BigQuery", value: "$8.90", status: "info" },
    { name: "Cloud Run", value: "$4.20", status: "info" },
  ],
  idleResources: [
    { name: "dev-vm-01", type: "n1-standard-1", cpu: "2%", recommendation: "Stop or resize" },
    { name: "unused-ip-1", type: "External IP", cpu: "N/A", recommendation: "Release" },
    { name: "old-snapshot-2024", type: "Snapshot", cpu: "N/A", recommendation: "Delete" },
  ],
  recommendations: [
    { instance: "db-server", current: "n2-standard-4", suggested: "n2-standard-2", savings: "$45/mo" },
    { instance: "web-server-01", current: "e2-standard-2", suggested: "e2-standard-1", savings: "$22/mo" },
  ],
};

export default function FinOpsDashboard({ onExit, githubUrl, linkedinUrl, currentMode, onModeChange, flashMode }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFinOpsData() {
      try {
        const res = await fetch("/api/finops");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("FinOps API error, using mock data:", err);
        setData(mockFinOpsData);
      } finally {
        setIsLoading(false);
      }
    }
    fetchFinOpsData();
    const interval = setInterval(fetchFinOpsData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="relative animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <Sidebar
        dashboardUser="Kirk Alton"
        dashboardName="FinOps Dashboard"
        githubUrl={githubUrl}
        linkedinUrl={linkedinUrl}
        navItems={finopsNavItems}
      />
      <div className="lg:ml-72">
        <Header
          appName="FinOps Dashboard"
          tagline="Optimize resources and cost"
          uptime=""
          currentMode={currentMode}
          onModeChange={onModeChange}
          flashMode={flashMode}
        />
        <main className="space-y-8 px-4 py-4 lg:px-6 lg:py-6">
          {/* Overview section – summary cards */}
          <section id="finops-overview" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.summaryCards.map((card, idx) => (
              <StatCard
                key={idx}
                label={card.label}
                value={card.value}
                status={card.status}
                instanceName=""
                zone=""
                projectId=""
              />
            ))}
          </section>

          {/* Cost Trends */}
          <section id="cost-trends">
            <Card title="Daily Cost Trend" subtitle="Last 10 days">
              <CostTrendChart
                data={data.costTrend}
                dataKey="value"
                labelKey="date"
                unit="$"
              />
            </Card>
          </section>

          {/* Idle Resources */}
          <section id="idle-resources">
            <ResourceTable
              rows={data.idleResources}
              title="Idle Resources"
              isLogs={false}
              limit={10}
            />
          </section>

          {/* Rightsizing Opportunities */}
          <section id="rightsizing">
            <ResourceTable
              rows={data.recommendations}
              title="Rightsizing Opportunities"
              isLogs={false}
              limit={10}
            />
          </section>

          {/* Savings (Top Services by Cost) */}
          <section id="savings">
            <Card title="Top Services by Cost">
              <SectionList items={data.topServices} limit={10} />
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}