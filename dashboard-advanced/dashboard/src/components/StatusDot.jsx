import { motion } from "framer-motion";

const statusMap = {
  healthy: {
    bg: "bg-emerald-400",
    glow: "shadow-[0_0_8px_rgba(52,211,153,0.6)]",
    pulse: "animate-pulse",
    label: "Healthy"
  },
  warning: {
    bg: "bg-amber-400",
    glow: "shadow-[0_0_8px_rgba(251,191,36,0.6)]",
    pulse: "animate-pulse",
    label: "Warning"
  },
  critical: {
    bg: "bg-rose-400",
    glow: "shadow-[0_0_8px_rgba(244,63,94,0.6)]",
    pulse: "animate-pulse",
    label: "Critical"
  },
  success: {
    bg: "bg-emerald-400",
    glow: "shadow-[0_0_8px_rgba(52,211,153,0.6)]",
    pulse: "animate-pulse",
    label: "Success"
  },
  error: {
    bg: "bg-red-500",
    glow: "shadow-[0_0_8px_rgba(239,68,68,0.6)]",
    pulse: "animate-pulse",
    label: "Error"
  },
  idle: {
    bg: "bg-slate-500",
    glow: "shadow-[0_0_8px_rgba(100,116,139,0.4)]",
    pulse: "",
    label: "Idle"
  }
};

export default function StatusDot({ 
  status = "healthy", 
  size = "md", 
  showPulse = true,
  showTooltip = true,
  animated = true 
}) {
  const config = statusMap[status] || statusMap.healthy;
  
  const sizeClasses = {
    sm: "h-1.5 w-1.5",
    md: "h-2.5 w-2.5",
    lg: "h-3.5 w-3.5",
    xl: "h-5 w-5"
  };
  
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  
  return (
    <div className="relative inline-flex items-center justify-center group">
      <motion.span
        className={`inline-block rounded-full ${config.bg} ${sizeClass} ${
          showPulse && config.pulse ? config.pulse : ''
        } ${animated ? 'transition-all duration-300' : ''}`}
        style={{
          boxShadow: config.glow,
        }}
        whileHover={animated ? { scale: 1.3 } : {}}
        animate={animated && !showPulse ? {
          scale: [1, 1.1, 1],
          transition: {
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1
          }
        } : {}}
        title={showTooltip ? config.label : undefined}
      />
      
      {/* Ripple effect for critical/warning statuses */}
      {(status === "critical" || status === "warning") && animated && (
        <motion.span
          className={`absolute inline-flex rounded-full ${config.bg} opacity-75 ${sizeClass}`}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      )}
      
      {/* Tooltip on hover */}
      {showTooltip && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          whileHover={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute left-full ml-2 px-2 py-1 bg-slate-800 rounded-md text-xs text-white whitespace-nowrap pointer-events-none z-10 shadow-lg border border-white/10"
          style={{ display: 'none' }}
          onMouseEnter={(e) => {
            const tooltip = e.currentTarget;
            tooltip.style.display = 'block';
          }}
          onMouseLeave={(e) => {
            const tooltip = e.currentTarget;
            tooltip.style.display = 'none';
          }}
        >
          {config.label}
          <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-slate-800"></div>
        </motion.div>
      )}
    </div>
  );
}