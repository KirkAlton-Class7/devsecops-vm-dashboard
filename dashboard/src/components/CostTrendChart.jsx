import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, BarChart } from "lucide-react";
import Card from "./Card";

export default function CostTrendChart() {
  const [historicalCost, setHistoricalCost] = useState([12.3, 11.8, 13.1, 10.5, 12.9, 11.2, 13.4, 12.1, 11.5, 12.7]);
  const [currentCost, setCurrentCost] = useState("0.00");
  const [maxCost, setMaxCost] = useState(20.0); // Scale up to 20 for the chart

  // Fetch cost data from the FinOps API
  const fetchCostData = async () => {
    try {
      const response = await fetch("/api/finops");
      if (response.ok) {
        const data = await response.json();
        // Expect data.costTrend to be an array of objects like { date, value }
        const costValues = data.costTrend.map(item => item.value);
        const latestCost = costValues[costValues.length - 1] || 0;
        
        setCurrentCost(latestCost.toFixed(2));
        
        // Update historical cost data (keep last 10 readings)
        setHistoricalCost(prev => {
          const newData = [...prev.slice(1), latestCost];
          // Dynamically adjust max scale based on peak cost
          const peak = Math.max(...newData, 1.0);
          setMaxCost(Math.min(Math.ceil(peak * 1.2), 50.0)); // Cap at 50, scale to 120% of peak
          return newData;
        });
      }
    } catch (error) {
      console.error("Failed to fetch cost data:", error);
    }
  };

  // Fetch immediately and then every 60 seconds (cost data changes slowly)
  useEffect(() => {
    fetchCostData();
    const interval = setInterval(fetchCostData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getCostStatus = (cost) => {
    if (cost < 5) return "healthy";
    if (cost < 10) return "moderate";
    if (cost < 20) return "warning";
    return "critical";
  };

  const getCostColor = (cost) => {
    if (cost < 5) return "from-emerald-500 to-cyan-500";
    if (cost < 10) return "from-yellow-500 to-amber-500";
    if (cost < 20) return "from-orange-500 to-red-500";
    return "from-red-500 to-rose-600";
  };

  const getStatusText = (cost) => {
    if (cost < 5) return "Low";
    if (cost < 10) return "Moderate";
    if (cost < 20) return "High";
    return "Critical";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card title="Daily Cost Trend" subtitle="Last 10 days • Cost in USD">
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
              <p className={`text-xs ${getCostStatus(parseFloat(currentCost)) === 'healthy' ? 'text-emerald-400' : getCostStatus(parseFloat(currentCost)) === 'moderate' ? 'text-yellow-400' : 'text-red-400'}`}>
                {getStatusText(parseFloat(currentCost))}
              </p>
            </div>
          </div>

          {/* Bars container */}
          <div className="flex items-end gap-1.5 h-48 mt-4">
            {historicalCost.map((value, index) => {
              const readingsAgo = historicalCost.length - 1 - index;
              const daysAgo = readingsAgo;
              let timeLabel = daysAgo === 0 ? "Today" : `${daysAgo}d ago`;
              
              const barHeightPercent = (value / maxCost) * 100;
              const barHeight = `${Math.min(barHeightPercent, 100)}%`;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1 h-full">
                  <div className="relative w-full flex-1 flex items-end" style={{ height: 'calc(100% - 32px)' }}>
                    <motion.div
                      className={`w-full bg-gradient-to-t ${getCostColor(value)} rounded-t-md cursor-pointer group relative`}
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
          
          {/* Cost Explanation */}
          <div className="mt-2 pt-2 border-t border-white/10">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span className="text-slate-400">&lt; $5 = Low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                <span className="text-slate-400">$5 - $10 = Moderate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-slate-400">$10 - $20 = High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-slate-400">&gt; $20 = Critical</span>
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="mt-2 pt-2 flex justify-between text-xs border-t border-white/10">
            <div className="flex items-center gap-4">
              <span className="text-slate-500">Peak: <span className="text-cyan-400 font-mono">${Math.max(...historicalCost).toFixed(2)}</span></span>
              <span className="text-slate-500">Avg (10 days): <span className="text-emerald-400 font-mono">${(historicalCost.reduce((a,b) => a + b, 0) / historicalCost.length).toFixed(2)}</span></span>
              <span className="text-slate-500">Current: <span className="text-white font-mono">${currentCost}</span></span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}