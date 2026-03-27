import { motion } from "framer-motion";
import { Activity, Cpu, HardDrive, Network, TrendingUp, TrendingDown, Zap } from "lucide-react";

const icons = {
  CPU: Cpu,
  Memory: Activity,
  Disk: HardDrive,
  Network: Network,
  default: Zap
};

export default function StatCard({ label, value, status }) {
  const Icon = icons[label] || icons.default;
  const isWarning = status === "warning";
  const numericValue = parseFloat(value);
  
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
    if (isWarning) return "text-orange-400 bg-orange-500/10";
    return "text-emerald-400 bg-emerald-500/10";
  };

  // Calculate percentage for progress bar
  let percentage = null;
  if (value.includes('%')) {
    percentage = parseInt(value);
  }

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${getGradient()} backdrop-blur-xl border ${getBorderColor()} shadow-xl group h-full`}
      whileHover={{ 
        y: -5,
        scale: 1.02,
        transition: { type: "spring", stiffness: 300, damping: 20 }
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
    >
      {/* Animated background glow */}
      <motion.div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isWarning ? 'bg-orange-500/5' : 'bg-emerald-500/5'}`}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0, 0.5, 0]
        }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
      />
      
      <div className="relative p-6 z-10 h-full flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <motion.div 
            className={`p-3 rounded-xl bg-white/5 backdrop-blur-sm border ${getBorderColor()}`}
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            <Icon className={`w-6 h-6 ${getIconColor()}`} />
          </motion.div>
          
          <motion.div 
            className={`flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-sm ${getStatusColor()}`}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {isWarning ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span className="text-xs font-medium uppercase">
              {status}
            </span>
          </motion.div>
        </div>
        
        <motion.div 
          className="space-y-2 flex-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <motion.p 
            className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            {value}
          </motion.p>
          <p className="text-sm text-slate-400 font-medium tracking-wide uppercase">{label}</p>
        </motion.div>

        {/* Progress Bar */}
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
              className="text-xs text-slate-500 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {percentage}% utilized
            </motion.p>
          </div>
        )}
        
        {/* Network indicator - consistent height with progress bar */}
        {!percentage && (
          <div className="mt-4 h-6">
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