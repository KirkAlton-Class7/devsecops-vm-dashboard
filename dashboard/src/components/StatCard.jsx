import { memo } from "react";
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

const getSeverityStyles = (severity) => {
  switch (severity) {
    case "HEALTHY":
      return {
        gradient: "from-emerald-500/20 via-teal-500/20 to-cyan-500/20",
        border: "border-emerald-500/30",
        iconColor: "text-emerald-400",
        pillBg: "bg-emerald-500/10",
        pillText: "text-emerald-400",
        glowColor: "rgba(6, 182, 212, 0.8)",
        isWarning: false,
      };
    case "MODERATE":
      return {
        gradient: "from-yellow-500/20 via-amber-500/20 to-orange-500/20",
        border: "border-yellow-500/30",
        iconColor: "text-yellow-500",
        pillBg: "bg-yellow-500/10",
        pillText: "text-yellow-500",
        glowColor: "rgba(234, 179, 8, 0.8)",
        isWarning: false,
      };
    case "HIGH":
      return {
        gradient: "from-orange-500/30 via-amber-500/30 to-yellow-500/20",
        border: "border-orange-500/50",
        iconColor: "text-orange-500",
        pillBg: "bg-orange-500/30",        // darker background for contrast
        pillText: "text-orange-300",       // brighter text
        glowColor: "rgba(249, 115, 22, 1)",
        isWarning: true,
      };
    case "CRITICAL":
      return {
        gradient: "from-red-500/40 via-red-600/30 to-red-700/20",
        border: "border-red-500/60",
        iconColor: "text-red-500",
        pillBg: "bg-red-500/30",           // darker background for contrast
        pillText: "text-red-300",          // brighter text
        glowColor: "rgba(239, 68, 68, 1)",
        isWarning: true,
      };
    default:
      return {
        gradient: "from-emerald-500/20 via-teal-500/20 to-cyan-500/20",
        border: "border-emerald-500/30",
        iconColor: "text-emerald-400",
        pillBg: "bg-emerald-500/10",
        pillText: "text-emerald-400",
        glowColor: "rgba(6, 182, 212, 0.8)",
        isWarning: false,
      };
  }
};

