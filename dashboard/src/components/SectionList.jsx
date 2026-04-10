import { motion } from "framer-motion";
import { ChevronRight, RefreshCw } from "lucide-react";
import Card from "./Card";
import StatusDot from "./StatusDot";

export default function SectionList({ title, subtitle, items, limit, onLimitChange }) {
  // Convert item status to StatusDot compatible status
  const getStatusDotStatus = (itemStatus) => {
    const status = itemStatus?.toLowerCase() || "";
    if (status === "healthy" || status === "running" || status === "installed" || 
        status === "reachable" || status === "ready" || status === "active" ||
        status === "successful" || status === "serving") {
      return "success";
    }
    if (status === "warning" || status === "pending" || status === "degraded") {
      return "warning";
    }
    if (status === "critical" || status === "error" || status === "failed" || 
        status === "unreachable" || status === "unavailable") {
      return "critical";
    }
    return "healthy";
  };

  // Limit cycling logic (3‑30 step 3) using props
  const totalItems = items.length;
  const increments = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];

  const cycleLimit = () => {
    if (limit >= totalItems) {
      onLimitChange(increments[0]);
      return;
    }
    const currentIndex = increments.indexOf(limit);
    const nextIndex = (currentIndex + 1) % increments.length;
    onLimitChange(increments[nextIndex]);
  };

  const displayedItems = items.slice(0, limit);
  const isShowingAll = limit >= totalItems;
  const displayText = isShowingAll ? `all ${totalItems}` : `${limit} of ${totalItems}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card title={title} subtitle={subtitle}>
        <div className="flex justify-between items-center mb-3 px-1">
          <div className="text-xs text-slate-500">
            Showing {displayText} services
          </div>
          <button
            onClick={cycleLimit}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors px-2 py-1 rounded border border-slate-700 hover:border-cyan-500/50"
            title="Cycle services (3‑30 step 3)"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Cycle services</span>
          </button>
        </div>

        <div className="space-y-3">
          {displayedItems.map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ 
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900/50 to-slate-950/50 backdrop-blur-sm border border-slate-800 hover:border-slate-700 transition-all duration-300"
            >
              {/* Hover gradient effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-purple-600/0"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
              />
              
              <div className="relative px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200 group-hover:text-slate-100 transition-colors">
                      {item.label}
                    </p>
                    <p className="truncate text-sm text-slate-400 mt-1 font-mono">
                      {item.value}
                    </p>
                  </div>
                  
                  <div className="ml-4 flex items-center gap-3">
                    <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/5 backdrop-blur-sm">
                      <StatusDot 
                        status={getStatusDotStatus(item.status)} 
                        size="sm"
                        showTooltip={true}
                        animated={true}
                      />
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        {item.status}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800">
          <p className="text-xs text-slate-500">
            Showing {displayText} service{totalItems !== 1 ? 's' : ''}
          </p>
        </div>
      </Card>
    </motion.div>
  );
}