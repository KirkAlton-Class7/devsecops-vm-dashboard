import Card from "./Card";
import { AlertTriangle, AlertCircle } from "lucide-react";

export default function BudgetCard({ name, amount, spent }) {
  const percentUsed = (spent / amount) * 100;
  const isOverBudget = spent > amount;
  const isNearLimit = percentUsed > 90;

  const getGradientColors = () => {
    if (percentUsed <= 50) return "from-emerald-500 to-lime-500";
    if (percentUsed <= 80) return "from-lime-500 to-amber-500";
    if (percentUsed <= 90) return "from-amber-500 to-orange-500";
    if (percentUsed <= 100) return "from-orange-500 to-red-500";
    return "from-red-500 to-rose-600";
  };

  const barColor = getGradientColors();

  return (
    <Card title={name} subtitle="Budget status">
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Spent</span>
          <span className={`font-mono ${isOverBudget ? "text-red-400" : "text-white"}`}>
            ${spent.toFixed(2)} / ${amount.toFixed(2)}
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">{percentUsed.toFixed(0)}% used</span>
        </div>
        {isNearLimit && !isOverBudget && (
          <p className="text-xs text-orange-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Approaching budget limit
          </p>
        )}
        {isOverBudget && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Budget exceeded!
          </p>
        )}
      </div>
    </Card>
  );
}