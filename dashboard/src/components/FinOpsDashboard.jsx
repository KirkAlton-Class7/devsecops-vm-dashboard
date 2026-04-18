import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Header from "./Header";
import Sidebar from "./Sidebar";
import StatCard from "./StatCard";
import Card from "./Card";
import ResourceTable from "./ResourceTable";
import SectionList from "./SectionList";
import CostTrendChart from "./CostTrendChart";

export default function FinOpsDashboard({ onExit }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFinOpsData() {
      try {
        const res = await fetch("/api/finops");
        if (!res.ok) throw new Error("FinOps API failed");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("FinOps data error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchFinOpsData();
    // Refresh every 60 seconds
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
      <Sidebar dashboardUser="FinOps" dashboardName="Cost Optimization" />
      <div className="lg:ml-72">
        <Header
          appName="FinOps Dashboard"
          tagline="Optimize cloud spending"
          uptime=""
          isTextDashMode={false}
          onTextDashToggle={() => {}}
          extraButtons={
            <button
              onClick={onExit}
              className="px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 rounded-lg border border-white/20 transition"
            >
              ← Exit FinOps
            </button>
          }
        />
        <main className="space-y-8 px-4 py-4 lg:px-6 lg:py-6">
          {/* Summary Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.summaryCards.map((card, idx) => (
              <StatCard
                key={idx}
                label={card.label}
                value={card.value}
                status={card.status}
                // no clickable links needed for FinOps cards
                instanceName=""
                zone=""
                projectId=""
              />
            ))}
          </section>

          {/* Cost Trend Chart */}
          <section>
            <Card title="Daily Cost Trend" subtitle="Last 30 days">
              <CostTrendChart
                data={data.costTrend}
                dataKey="value"
                labelKey="date"
                unit="$"
              />
            </Card>
          </section>

          {/* Top Services by Cost */}
          <section>
            <Card title="Top Services by Cost">
              <SectionList items={data.topServices} limit={10} />
            </Card>
          </section>

          {/* Idle Resources */}
          <section>
            <ResourceTable
              rows={data.idleResources}
              title="Idle Resources"
              isLogs={false}
              limit={10}
            />
          </section>

          {/* Rightsizing Recommendations */}
          <section>
            <ResourceTable
              rows={data.recommendations}
              title="Rightsizing Opportunities"
              isLogs={false}
              limit={10}
            />
          </section>
        </main>
      </div>
    </div>
  );
}