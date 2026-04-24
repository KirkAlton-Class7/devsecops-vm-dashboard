import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { DollarSign } from "lucide-react";
import Card from "./Card";

export default function CostTrendChart({ title = "Daily Cost Trend", dailyBudget = 10 }) {
  const [historicalCost, setHistoricalCost] = useState([]);
  const [currentCost, setCurrentCost] = useState("0.00");
  const [maxCost, setMaxCost] = useState(10.0);
  const [hasData, setHasData] = useState(false);

  const fetchCostData = async () => {
    try {
      const response = await fetch("/api/finops");
      if (response.ok) {
        const data = await response.json();
        const costValues = data.costTrend.map(item => item.value);
        if (costValues.length > 0) {
          setHasData(true);
          const latestCost = costValues[costValues.length - 1];
          setCurrentCost(latestCost.toFixed(2));
          
          const lastTen = costValues.slice(-10);
          setHistoricalCost(lastTen);
          const peak = Math.max(...lastTen, 1.0);
          setMaxCost(Math.min(Math.ceil(peak * 1.2), 50.0));
        } else {
          setHasData(false);
          setHistoricalCost([]);
          setCurrentCost("0.00");
        }
      }
    } catch (error) {
      console.error("Failed to fetch cost data:", error);
    }
  };

  useEffect(() => {
    fetchCostData();
    const interval = setInterval(fetchCostData, 3600000);
    return () => clearInterval(interval);
  }, []);

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
      case "Low": return "from-emerald-500 to-cyan-500";
      case "Moderate": return "from-yellow-500 to-amber-500";
      case "High": return "from-orange-500 to-red-500";
      case "Critical": return "from-red-500 to-rose-600";
      default: return "from-emerald-500 to-cyan-500";
    }
  };

  if (!hasData) {
    return (
      <Card title={title} subtitle="Cost data will appear once BigQuery export runs">
        <div className="p-8 text-center text-slate-400">
          <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-40" />
          <p>No cost data available.</p>
          <p className="text-xs mt-1">Billing export is initializing. Please wait up to 24 hours.</p>
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
    >
      <Card title={title} subtitle="Last 10 days • Cost in USD">
        <div className="space-y-4">
          {/* Current Cost Indicator */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-sm text-slate-300">Current Daily Cost</p>
                <p className="text-xs text-slate-500">Most recent day</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-white">${currentCost}</p>
              <p className={`text-xs ${
                currentStatus === "Low" ? "text-emerald-400" :
                currentStatus === "Moderate" ? "text-yellow-400" :
                currentStatus === "High" ? "text-orange-400" : "text-red-400"
              }`}>
                {currentStatus}
              </p>
            </div>
          </div>

          {/* Bars container */}
          <div className="flex items-end gap-1.5 h-48 mt-4">
            {historicalCost.map((value, index) => {
              const daysAgo = historicalCost.length - 1 - index;
              const timeLabel = daysAgo === 0 ? "Today" : `${daysAgo}d ago`;
              const barHeightPercent = (value / maxCost) * 100;
              const barHeight = `${Math.min(barHeightPercent, 100)}%`;
              const barColor = getCostColor(value, dailyBudget);
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1 h-full">
                  <div className="relative w-full flex-1 flex items-end" style={{ height: 'calc(100% - 32px)' }}>
                    <motion.div
                      className={`w-full bg-gradient-to-t ${barColor} rounded-t-md cursor-pointer group relative`}
                      style={{ height: barHeight, minHeight: value > 0 ? '4px' : '0px' }}
                      initial={{ height: 0 }}
                      animate={{ height: barHeight }}
                      transition={{ duration: 0.3, delay: index * 0.02 }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-800 px-2 py-1 rounded text-xs text-white whitespace-nowrap pointer-events-none shadow-lg z-10">
                        ${value.toFixed(2)}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </motion.div>
                  </div>
                  <div className="text-[10px] text-slate-500 whitespace-nowrap">
                    {timeLabel}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Scale indicators */}
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-1">
            <span>$0</span>
            <span>${(maxCost * 0.5).toFixed(1)}</span>
            <span>${maxCost.toFixed(1)}</span>
          </div>
          
          {/* Budget‑based explanation (dynamic) – removed the inline budget display, kept legend */}
          <div className="mt-2 pt-2 border-t border-white/10">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span className="text-slate-400">&lt; 50% of budget = Low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                <span className="text-slate-400">50% – 80% = Moderate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-slate-400">80% – 100% = High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-slate-400">&gt; 100% = Critical</span>
              </div>
            </div>
          </div>
          
          {/* Stats + Daily Budget (bottom-right) */}
          <div className="mt-2 pt-2 border-t border-white/10">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-4">
                <span className="text-slate-500">Peak: <span className="text-cyan-400 font-mono">${Math.max(...historicalCost).toFixed(2)}</span></span>
                <span className="text-slate-500">Avg (10 days): <span className="text-emerald-400 font-mono">${(historicalCost.reduce((a,b) => a + b, 0) / historicalCost.length).toFixed(2)}</span></span>
                <span className="text-slate-500">Current: <span className="text-white font-mono">${currentCost}</span></span>
              </div>
              <div className="text-slate-400">
                Daily Budget: ${dailyBudget.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}