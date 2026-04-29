import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { DollarSign } from "lucide-react";
import Card from "./Card";
import { buildTopServicesSnapshot } from "../utils/widgetSnapshots";

const COLORS = ["#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#ec4899"];

// Custom tooltip – no arrow, dynamic width, matches CostTrendChart style
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div
        className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-xs shadow-xl"
        style={{
          backgroundColor: "#1e293b",
          borderRadius: "0.5rem",
          minWidth: "180px",
          maxWidth: "320px",
          width: "max-content",
        }}
      >
        <div className="space-y-1 text-slate-300">
          <div className="border-b border-slate-700 pb-1 font-semibold text-cyan-400">
            {label}
          </div>
          <div>
            Cost:{" "}
            <span className="font-mono text-white">
              ${value.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function CostBreakdownChart({
  data,
  title = "Cost by Service",
  dataKey = "value",
  nameKey = "name",
  onCopyFailure,
  onCopySuccess,
}) {
  const hasData = data && data.length > 0;

  if (!hasData) {
    return (
      <Card
        title={title}
        subtitle="Cost breakdown by service (USD)"
        snapshotText={buildTopServicesSnapshot(data)}
        snapshotLabel="Top Services by Cost snapshot"
        onCopyFailure={onCopyFailure}
        onCopySuccess={onCopySuccess}
      >
        <div className="p-8 text-center text-slate-400">
          <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-40" />
          <p>No cost data available.</p>
          <p className="text-xs mt-1">
            Billing export is initializing. Please wait up to 24 hours.
          </p>
        </div>
      </Card>
    );
  }

  const barHeight = 48;
  const chartHeight = Math.max(350, data.length * barHeight);

  const formatUSD = (value) => `$${value.toFixed(0)}`;

  return (
    <Card
      title={title}
      subtitle="Cost breakdown by service (USD)"
      snapshotText={buildTopServicesSnapshot(data)}
      snapshotLabel="Top Services by Cost snapshot"
      onCopyFailure={onCopyFailure}
      onCopySuccess={onCopySuccess}
    >
      <div className="w-full" style={{ minHeight: `${chartHeight}px` }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            barSize={30}
            barGap={2}
            barCategoryGap="10%"
          >
            <XAxis
              type="number"
              tick={{ fill: "#94a3b8", fontSize: 13 }}
              tickFormatter={formatUSD}
            />
            <YAxis
              type="category"
              dataKey={nameKey}
              tick={{ fill: "#94a3b8", fontSize: 13 }}
              width={140}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
            />
            <Bar dataKey={dataKey}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
