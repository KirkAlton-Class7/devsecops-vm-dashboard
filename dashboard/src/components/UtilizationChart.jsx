import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

export default function UtilizationChart({ data, unit = "%", height = 40 }) {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (data && Array.isArray(data)) {
      setChartData(data.map((val, idx) => ({ index: idx, value: val })));
    }
  }, [data]);

  if (!chartData.length) {
    return <div className="text-xs text-slate-500">No data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Tooltip
          contentStyle={{ background: "#1e293b", border: "none", fontSize: "10px" }}
          formatter={(value) => [`${value}${unit}`, "CPU"]}
          labelFormatter={() => ""}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#06b6d4"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}