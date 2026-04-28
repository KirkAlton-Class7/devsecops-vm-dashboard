import { motion } from "framer-motion";
import { useState } from "react";
import { Copy, CheckCircle, ExternalLink, Activity, FileCode } from "lucide-react";
import Card from "./Card";

export default function MonitoringEndpointsCard({ endpoints, onCopyFailure }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyToClipboard = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      onCopyFailure?.();
    }
  };

  if (!endpoints || endpoints.length === 0) {
    return (
      <Card title="Monitoring Endpoints" subtitle="Health checks, metrics, and instance metadata">
        <div className="text-sm text-slate-400">No endpoints configured</div>
      </Card>
    );
  }

  // Helper to get a friendly description based on endpoint name
  const getDescription = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes("health")) return "Health check endpoint for load balancers and monitoring systems.";
    if (lower.includes("metadata")) return "Returns VM metadata including instance details and configuration.";
    if (lower.includes("metrics")) return "Prometheus‑compatible metrics endpoint for observability.";
    if (lower.includes("log")) return "Log ingestion endpoint for centralised logging.";
    return "Monitoring endpoint for system health and diagnostics.";
  };

  // Helper to get status display (still uses status from data)
  const getStatusDisplay = (status) => {
    switch (status?.toLowerCase()) {
      case "up":
        return { color: "text-emerald-400", bg: "bg-emerald-500/20", label: "OK", icon: <Activity className="w-3 h-3" /> };
      case "degraded":
        return { color: "text-yellow-400", bg: "bg-yellow-500/20", label: "Degraded", icon: <Activity className="w-3 h-3" /> };
      default:
        return { color: "text-red-400", bg: "bg-red-500/20", label: "Down", icon: <Activity className="w-3 h-3" /> };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card title="Monitoring Endpoints" subtitle="Health checks, metrics, and instance metadata">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {endpoints.map((ep, idx) => {
            const statusDisplay = getStatusDisplay(ep.status);
            return (
              <div
                key={idx}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700 hover:border-cyan-500/30 transition-all duration-300"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {/* Glowing pulsing dot – now cyan */}
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                      <span className="text-xs font-mono text-cyan-400">GET</span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => copyToClipboard(ep.url, idx)}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      title="Copy URL"
                    >
                      {copiedIndex === idx ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </motion.button>
                  </div>
                  <div className="flex items-start gap-2 mb-2">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    <code className="min-w-0 break-all text-sm font-mono text-slate-300">{ep.name}</code>
                  </div>
                  <p className="text-xs text-slate-400 mb-3 line-clamp-2">{getDescription(ep.name)}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${statusDisplay.color} flex items-center gap-1`}>
                      {statusDisplay.icon}
                      Status: {statusDisplay.label}
                    </span>
                    <motion.a
                      href={ep.url}
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
            );
          })}
        </div>
      </Card>
    </motion.div>
  );
}
