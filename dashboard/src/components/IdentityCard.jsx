import { motion } from "framer-motion";
import { Server, Database, Globe, Cpu, Fingerprint, Cloud } from "lucide-react";
import Card from "./Card";
import CopyValueButton from "./CopyValueButton";
import { buildIdentitySnapshot } from "../utils/widgetSnapshots";

export default function IdentityCard({ identity, zone, projectId, onCopyFailure, onCopySuccess }) {
  const handleProjectClick = () => {
    if (identity?.project) {
      window.open(`https://console.cloud.google.com/welcome?project=${identity.project}`, "_blank");
    } else {
      window.open("https://console.cloud.google.com/welcome", "_blank");
    }
  };

  const handleInstanceClick = () => {
    if (identity?.instanceName && zone && (projectId || identity?.project)) {
      const url = `https://console.cloud.google.com/compute/instancesDetail/zones/${zone}/instances/${identity.instanceName}?project=${projectId || identity.project}`;
      window.open(url, "_blank");
    } else {
      window.open("https://console.cloud.google.com/compute/instances", "_blank");
    }
  };

  const items = [
    { label: "Project", value: identity?.project, icon: Cloud, onClick: handleProjectClick },
    { label: "Instance ID", value: identity?.instanceId, icon: Fingerprint, onClick: handleInstanceClick },
    { label: "Instance Name", value: identity?.instanceName, icon: Globe, onClick: handleInstanceClick },
    { label: "Machine Type", value: identity?.machineType, icon: Cpu, onClick: handleInstanceClick }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card
        title="Identity"
        subtitle="Project and instance details"
        snapshotText={buildIdentitySnapshot(identity)}
        snapshotLabel="Identity snapshot"
        onCopyFailure={onCopyFailure}
        onCopySuccess={onCopySuccess}
      >
        <div className="space-y-3">
          {items.map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              onClick={item.onClick}
            >
              <div className="flex flex-shrink-0 items-center gap-3">
                <item.icon className="w-4 h-4 text-cyan-400" />
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
