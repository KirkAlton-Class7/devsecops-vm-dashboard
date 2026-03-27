import { motion } from "framer-motion";
import { Clock, Activity, Bell, User, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";

export default function Header({ appName, tagline, uptime }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [cloudProvider, setCloudProvider] = useState({ name: "Cloud", color: "from-slate-500 to-slate-400" });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Detect cloud provider dynamically
  useEffect(() => {
    async function detectCloudProvider() {
      // Try to get metadata from the VM (if running on cloud)
      try {
        // Check for GCP metadata endpoint
        const gcpCheck = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/zone', {
          headers: { 'Metadata-Flavor': 'Google' }
        });
        if (gcpCheck.ok) {
          setCloudProvider({ name: "Google Cloud", color: "from-emerald-500 to-green-400" });
          return;
        }
      } catch (e) {
        // Not GCP
      }

      try {
        // Check for AWS metadata endpoint
        const awsCheck = await fetch('http://169.254.169.254/latest/meta-data/instance-id');
        if (awsCheck.ok) {
          setCloudProvider({ name: "AWS", color: "from-orange-500 to-amber-400" });
          return;
        }
      } catch (e) {
        // Not AWS
      }

      try {
        // Check for Azure metadata endpoint
        const azureCheck = await fetch('http://169.254.169.254/metadata/instance?api-version=2017-08-01', {
          headers: { 'Metadata': 'true' }
        });
        if (azureCheck.ok) {
          setCloudProvider({ name: "Azure", color: "from-blue-500 to-blue-400" });
          return;
        }
      } catch (e) {
        // Not Azure
      }

      // Default fallback - detect from hostname
      const hostname = window.location.hostname;
      if (hostname.includes('google') || hostname.includes('gcp')) {
        setCloudProvider({ name: "Google Cloud", color: "from-emerald-500 to-green-400" });
      } else if (hostname.includes('amazon') || hostname.includes('aws')) {
        setCloudProvider({ name: "AWS", color: "from-orange-500 to-amber-400" });
      } else if (hostname.includes('azure')) {
        setCloudProvider({ name: "Azure", color: "from-blue-500 to-blue-400" });
      } else {
        setCloudProvider({ name: "Cloud", color: "from-slate-500 to-slate-400" });
      }
    }

    detectCloudProvider();
  }, []);

  const formattedTime = currentTime.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  // Dynamic deployment text based on provider
  const getDeploymentText = () => {
    if (cloudProvider.name === "Google Cloud") return "Google Cloud Deployment";
    if (cloudProvider.name === "AWS") return "AWS Deployment";
    if (cloudProvider.name === "Azure") return "Azure Deployment";
    return "Cloud Deployment";
  };

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100 }}
      className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl shadow-lg"
    >
      <div className="relative">
        <motion.div 
          className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatDelay: 5,
            ease: "linear"
          }}
        />
        
        <div className="flex items-center justify-between px-4 py-3 lg:px-6 lg:py-4">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative flex-1 min-w-0"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">
                {appName}
              </p>
            </div>
            {/* Dynamic deployment text - text only, no icon */}
            <div className="flex items-center gap-2 mt-1">
              <motion.div 
                className={`px-2 py-0.5 rounded-full bg-gradient-to-r ${cloudProvider.color} bg-opacity-20 backdrop-blur-sm border border-white/10`}
                whileHover={{ scale: 1.05 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <span className="text-xs font-medium text-slate-300">{getDeploymentText()}</span>
              </motion.div>
            </div>
          </motion.div>
          
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Date Display */}
            <motion.div 
              className="hidden md:flex items-center gap-2 px-2 py-1 lg:px-3 lg:py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10"
              whileHover={{ scale: 1.05 }}
            >
              <span className="text-xs text-slate-400">{formattedDate}</span>
            </motion.div>
            
            {/* Time Display */}
            <motion.div 
              className="hidden sm:flex items-center gap-2 px-2 py-1 lg:px-3 lg:py-1.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10"
              whileHover={{ scale: 1.05 }}
            >
              <Clock className="w-3 h-3 lg:w-4 lg:h-4 text-cyan-400" />
              <span className="text-xs lg:text-sm text-slate-300 font-mono">{formattedTime}</span>
            </motion.div>
            
            {/* Uptime - shortened for mobile */}
            <motion.div 
              className="flex items-center gap-2 px-2 py-1 lg:px-3 lg:py-1.5 rounded-full bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30"
              whileHover={{ scale: 1.05 }}
            >
              <Activity className="w-3 h-3 lg:w-4 lg:h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs lg:text-sm text-slate-300 hidden sm:inline">
                Uptime: <span className="font-medium text-emerald-400">{uptime}</span>
              </span>
              <span className="text-xs lg:text-sm text-slate-300 sm:hidden">
                {uptime}
              </span>
            </motion.div>
            
            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-1.5 lg:p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Bell className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
              <motion.span 
                className="absolute top-0 right-0 w-1.5 h-1.5 lg:w-2 lg:h-2 bg-red-500 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </motion.button>
            
            {/* User Avatar */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1 p-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 shadow-lg hover:shadow-cyan-500/25 transition-shadow"
              >
                <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center">
                  <User className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                </div>
                <ChevronDown className={`w-3 h-3 text-white transition-transform duration-200 mr-1 lg:mr-2 ${showUserMenu ? 'rotate-180' : ''}`} />
              </motion.button>
              
              {/* User Dropdown Menu */}
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-800/95 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden z-50"
                >
                  <div className="py-2">
                    <div className="px-4 py-2 border-b border-white/10">
                      <p className="text-xs text-slate-400">Signed in as</p>
                      <p className="text-sm text-slate-200 font-medium">admin@devsecops</p>
                    </div>
                    <button className="w-full px-4 py-2 text-sm text-slate-300 hover:bg-white/10 transition-colors text-left">
                      Profile Settings
                    </button>
                    <button className="w-full px-4 py-2 text-sm text-slate-300 hover:bg-white/10 transition-colors text-left">
                      Dashboard Preferences
                    </button>
                    <div className="border-t border-white/10 my-1"></div>
                    <button className="w-full px-4 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors text-left">
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}