import { motion } from "framer-motion";
import { Server, Database, Globe, Cpu, Fingerprint, Cloud } from "lucide-react";
import Card from "./Card";

export default function IdentityCard({ identity }) {
  const items = [
    { label: "Project", value: identity?.project, icon: Cloud },
    { label: "Instance ID", value: identity?.instanceId, icon: Fingerprint },
    { label: "Hostname", value: identity?.hostname, icon: Globe },
    { label: "Machine Type", value: identity?.machineType, icon: Cpu }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card title="Identity" subtitle="Project and instance details">
        <div className="space-y-3">
          {items.map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-slate-300">{item.label}</span>
              </div>
              <span className="text-sm font-mono text-slate-400 truncate max-w-[200px]">
                {item.value || "unknown"}
              </span>
            </motion.div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}