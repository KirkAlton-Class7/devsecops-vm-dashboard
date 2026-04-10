import { motion } from "framer-motion";
import { MapPin, Clock, Activity, Gauge, Navigation, Timer } from "lucide-react";
import Card from "./Card";

export default function LocationCard({ location }) {
  const items = [
    { label: "Region", value: location?.region, icon: MapPin },
    { label: "Zone", value: location?.zone, icon: Navigation },
    { label: "Uptime", value: location?.uptime, icon: Timer },
    { label: "Load (5m)", value: location?.loadAvg, icon: Gauge }
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
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
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