function StatCard({
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
  let displayValue = value;
  let displayStatus = status;
  let severity = null;

  // Action card overrides
  if (label === "Potential Savings") {
    displayValue = "Explore";
    displayStatus = "OPTIMIZE";
  } else if (label === "CUD Coverage") {
    displayValue = "Configure";
  }

  // FinOps budget‑based cards
  if ((label === "Total Cost (MTD)" || label === "Forecast (EOM)") && monthlyBudget > 0) {
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      const ratio = numericValue / monthlyBudget;
      if (ratio < 0.5) {
        displayStatus = "HEALTHY";
        severity = "HEALTHY";
      } else if (ratio < 0.8) {
        displayStatus = "MODERATE";
        severity = "MODERATE";
      } else if (ratio < 1.0) {
        displayStatus = "HIGH";
        severity = "HIGH";
      } else {
        displayStatus = "CRITICAL";
        severity = "CRITICAL";
      }
    }
  }

  // DevSecOps CPU / Memory / Disk - compute severity from percentage
  if (label === "CPU" || label === "Memory" || label === "Disk") {
    if (value && value.includes('%')) {
      const pct = parseInt(value);
      if (!isNaN(pct)) {
        if (pct <= 70) {
          displayStatus = "HEALTHY";
          severity = "HEALTHY";
        } else if (pct <= 89) {
          displayStatus = "HIGH";
          severity = "HIGH";
        } else {
          displayStatus = "CRITICAL";
          severity = "CRITICAL";
        }
      }
    }
  }

  let styles;
  if (severity) {
    styles = getSeverityStyles(severity);
  } else if (displayStatus === "OPTIMIZE") {
    styles = {
      gradient: "from-emerald-500/20 via-teal-500/20 to-cyan-500/20",
      border: "border-emerald-500/30",
      iconColor: "text-emerald-400",
      pillBg: "bg-cyan-500/10",
      pillText: "text-cyan-400",
      glowColor: "rgba(6, 182, 212, 0.8)",
      isWarning: false,
    };
  } else {
    // Fallback for any other card
    const isWarning = status === "warning";
    if (isWarning) {
      styles = {
        gradient: "from-orange-500/20 via-amber-500/20 to-yellow-500/20",
        border: "border-orange-500/30",
        iconColor: "text-orange-400",
        pillBg: "bg-orange-500/30",
        pillText: "text-orange-300",
        glowColor: "rgba(251, 146, 60, 0.8)",
        isWarning: true,
      };
    } else {
      styles = {
        gradient: "from-emerald-500/20 via-teal-500/20 to-cyan-500/20",
        border: "border-emerald-500/30",
        iconColor: "text-emerald-400",
        pillBg: "bg-emerald-500/10",
        pillText: "text-emerald-400",
        glowColor: "rgba(6, 182, 212, 0.8)",
        isWarning: false,
      };
    }
  }

  const getClickUrl = () => {
    if (label === "Potential Savings") return "https://console.cloud.google.com/cloud-hub/optimization";
    if (label === "CUD Coverage") return "https://console.cloud.google.com/compute/commitments";
    if (label === "Total Cost (MTD)" || label === "Forecast (EOM)") {
      if (projectId) return `https://console.cloud.google.com/billing?project=${projectId}`;
      return "https://console.cloud.google.com/billing";
    }
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

  let percentage = null;
  if (label === "CPU" || label === "Memory" || label === "Disk") {
    if (value && value.includes('%')) percentage = parseInt(value);
  }

  let pillIcon = null;
  if (displayStatus === "OPTIMIZE") {
    pillIcon = <Sparkles className="w-3 h-3" />;
  } else if (styles.isWarning) {
    pillIcon = <TrendingUp className="w-3 h-3" />;
  } else {
    pillIcon = <TrendingDown className="w-3 h-3" />;
  }

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${styles.gradient} backdrop-blur-xl border ${styles.border} shadow-xl group w-full cursor-pointer`}
      whileHover={{ y: -5, transition: { type: "spring", stiffness: 300, damping: 20 } }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      onClick={handleClick}
    >
      <div className="relative p-6 z-10">
        <div className="flex items-start justify-between mb-4">
          <motion.div 
            className={`p-3 rounded-xl bg-white/5 backdrop-blur-sm border ${styles.border}`}
            whileHover={{ scale: 1.05, boxShadow: `0 0 12px ${styles.glowColor}`, transition: { duration: 0.2, ease: "easeOut" } }}
            transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
          >
            <Icon className={`w-6 h-6 ${styles.iconColor}`} />
          </motion.div>
          
          <motion.div 
            className={`flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-sm ${styles.pillBg}`}
            whileHover={{ scale: 1.05, boxShadow: `0 0 8px ${styles.glowColor}`, transition: { duration: 0.2 } }}
            transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
          >
            {pillIcon}
            <span className={`text-xs font-medium uppercase ${styles.pillText}`}>{displayStatus}</span>
          </motion.div>
        </div>
        
        <div className="space-y-2">
          <p className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            {displayValue}
          </p>
          <p className="text-sm text-slate-400 font-medium tracking-wide uppercase">{label}</p>
        </div>

        {percentage !== null && (
          <div className="mt-4">
            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${styles.isWarning ? 'from-orange-500 to-amber-500' : 'from-emerald-500 to-cyan-500'} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
              />
            </div>
            <motion.p className="text-xs text-slate-500 mt-2">{percentage}% utilized</motion.p>
          </div>
        )}
        
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
      
      <div className="absolute bottom-0 right-0 w-20 h-20 opacity-10">
        <div className="absolute bottom-0 right-0 w-16 h-16 rounded-tl-full bg-gradient-to-tl from-white to-transparent"></div>
      </div>
    </motion.div>
  );
}

export default memo(StatCard);
