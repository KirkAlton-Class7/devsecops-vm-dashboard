import { motion } from "framer-motion";
import { Network, Wifi, Lock, Globe, MapPin, Shield } from "lucide-react";
import Card from "./Card";
import CopyValueButton from "./CopyValueButton";
import { buildNetworkSnapshot } from "../utils/widgetSnapshots";

export default function NetworkCard({ network, onCopyFailure, onCopySuccess }) {
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
      <Card
        title="Network"
        subtitle="Connectivity and addressing"
        snapshotText={buildNetworkSnapshot(network)}
        snapshotLabel="Network snapshot"
        onCopyFailure={onCopyFailure}
        onCopySuccess={onCopySuccess}
      >
        <div className="space-y-3">
          {items.map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 + 0.1 }}
              className="group flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              onClick={handleClick}
            >
              <div className="flex flex-shrink-0 items-center gap-3">
                <item.icon className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-slate-300">{item.label}</span>
              </div>
              <div className="ml-auto flex min-w-0 flex-1 items-start justify-end gap-1">
                <span className="min-w-0 break-all text-right text-sm font-mono text-slate-400">
                  {item.value || "unknown"}
                </span>
                <CopyValueButton
                  value={item.value || "unknown"}
                  label={item.label}
                  onCopyFailure={onCopyFailure}
                  onCopySuccess={onCopySuccess}
                  hoverOnly
                />
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
