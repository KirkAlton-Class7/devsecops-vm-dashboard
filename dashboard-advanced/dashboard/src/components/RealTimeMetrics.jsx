import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Cpu, Activity, HardDrive, Network, TrendingUp, Gauge } from "lucide-react";
import Card from "./Card";

export default function RealTimeMetrics() {
  const [metrics, setMetrics] = useState({
    cpu: "0",
    memory: "0",
    disk: "0",
    network: "0/0",
    load: "0.00"
  });
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [historicalData, setHistoricalData] = useState([65, 72, 68, 75, 70, 68, 73, 71, 69, 74]);

  // Fetch metrics from the VM
  const fetchMetrics = async () => {
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        
        const cpuCard = data.summaryCards?.find(card => card.label === "CPU");
        const memoryCard = data.summaryCards?.find(card => card.label === "Memory");
        const diskCard = data.summaryCards?.find(card => card.label === "Disk");
        const networkCard = data.summaryCards?.find(card => card.label === "Network");
        
        const newCpuValue = parseInt(cpuCard?.value?.replace('%', '') || "0");
        
        setMetrics({
          cpu: cpuCard?.value?.replace('%', '') || "0",
          memory: memoryCard?.value?.replace('%', '') || "0",
          disk: diskCard?.value?.replace('%', '') || "0",
          network: networkCard?.value || "0/0",
          load: data.systemLoad || "0.00"
        });
        
        // Update historical data with new CPU value
        setHistoricalData(prev => {
          const newData = [...prev.slice(1), newCpuValue];
          return newData;
        });
        
        setLastUpdate(new Date());
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

  const getProgressColor = (value) => {
    const num = parseFloat(value);
    if (num > 80) return "from-red-500 to-orange-500";
    if (num > 60) return "from-orange-500 to-yellow-500";
    return "from-emerald-500 to-cyan-500";
  };

  const formatNetwork = (networkStr) => {
    if (networkStr.includes('MB')) return networkStr;
    const [rx, tx] = networkStr.split('/');
    return `${rx}↓ / ${tx}↑`;
  };

  // The max value for the chart is 100 (since it's percentage)
  const maxHistorical = 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full flex flex-col"
    >
      <Card title="Live Metrics" subtitle="Real-time system performance">
        <div className="space-y-4">
          {/* CPU */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-slate-300">CPU Usage</span>
              </div>
              <span className="text-sm font-mono text-white">{metrics.cpu}%</span>
            </div>
            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${getProgressColor(metrics.cpu)} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${metrics.cpu}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Memory */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-300">Memory Usage</span>
              </div>
              <span className="text-sm font-mono text-white">{metrics.memory}%</span>
            </div>
            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${getProgressColor(metrics.memory)} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${metrics.memory}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Disk */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-slate-300">Disk Usage</span>
              </div>
              <span className="text-sm font-mono text-white">{metrics.disk}%</span>
            </div>
            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${getProgressColor(metrics.disk)} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${metrics.disk}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Network */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-slate-300">Network Traffic</span>
              </div>
              <span className="text-sm font-mono text-white">{formatNetwork(metrics.network)}</span>
            </div>
            <div className="flex gap-2 text-xs text-slate-500">
              <span>↓ Download</span>
              <span>↑ Upload</span>
            </div>
          </div>

          {/* System Load */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-slate-300">System Load (1 min)</span>
              </div>
              <span className="text-sm font-mono text-white">{metrics.load}</span>
            </div>
          </div>

          {/* Historical Trend - CPU History with Time Labels */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-slate-300 font-medium">CPU Trend History</span>
              </div>
              <span className="text-xs text-slate-500">Last 10 readings • Every 10s</span>
            </div>
            
            {/* Bars container - now each bar reflects actual percentage */}
            <div className="flex items-end gap-1.5 h-32">
              {historicalData.map((value, index) => {
                // Calculate time ago for this bar (newest on right)
                const readingsAgo = historicalData.length - 1 - index;
                const secondsAgo = readingsAgo * 10; // Each reading is 10 seconds apart
                const minutesAgo = Math.floor(secondsAgo / 60);
                const remainingSeconds = secondsAgo % 60;
                
                let timeLabel;
                if (secondsAgo === 0) {
                  timeLabel = "Now";
                } else if (minutesAgo > 0) {
                  timeLabel = `${minutesAgo}m${remainingSeconds > 0 ? `${remainingSeconds}s` : ''}`;
                } else {
                  timeLabel = `${secondsAgo}s`;
                }
                
                // Bar height is the actual percentage value (0-100%)
                const barHeight = `${value}%`;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1 h-full">
                    {/* Bar container */}
                    <div className="relative w-full flex-1 flex items-end" style={{ height: 'calc(100% - 20px)' }}>
                      <motion.div
                        className="w-full bg-gradient-to-t from-cyan-500 via-blue-500 to-purple-500 rounded-t-md cursor-pointer group relative"
                        style={{ height: barHeight, minHeight: value > 0 ? '4px' : '0px' }}
                        initial={{ height: 0 }}
                        animate={{ height: barHeight }}
                        transition={{ duration: 0.3, delay: index * 0.02 }}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-800 px-2 py-1 rounded text-xs text-white whitespace-nowrap pointer-events-none shadow-lg z-10">
                          {value}%
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
            
            {/* Y-axis label */}
            <div className="mt-2 text-right">
              <span className="text-[10px] text-slate-500">0% → 100%</span>
            </div>
            
            {/* Trend stats */}
            <div className="mt-2 pt-2 flex justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="text-slate-500">Peak: <span className="text-cyan-400 font-mono">{Math.max(...historicalData)}%</span></span>
                <span className="text-slate-500">Avg: <span className="text-emerald-400 font-mono">{Math.round(historicalData.reduce((a,b) => a + b, 0) / historicalData.length)}%</span></span>
                <span className="text-slate-500">Current: <span className="text-white font-mono">{metrics.cpu}%</span></span>
              </div>
            </div>
          </div>

          {/* Last Update */}
          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-slate-500 text-center">
              Updated {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}