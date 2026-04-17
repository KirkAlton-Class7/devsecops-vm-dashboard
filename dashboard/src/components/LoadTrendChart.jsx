import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Gauge, TrendingUp, Activity } from "lucide-react";
import Card from "./Card";

export default function LoadTrendChart() {
  const [historicalLoad, setHistoricalLoad] = useState([0.45, 0.52, 0.48, 0.61, 0.55, 0.49, 0.58, 0.62, 0.51, 0.47]);
  const [currentLoad, setCurrentLoad] = useState("0.00");
  const [maxLoad, setMaxLoad] = useState(2.0); // Scale up to 2.0 for the chart

  // Fetch metrics to update historical data
  const fetchMetrics = async () => {
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const loadValue = parseFloat(data.systemLoad || "0");
        
        setCurrentLoad(loadValue.toFixed(2));
        
        // Update historical load data (keep last 10 readings)
        setHistoricalLoad(prev => {
          const newData = [...prev.slice(1), loadValue];
          // Dynamically adjust max scale based on peak load
          const peak = Math.max(...newData, 1.0);
          setMaxLoad(Math.min(Math.ceil(peak * 1.2), 5.0)); // Cap at 5.0, scale to 120% of peak
          return newData;
        });
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    }
  };

  // Fetch immediately and then every 10 seconds
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // Changed from 30000 to 10000
    return () => clearInterval(interval);
  }, []);

  const getLoadStatus = (load) => {
    if (load < 0.7) return "healthy";
    if (load < 1.0) return "moderate";
    if (load < 2.0) return "warning";
    return "critical";
  };

  const getLoadColor = (load) => {
    if (load < 0.7) return "from-emerald-500 to-cyan-500";
    if (load < 1.0) return "from-yellow-500 to-amber-500";
    if (load < 2.0) return "from-orange-500 to-red-500";
    return "from-red-500 to-rose-600";
  };

  const getStatusText = (load) => {
    if (load < 0.7) return "Normal";
    if (load < 1.0) return "Elevated";
    if (load < 2.0) return "High";
    return "Critical";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card title="System Load Trend" subtitle="Load (1m) • Last 10 samples">
        <div className="space-y-4">
          {/* Current Load Indicator */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-3">
              <Gauge className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-sm text-slate-300">Current Load</p>
                <p className="text-xs text-slate-500">Load (1m)</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-white">{currentLoad}</p>
              <p className={`text-xs ${getLoadStatus(currentLoad) === 'healthy' ? 'text-emerald-400' : getLoadStatus(currentLoad) === 'moderate' ? 'text-yellow-400' : 'text-red-400'}`}>
                {getStatusText(parseFloat(currentLoad))}
              </p>
            </div>
          </div>

          {/* Bars container */}
          <div className="flex items-end gap-1.5 h-48 mt-4">
            {historicalLoad.map((value, index) => {
              // Calculate time ago for this bar (newest on right)
              const readingsAgo = historicalLoad.length - 1 - index;
              const secondsAgo = readingsAgo * 10; // Now each reading is 10 seconds apart
              const minutesAgo = Math.floor(secondsAgo / 60);
              const remainingSeconds = secondsAgo % 60;
              
              let timeLabel;
              if (secondsAgo === 0) {
                timeLabel = "Now";
              } else if (minutesAgo > 0) {
                timeLabel = `${minutesAgo}m${remainingSeconds > 0 ? `${remainingSeconds}s` : ''} ago`;
              } else {
                timeLabel = `${secondsAgo}s ago`;
              }
              
              // Bar height as percentage of max scale (e.g., 0.75 load on 2.0 scale = 37.5%)
              const barHeightPercent = (value / maxLoad) * 100;
              const barHeight = `${Math.min(barHeightPercent, 100)}%`;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1 h-full">
                  {/* Bar container */}
                  <div className="relative w-full flex-1 flex items-end" style={{ height: 'calc(100% - 32px)' }}>
                    <motion.div
                      className={`w-full bg-gradient-to-t ${getLoadColor(value)} rounded-t-md cursor-pointer group relative`}
                      style={{ height: barHeight, minHeight: value > 0 ? '4px' : '0px' }}
                      initial={{ height: 0 }}
                      animate={{ height: barHeight }}
                      transition={{ duration: 0.3, delay: index * 0.02 }}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-800 px-2 py-1 rounded text-xs text-white whitespace-nowrap pointer-events-none shadow-lg z-10">
                        Load: {value.toFixed(2)}
                      </div>
                      
                      {/* Shimmer effect on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </motion.div>
                  </div>
                  
                  {/* Time label below each bar */}
                  <div className="text-[10px] text-slate-500 whitespace-nowrap">
                    {timeLabel}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Scale indicators */}
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-1">
            <span>0</span>
            <span>{(maxLoad * 0.5).toFixed(1)}</span>
            <span>{maxLoad.toFixed(1)}</span>
          </div>
          
          {/* Load Average Explanation */}
          <div className="mt-2 pt-2 border-t border-white/10">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span className="text-slate-400">&lt; 0.7 = Normal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                <span className="text-slate-400">0.7 - 1.0 = Elevated</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-slate-400">1.0 - 2.0 = High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-slate-400">&gt; 2.0 = Critical</span>
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="mt-2 pt-2 flex justify-between text-xs border-t border-white/10">
            <div className="flex items-center gap-4">
              <span className="text-slate-500">Peak: <span className="text-cyan-400 font-mono">{Math.max(...historicalLoad).toFixed(2)}</span></span>
              <span className="text-slate-500">Avg (10 samples): <span className="text-emerald-400 font-mono">{(historicalLoad.reduce((a,b) => a + b, 0) / historicalLoad.length).toFixed(2)}</span></span>
              <span className="text-slate-500">Current: <span className="text-white font-mono">{currentLoad}</span></span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}