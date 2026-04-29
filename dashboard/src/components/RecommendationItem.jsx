import { Copy, TrendingUp } from "lucide-react";
import { writeClipboardText } from "../utils/clipboard";
import { buildRightsizingItemSnapshot } from "../utils/widgetSnapshots";

export default function RecommendationItem({
  resource,
  description,
  monthlySavings,
  impact = "MEDIUM",
  onCopyFailure,
  onCopySuccess,
}) {
  const impactColor = {
    HIGH: "text-red-400 bg-red-500/10",
    MEDIUM: "text-orange-400 bg-orange-500/10",
    LOW: "text-yellow-400 bg-yellow-500/10",
  }[impact] || "text-blue-400 bg-blue-500/10";

  const handleClick = () => {
    window.open("https://console.cloud.google.com/cloud-hub/optimization", "_blank");
  };

  const handleCopy = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const snapshot = buildRightsizingItemSnapshot({ resource, description, monthlySavings, impact });

    try {
      await writeClipboardText(snapshot);
      onCopySuccess?.("Rightsizing recommendation copied to clipboard.");
    } catch (error) {
      console.error("Failed to copy rightsizing recommendation:", error);
      onCopyFailure?.(snapshot, "Rightsizing recommendation");
    }
  };

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white truncate">{resource}</p>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${impactColor}`}>
            {impact}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">{description}</p>
      </div>
      <div className="flex items-center gap-3 ml-4">
        <div className="text-right">
          <div className="flex items-center gap-1 text-emerald-400">
            <TrendingUp className="w-3 h-3" />
            <span className="text-sm font-mono">${monthlySavings}/mo</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-all hover:bg-white/10 hover:text-cyan-300 group-hover:opacity-100 focus-visible:opacity-100"
          title="Copy rightsizing recommendation"
          aria-label="Copy rightsizing recommendation"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
