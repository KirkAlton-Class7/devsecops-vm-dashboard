import { motion } from "framer-motion";
import { MapPin, Clock, Activity, Gauge, Navigation, Timer } from "lucide-react";
import Card from "./Card";

export default function LocationCard({ location, instanceName, zone, projectId }) {
  const handleRegionZoneClick = () => {
    window.open("https://console.cloud.google.com/cloud-hub/", "_blank");
  };

  const handleUptimeLoadClick = () => {
    if (instanceName && zone && projectId) {
      window.open(`https://console.cloud.google.com/compute/instancesDetail/zones/${zone}/instances/${instanceName}?project=${projectId}`, "_blank");
    } else {
      window.open("https://console.cloud.google.com/compute/instances", "_blank");
    }
  };

  const items = [
    { label: "Region", value: location?.region, icon: MapPin, onClick: handleRegionZoneClick },
    { label: "Zone", value: location?.zone, icon: Navigation, onClick: handleRegionZoneClick },
    { label: "Uptime", value: location?.uptime, icon: Timer, onClick: handleUptimeLoadClick },
    { label: "Load (5m)", value: location?.loadAvg, icon: Gauge, onClick: handleUptimeLoadClick }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card title="Location" subtitle="Placement and availability">
        <div className="space-y-3">
          {items.map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 + 0.2 }}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              onClick={item.onClick}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-300">{item.label}</span>
              </div>
              <span className="text-sm font-mono text-slate-400">
                {item.value || "unknown"}
              </span>
            </motion.div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}