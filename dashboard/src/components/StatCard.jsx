import { motion } from "framer-motion";
import {
  Activity,
  Cpu,
  HardDrive,
  Network,
  TrendingUp,
  TrendingDown,
  Zap,
  DollarSign,
  Sparkles,
  Calendar,
  PiggyBank,
  Shield
} from "lucide-react";

const icons = {
  CPU: Cpu,
  Memory: Activity,
  Disk: HardDrive,
  Network: Network,
  Cost: DollarSign,
  "Total Cost (MTD)": DollarSign,
  "Forecast (EOM)": TrendingUp,
  "Potential Savings": PiggyBank,
  "CUD Coverage": Shield,
  default: Zap
};

export default function StatCard({
  label,
  value,
  status,
  instanceName,
  zone,
  projectId,
  billingAccountId,
  monthlyBudget = 0
}) {
  const Icon = icons[label] || icons.default;
  let isWarning = status === "warning";

  // Override displayed value and badge for action cards
  let displayValue = value;
  let displayStatus = status;
  if (label === "Potential Savings") {
    displayValue = "Explore";
    displayStatus = "OPTIMIZE";
  } else if (label === "CUD Coverage") {
    displayValue = "Configure";
    // Keep original status (e.g., "info") – no badge change required
  }

  // Budget‑based status for Total Cost and Forecast cards
  let budgetRatio = null;
  if ((label === "Total Cost (MTD)" || label === "Forecast (EOM)") && monthlyBudget > 0) {
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      budgetRatio = numericValue / monthlyBudget;
      if (budgetRatio < 0.5) {
        displayStatus = "HEALTHY";
        isWarning = false;
      } else if (budgetRatio < 0.8) {
        displayStatus = "MODERATE";
        isWarning = false;
      } else if (budgetRatio < 1.0) {
        displayStatus = "HIGH";
        isWarning = true;
      } else {
        displayStatus = "CRITICAL";
        isWarning = true;
      }
    }
  }

  const getClickUrl = () => {
    // Action cards override
    if (label === "Potential Savings") {
      return "https://console.cloud.google.com/cloud-hub/optimization";
    }
    if (label === "CUD Coverage") {
      return "https://console.cloud.google.com/compute/commitments";
    }
    // FinOps summary cards
    if (label === "Total Cost (MTD)" || label === "Forecast (EOM)") {
      if (projectId) return `https://console.cloud.google.com/billing?project=${projectId}`;
      return "https://console.cloud.google.com/billing";
    }
    // DevSecOps cards
    if (label === "Cost" || label === "Estimated Cost") {
      if (projectId) return `https://console.cloud.google.com/billing?project=${projectId}`;
      return "https://console.cloud.google.com/billing/projects";
    }
    if (label === "CPU" || label === "Memory" || label === "Disk") {
      if (instanceName && zone && projectId) {
        return `https://console.cloud.google.com/compute/instancesDetail/zones/${zone}/instances/${instanceName}?project=${projectId}`;
      }
      return "https://console.cloud.google.com/compute/";
    }
    return null;
  };

  const handleClick = () => {
    const url = getClickUrl();
    if (url) window.open(url, "_blank");
  };

  const getGradient = () => {
    if (isWarning) return "from-orange-500/20 via-amber-500/20 to-yellow-500/20";
    return "from-emerald-500/20 via-teal-500/20 to-cyan-500/20";
  };
  
  const getBorderColor = () => {
    if (isWarning) return "border-orange-500/30";
    return "border-emerald-500/30";
  };
  
  const getIconColor = () => {
    if (isWarning) return "text-orange-400";
    return "text-emerald-400";
  };
  
  const getStatusColor = () => {
    // For custom status "OPTIMIZE", use cyan styling
    if (displayStatus === "OPTIMIZE") return "text-cyan-400 bg-cyan-500/10";
    if (isWarning) return "text-orange-400 bg-orange-500/10";
    return "text-emerald-400 bg-emerald-500/10";
  };

  let percentage = null;
  if (label === "CPU" || label === "Memory" || label === "Disk") {
    if (value && value.includes('%')) percentage = parseInt(value);
  }

  const glowColor = isWarning 
    ? "rgba(251, 146, 60, 0.8)"
    : "rgba(6, 182, 212, 0.8)";

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${getGradient()} backdrop-blur-xl border ${getBorderColor()} shadow-xl group w-full cursor-pointer`}
      whileHover={{ y: -5, transition: { type: "spring", stiffness: 300, damping: 20 } }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      onClick={handleClick}
    >
      <div className="relative p-6 z-10">
        {/* Top row: icon + status pill */}
        <div className="flex items-start justify-between mb-4">
          <motion.div 
            className={`p-3 rounded-xl bg-white/5 backdrop-blur-sm border ${getBorderColor()}`}
            whileHover={{ scale: 1.05, boxShadow: `0 0 12px ${glowColor}`, transition: { duration: 0.2, ease: "easeOut" } }}
            transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
          >
            <Icon className={`w-6 h-6 ${getIconColor()}`} />
          </motion.div>
          
          <motion.div 
            className={`flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-sm ${getStatusColor()}`}
            whileHover={{ scale: 1.05, boxShadow: `0 0 8px ${glowColor}`, transition: { duration: 0.2 } }}
            transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
          >
            {displayStatus === "OPTIMIZE" ? (
              <Sparkles className="w-3 h-3" />
            ) : isWarning ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span className="text-xs font-medium uppercase">{displayStatus}</span>
          </motion.div>
        </div>
        
        {/* Value and label */}
        <div className="space-y-2">
          <p className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            {displayValue}
          </p>
          <p className="text-sm text-slate-400 font-medium tracking-wide uppercase">{label}</p>
        </div>

        {/* Progress Bar (only for DevSecOps cards) */}
        {percentage !== null && (
          <div className="mt-4">
            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${isWarning ? 'from-orange-500 to-amber-500' : 'from-emerald-500 to-cyan-500'} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
              />
            </div>
            <motion.p
              key={percentage}
              className="text-xs text-slate-500 mt-2"
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {percentage}% utilized
            </motion.p>
          </div>
        )}
        
        {/* Active indicator for non‑percentage cards */}
        {!percentage && (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
              <span className="text-xs text-cyan-400 animate-pulse">● Active</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Corner decoration */}
      <div className="absolute bottom-0 right-0 w-20 h-20 opacity-10">
        <div className="absolute bottom-0 right-0 w-16 h-16 rounded-tl-full bg-gradient-to-tl from-white to-transparent"></div>
      </div>
    </motion.div>
  );
}