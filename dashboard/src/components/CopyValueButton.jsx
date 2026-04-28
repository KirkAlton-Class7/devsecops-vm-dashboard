import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Copy } from "lucide-react";

export default function CopyValueButton({
  value,
  label = "value",
  onCopyFailure,
  className = "",
  hoverOnly = false,
}) {
  const [copied, setCopied] = useState(false);

  const copyValue = async (event) => {
    event.stopPropagation();

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(String(value ?? ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error(`Failed to copy ${label}:`, error);
      onCopyFailure?.();
    }
  };

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={copyValue}
      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-white/10 hover:text-cyan-300 focus-visible:opacity-100 ${
        hoverOnly ? "opacity-0 group-hover:opacity-100" : ""
      } ${className}`}
      title={`Copy ${label}`}
      aria-label={`Copy ${label}`}
    >
      {copied ? (
        <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </motion.button>
  );
}
