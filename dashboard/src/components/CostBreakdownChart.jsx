import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import Card from "./Card";

const COLORS = ["#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#ec4899"];

export default function CostBreakdownChart({ data, title = "Cost by Service", dataKey = "value", nameKey = "name" }) {
  if (!data || data.length === 0) {
    return (
      <Card title={title}>
        <div className="text-center text-slate-400 py-8">No cost data available</div>
      </Card>
    );
  }

  // Increase per-bar height to 48px to use more vertical space
  const barHeight = 48;
  const chartHeight = Math.max(350, data.length * barHeight);

  return (
    <Card title={title}>
      <div className="w-full" style={{ minHeight: `${chartHeight}px` }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            barSize={30}          // thicker bars
            barGap={2}
            barCategoryGap="10%"
          >
            <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey={nameKey}
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              width={130}          // slightly wider for longer names
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#1e293b", border: "none" }}
              formatter={(value) => [`$${value}`, "Cost"]}
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