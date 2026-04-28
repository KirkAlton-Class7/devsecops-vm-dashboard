import { motion } from "framer-motion";
import { Network, Wifi, Lock, Globe, MapPin, Shield } from "lucide-react";
import Card from "./Card";

export default function NetworkCard({ network }) {
  const items = [
    { label: "VPC", value: network?.vpc, icon: Shield },
    { label: "Subnet", value: network?.subnet, icon: Wifi },
    { label: "Internal IP", value: network?.internalIp, icon: Lock },
    { label: "External IP", value: network?.externalIp, icon: Globe }
  ];

  const handleClick = () => {
    window.open("https://console.cloud.google.com/networking/networks/", "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card title="Network" subtitle="Connectivity and addressing">
        <div className="space-y-3">
          {items.map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 + 0.1 }}
              className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              onClick={handleClick}
            >
              <div className="flex flex-shrink-0 items-center gap-3">
                <item.icon className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-slate-300">{item.label}</span>
              </div>
              <span className="min-w-0 flex-1 break-all text-right text-sm font-mono text-slate-400">
                {item.value || "unknown"}
              </span>
            </motion.div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
