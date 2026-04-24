import { TrendingUp } from "lucide-react";

export default function RecommendationItem({
  resource,
  description,
  monthlySavings,
  impact = "MEDIUM",
}) {
  const impactColor = {
    HIGH: "text-red-400 bg-red-500/10",
    MEDIUM: "text-orange-400 bg-orange-500/10",
    LOW: "text-yellow-400 bg-yellow-500/10",
  }[impact] || "text-blue-400 bg-blue-500/10";

  const handleClick = () => {
    window.open("https://console.cloud.google.com/cloud-hub/optimization", "_blank");
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
      </div>
    </div>
  );
}