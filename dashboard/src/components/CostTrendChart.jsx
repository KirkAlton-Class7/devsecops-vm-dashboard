// components/CostTrendChart.jsx
import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { DollarSign } from "lucide-react";
import Card from "./Card";

export default function CostTrendChart({
  title = "Daily Cost Trend",
  dailyBudget = 10,
  data = [],       // array of { date, value }
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [hoveredLabel, setHoveredLabel] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const barRefs = useRef([]);

  const hasData = data && data.length > 0;
  let historicalCost = [];
  let currentCost = "0.00";
  let maxCost = 10.0;

  if (hasData) {
    const costValues = data.map((item) => item.value);
    historicalCost = costValues.slice(-10);
    const latestCost = costValues[costValues.length - 1];
    currentCost = latestCost.toFixed(2);
    const peak = Math.max(...historicalCost, 1.0);
    maxCost = Math.min(Math.ceil(peak * 1.2), 50.0);
  }

  const getCostStatus = (cost, budget) => {
    if (!budget || budget <= 0) return "Low";
    const ratio = cost / budget;
    if (ratio < 0.5) return "Low";
    if (ratio < 0.8) return "Moderate";
    if (ratio < 1.0) return "High";
    return "Critical";
  };

  const getCostColor = (cost, budget) => {
    const status = getCostStatus(cost, budget);
    switch (status) {
      case "Low":
        return "from-emerald-500 to-cyan-500";
      case "Moderate":
        return "from-yellow-500 to-amber-500";
      case "High":
        return "from-orange-500 to-red-500";
      case "Critical":
        return "from-red-500 to-rose-600";
      default:
        return "from-emerald-500 to-cyan-500";
    }
  };

  const getTooltipStats = (index) => {
    if (index === null || historicalCost.length === 0) return null;
    const cost = historicalCost[index];
    const N = historicalCost.length;
    const windowAvg = historicalCost.reduce((a, b) => a + b, 0) / N;
    const peak = Math.max(...historicalCost);
    const low = Math.min(...historicalCost);
    const previousDay = index > 0 ? historicalCost[index - 1] : null;
    const vsPrevAbs = previousDay !== null ? cost - previousDay : null;
    const vsPrevPercent = previousDay !== null ? ((cost - previousDay) / previousDay) * 100 : null;
    const vsAvgPercent = ((cost - windowAvg) / windowAvg) * 100;
    const vsHighPercent = ((cost - peak) / peak) * 100;
    const vsLowPercent = ((cost - low) / low) * 100;
    let position = "";
    if (cost > windowAvg * 1.1) position = "Above Average";
    else if (cost < windowAvg * 0.9) position = "Below Average";
    else position = "Average";

    const formatSignedPercent = (value) => {
      if (value === null || isNaN(value)) return null;
      const absValue = Math.abs(value).toFixed(1);
      return value >= 0 ? `+${absValue}%` : `-${absValue}%`;
    };
    const formatSignedDollar = (value) => {
      if (value === null || isNaN(value)) return null;
      const absValue = Math.abs(value).toFixed(2);
      return value >= 0 ? `+$${absValue}` : `-$${absValue}`;
    };

    return {
      total: cost,
      previousDay,
      vsPrevAbs,
      vsPrevPercent,
      windowAvg,
      vsAvgPercent,
      peak,
      vsHighPercent,
      low,
      vsLowPercent,
      position,
      rangeLow: low,
      rangeHigh: peak,
      dayOverDayFormatted: previousDay !== null
        ? `${formatSignedPercent(vsPrevPercent)} (${formatSignedDollar(vsPrevAbs)})`
        : "N/A",
      vsAvgFormatted: `${formatSignedPercent(vsAvgPercent)} (${formatSignedDollar(cost - windowAvg)})`,
      vsHighFormatted: `${formatSignedPercent(vsHighPercent)} (${formatSignedDollar(cost - peak)})`,
      vsLowFormatted: `${formatSignedPercent(vsLowPercent)} (${formatSignedDollar(cost - low)})`,
    };
  };

  const handleMouseEnter = (index, event) => {
    setHoveredIndex(index);
    // Compute the label for this bar (same as in render)
    const daysAgo = historicalCost.length - 1 - index;
    const timeLabel = daysAgo === 0 ? "Today" : `${daysAgo}d ago`;
    setHoveredLabel(timeLabel);

    if (barRefs.current[index]) {
      const rect = barRefs.current[index].getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 10,
        left: rect.left + rect.width / 2,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setHoveredLabel("");
  };

  const tooltipStats = getTooltipStats(hoveredIndex);
  const lowValue = historicalCost.length ? Math.min(...historicalCost) : 0;
  const peakValue = historicalCost.length ? Math.max(...historicalCost) : 0;
  const avgValue = historicalCost.length
    ? historicalCost.reduce((a, b) => a + b, 0) / historicalCost.length
    : 0;
  const N = historicalCost.length;

  if (!hasData) {
    return (
      <Card
        title={title}
        subtitle="Cost data will appear once BigQuery export runs"
      >
        <div className="p-8 text-center text-slate-400">
          <DollarSign className="mx-auto mb-2 h-12 w-12 opacity-40" />
          <p>No cost data available.</p>
          <p className="mt-1 text-xs">
            Please check your billing export configuration.
          </p>
        </div>
      </Card>
    );
  }

  const currentCostNum = parseFloat(currentCost);
  const currentStatus = getCostStatus(currentCostNum, dailyBudget);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      <Card title={title} subtitle="Last 10 days (USD)">
        <div className="space-y-4">
          {/* Current Cost Indicator */}
          <div className="flex items-center justify-between rounded-lg bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-sm text-slate-300">Current Daily Cost</p>
                <p className="text-xs text-slate-500">Most recent day</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl font-bold text-white">
                ${currentCost}
              </p>
              <p
                className={`text-xs ${
                  currentStatus === "Low"
                    ? "text-emerald-400"
                    : currentStatus === "Moderate"
                    ? "text-yellow-400"
                    : currentStatus === "High"
                    ? "text-orange-400"
                    : "text-red-400"
                }`}
              >
                {currentStatus}
              </p>
            </div>
          </div>

          {/* Bars container */}
          <div className="mt-4 flex h-48 items-end gap-1.5">
            {historicalCost.map((value, index) => {
              const daysAgo = historicalCost.length - 1 - index;
              const timeLabel = daysAgo === 0 ? "Today" : `${daysAgo}d ago`;
              const barHeightPercent = (value / maxCost) * 100;
              const barHeight = `${Math.min(barHeightPercent, 100)}%`;
              const barColor = getCostColor(value, dailyBudget);
              const isHovered = hoveredIndex === index;
              return (
                <div
                  key={index}
                  className="flex h-full flex-1 flex-col items-center gap-1"
                  onMouseEnter={(e) => handleMouseEnter(index, e)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div
                    ref={(el) => (barRefs.current[index] = el)}
                    className="relative flex w-full flex-1 items-end"
                    style={{ height: "calc(100% - 32px)" }}
                  >
                    <motion.div
                      className={`group relative w-full cursor-pointer rounded-t-md bg-gradient-to-t ${barColor} transition-all duration-200 ${
                        isHovered ? "ring-2 ring-white/50 shadow-lg" : ""
                      }`}
                      style={{
                        height: barHeight,
                        minHeight: value > 0 ? "4px" : "0px",
                      }}
                      initial={{ height: 0 }}
                      animate={{ height: barHeight }}
                      transition={{ duration: 0.3, delay: index * 0.02 }}
                    >
                      {/* Value label above bar (appears on hover) */}
                      <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-events-none shadow-lg z-10">
                        ${value.toFixed(2)}
                      </div>
                      <div className="absolute inset-0 rounded-t-md bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    </motion.div>
                  </div>
                  <div className="whitespace-nowrap text-[10px] text-slate-500">
                    {timeLabel}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scale indicators */}
          <div className="mt-1 flex justify-between px-1 text-[10px] text-slate-500">
            <span>$0</span>
            <span>${(maxCost * 0.5).toFixed(1)}</span>
            <span>${maxCost.toFixed(1)}</span>
          </div>

          {/* Budget legend */}
          <div className="mt-2 border-t border-white/10 pt-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-slate-400">&lt; 50% of budget = Low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-400" />
                <span className="text-slate-400">50% – 80% = Moderate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                <span className="text-slate-400">80% – 100% = High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-slate-400">&gt; 100% = Critical</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-2 border-t border-white/10 pt-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="text-slate-500">
                  Peak:{" "}
                  <span className="font-mono text-cyan-400">
                    ${peakValue.toFixed(2)}
                  </span>
                </span>
                <span className="text-slate-500">
                  Avg:{" "}
                  <span className="font-mono text-emerald-400">
                    ${avgValue.toFixed(2)}
                  </span>
                </span>
                <span className="text-slate-500">
                  Low:{" "}
                  <span className="font-mono text-purple-400">
                    ${lowValue.toFixed(2)}
                  </span>
                </span>
                <span className="text-slate-500">
                  Current:{" "}
                  <span className="font-mono text-white">${currentCost}</span>
                </span>
              </div>
              <div className="text-slate-400">
                Daily Budget: ${dailyBudget.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tooltip - dynamic title includes the bar's label */}
      {hoveredIndex !== null && tooltipStats && (
        <div
          className="pointer-events-none fixed z-[100]"
          style={{
            top: tooltipPosition.top - 10,
            left: tooltipPosition.left,
            transform: "translateX(-50%) translateY(-100%)",
          }}
        >
          <div
            className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-xs shadow-xl"
            style={{
              backgroundColor: "#1e293b",
              borderRadius: "0.5rem",
              minWidth: "220px",
              maxWidth: "320px",
              width: "max-content",
            }}
          >
            <div className="space-y-1 text-slate-300">
              <div className="border-b border-slate-700 pb-1 font-semibold text-cyan-400">
                Cost in Context – {hoveredLabel}
              </div>
              <div>
                Total:{" "}
                <span className="font-mono text-white">
                  ${tooltipStats.total.toFixed(2)}
                </span>
              </div>
              <div>
                Day-over-Day:{" "}
                <span className="font-mono text-white">
                  {tooltipStats.dayOverDayFormatted}
                </span>
              </div>
              <div>
                vs {N}-Day Avg:{" "}
                <span className="font-mono text-white">
                  {tooltipStats.vsAvgFormatted}
                </span>
              </div>
              <div>
                Position:{" "}
                <span className="text-white">{tooltipStats.position}</span>
              </div>
              <div className="mt-1 border-t border-slate-700/50 pt-1"></div>
              <div>
                Range ({N}d):{" "}
                <span className="font-mono text-white">
                  ${tooltipStats.rangeLow.toFixed(2)} – $
                  {tooltipStats.rangeHigh.toFixed(2)}
                </span>
              </div>
              <div>
                vs High:{" "}
                <span className="font-mono text-white">
                  {tooltipStats.vsHighFormatted}
                </span>
              </div>
              <div>
                vs Low:{" "}
                <span className="font-mono text-white">
                  {tooltipStats.vsLowFormatted}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}