import { motion } from "framer-motion";
import { HardDrive, MemoryStick, Link2, FileCode, Activity, CheckCircle, Copy, ExternalLink, Cpu, Gauge } from "lucide-react";
import { useState, useEffect } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import Card from "./Card";

export default function SystemResourcesCard({ resources }) {
  const [copiedHealthz, setCopiedHealthz] = useState(false);
  const [copiedMetadata, setCopiedMetadata] = useState(false);
  const [cpuHistory, setCpuHistory] = useState([]);
  const [currentCpu, setCurrentCpu] = useState(resources?.cpu?.usage || 0);

  // Fetch CPU usage from the VM every 10 seconds
  useEffect(() => {
    const fetchCpu = async () => {
      try {
        const response = await fetch("/data/dashboard-data.json", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          const cpuCard = data.summaryCards?.find(card => card.label === "CPU");
          if (cpuCard) {
            const cpuValue = parseInt(cpuCard.value.replace('%', ''), 10);
            setCurrentCpu(cpuValue);
            setCpuHistory(prev => {
              const newHistory = [...prev, { time: new Date().toLocaleTimeString(), value: cpuValue }];
              if (newHistory.length > 20) newHistory.shift();
              return newHistory;
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch CPU for chart:", error);
      }
    };
    fetchCpu();
    const interval = setInterval(fetchCpu, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (mb) => {
    if (!mb) return "0 MB";
    if (mb > 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'healthz') {
        setCopiedHealthz(true);
        setTimeout(() => setCopiedHealthz(false), 2000);
      } else {
        setCopiedMetadata(true);
        setTimeout(() => setCopiedMetadata(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const memory = resources?.memory || { total: 0, used: 0, free: 0 };
  const disk = resources?.disk || { total: 0, used: 0, available: 0 };
  const cpu = resources?.cpu || { usage: 0, cores: null, frequency: null, loadAvg: null };
  const memoryPercent = memory.total > 0 ? (memory.used / memory.total) * 100 : 0;
  const diskPercent = disk.total > 0 ? (disk.used / disk.total) * 100 : 0;

  const hostname = window.location.hostname;
  const healthzUrl = `${window.location.protocol}//${hostname}/healthz`;
  const metadataUrl = `${window.location.protocol}//${hostname}/metadata`;

  // Prepare chart data
  const chartData = cpuHistory.map(item => ({ name: item.time.slice(0,5), value: item.value }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card title="System Resources" subtitle="Memory, disk, CPU, and monitoring endpoints">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Memory Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MemoryStick className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">Memory</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total</span>
                <span className="text-slate-200 font-mono">{formatBytes(memory.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Used</span>
                <span className="text-amber-400 font-mono">{formatBytes(memory.used)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Free</span>
                <span className="text-emerald-400 font-mono">{formatBytes(memory.free)}</span>
              </div>
              <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${memoryPercent}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
            </div>
          </div>

          {/* Disk Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <HardDrive className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-semibold text-slate-200">Disk</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total</span>
                <span className="text-slate-200 font-mono">{formatBytes(disk.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Used</span>
                <span className="text-amber-400 font-mono">{formatBytes(disk.used)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Available</span>
                <span className="text-emerald-400 font-mono">{formatBytes(disk.available)}</span>
              </div>
              <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${diskPercent}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CPU Section with Live Chart */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left: CPU Details */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-200">CPU</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Current Usage</span>
                  <span className="text-white font-mono">{cpu.usage}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${cpu.usage}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
                {cpu.cores && (
                  <div className="flex justify-start gap-4 text-xs text-slate-400 mt-2">
                    <span>Cores: {cpu.cores}</span>
                    {cpu.frequency && <span>Frequency: {cpu.frequency}</span>}
                  </div>
                )}
                {cpu.loadAvg && (
                  <div className="text-xs text-slate-400">
                    Load (1min): {cpu.loadAvg}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Live CPU Chart */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-semibold text-slate-300">Live CPU Trend (last 20 readings)</h4>
              </div>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '10px' }}
                      labelStyle={{ color: '#94a3b8' }}
                      formatter={(value) => [`${value}%`, 'CPU']}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Now</span>
                <span>{cpuHistory.length} readings</span>
                <span>{cpuHistory.length > 0 ? cpuHistory[0]?.time : 'ago'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Endpoints Section (unchanged) */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-200">Monitoring Endpoints</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* /healthz Endpoint */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700 hover:border-emerald-500/30 transition-all duration-300">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="text-xs font-mono text-emerald-400">GET</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => copyToClipboard(healthzUrl, 'healthz')}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    title="Copy URL"
                  >
                    {copiedHealthz ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </motion.button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <code className="text-sm font-mono text-slate-300">/healthz</code>
                </div>
                <p className="text-xs text-slate-400 mb-3">Simple health check endpoint for load balancers and monitoring systems.</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    Status: OK
                  </span>
                  <motion.a
                    href={healthzUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ x: 3 }}
                    className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                  >
                    Test <ExternalLink className="w-3 h-3" />
                  </motion.a>
                </div>
              </div>
            </div>

            {/* /metadata Endpoint */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700 hover:border-purple-500/30 transition-all duration-300">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                    <span className="text-xs font-mono text-purple-400">GET</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => copyToClipboard(metadataUrl, 'metadata')}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    title="Copy URL"
                  >
                    {copiedMetadata ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </motion.button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <FileCode className="w-4 h-4 text-purple-400" />
                  <code className="text-sm font-mono text-slate-300">/metadata</code>
                </div>
                <p className="text-xs text-slate-400 mb-3">Returns VM metadata including instance details, IPs, and configuration in JSON format.</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    JSON Response
                  </span>
                  <motion.a
                    href={metadataUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ x: 3 }}
                    className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </motion.a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}