import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { DollarSign, X } from "lucide-react";
import Card from "./Card";

export default function CostTrendChart({ title = "Daily Cost Trend", dailyBudget = 10 }) {
  const [historicalCost, setHistoricalCost] = useState([]);
  const [currentCost, setCurrentCost] = useState("0.00");
  const [maxCost, setMaxCost] = useState(10.0);
  const [hasData, setHasData] = useState(false);
  const [activeBarIndex, setActiveBarIndex] = useState(null); // null or index

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

  // Helper: compute stats for popup
  const getPopupStats = (index) => {
    if (index === null || historicalCost.length === 0) return null;
    const cost = historicalCost[index];
    const N = historicalCost.length;
    const windowAvg = historicalCost.reduce((a,b) => a + b, 0) / N;
    const peak = Math.max(...historicalCost);
    const low = Math.min(...historicalCost);
    const yesterday = index > 0 ? historicalCost[index - 1] : null;
    const vsYesterday = yesterday !== null ? ((cost - yesterday) / yesterday) * 100 : null;
    const vsAvg = ((cost - windowAvg) / windowAvg) * 100;
    const vsPeak = ((cost - peak) / peak) * 100;
    const vsLow = ((cost - low) / low) * 100;
    let position = "";
    if (cost > windowAvg * 1.1) position = "Above Average";
    else if (cost < windowAvg * 0.9) position = "Below Average";
    else position = "Average";
    return {
      total: cost,
      yesterday,
      vsYesterday,
      windowAvg,
      vsAvg,
      peak,
      vsPeak,
      low,
      vsLow,
      position,
      rangeLow: low,
      rangeHigh: peak,
    };
  };

  const handleBarClick = (index) => {
    if (activeBarIndex === index) {
      setActiveBarIndex(null); // close if same bar clicked
    } else {
      setActiveBarIndex(index);
    }
  };

  const handleBarMouseEnter = (index) => {
    if (activeBarIndex !== null) {
      setActiveBarIndex(index);
    }
  };

  const popupStats = getPopupStats(activeBarIndex);
  const lowValue = historicalCost.length ? Math.min(...historicalCost) : 0;
  const peakValue = historicalCost.length ? Math.max(...historicalCost) : 0;
  const avgValue = historicalCost.length ? historicalCost.reduce((a,b) => a + b, 0) / historicalCost.length : 0;

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
      className="relative"
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

          {/* Bars container with click/hover detection */}
          <div className="flex items-end gap-1.5 h-48 mt-4">
            {historicalCost.map((value, index) => {
              const daysAgo = historicalCost.length - 1 - index;
              const timeLabel = daysAgo === 0 ? "Today" : `${daysAgo}d ago`;
              const barHeightPercent = (value / maxCost) * 100;
              const barHeight = `${Math.min(barHeightPercent, 100)}%`;
              const barColor = getCostColor(value, dailyBudget);
              
              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center gap-1 h-full"
                  onClick={() => handleBarClick(index)}
                  onMouseEnter={() => handleBarMouseEnter(index)}
                >
                  <div className="relative w-full flex-1 flex items-end" style={{ height: 'calc(100% - 32px)' }}>
                    <motion.div
                      className={`w-full bg-gradient-to-t ${barColor} rounded-t-md cursor-pointer group relative ${
                        activeBarIndex === index ? 'ring-2 ring-cyan-400' : ''
                      }`}
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
          
          {/* Budget‑based explanation */}
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
          
          {/* Stats with Low added */}
          <div className="mt-2 pt-2 border-t border-white/10">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-4">
                <span className="text-slate-500">Peak: <span className="text-cyan-400 font-mono">${peakValue.toFixed(2)}</span></span>
                <span className="text-slate-500">Avg: <span className="text-emerald-400 font-mono">${avgValue.toFixed(2)}</span></span>
                <span className="text-slate-500">Low: <span className="text-purple-400 font-mono">${lowValue.toFixed(2)}</span></span>
                <span className="text-slate-500">Current: <span className="text-white font-mono">${currentCost}</span></span>
              </div>
              <div className="text-slate-400">
                Daily Budget: ${dailyBudget.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Popup overlay when a bar is clicked */}
      {activeBarIndex !== null && popupStats && (
        <div
          className="fixed z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-3 text-xs text-slate-300 space-y-1"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            minWidth: '220px',
          }}
        >
          <div className="flex justify-between items-center border-b border-slate-700 pb-1 mb-1">
            <span className="font-semibold text-cyan-400">Usage in Context</span>
            <button onClick={() => setActiveBarIndex(null)} className="text-slate-400 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div>Total: <span className="text-white font-mono">${popupStats.total.toFixed(2)}</span></div>
          <div>vs Yesterday: {popupStats.yesterday !== null ? `${popupStats.vsYesterday > 0 ? '+' : ''}${popupStats.vsYesterday.toFixed(1)}%` : 'N/A'}</div>
          <div>vs {historicalCost.length}-Day Avg: {popupStats.vsAvg > 0 ? '+' : ''}{popupStats.vsAvg.toFixed(1)}%</div>
          <div>Range ({historicalCost.length}d): ${popupStats.rangeLow.toFixed(2)} – ${popupStats.rangeHigh.toFixed(2)}</div>
          <div>vs Peak: {popupStats.vsPeak > 0 ? '+' : ''}{popupStats.vsPeak.toFixed(1)}%</div>
          <div>vs Low: {popupStats.vsLow > 0 ? '+' : ''}{popupStats.vsLow.toFixed(1)}%</div>
          <div>Position: {popupStats.position}</div>
        </div>
      )}
    </motion.div>
  );
}