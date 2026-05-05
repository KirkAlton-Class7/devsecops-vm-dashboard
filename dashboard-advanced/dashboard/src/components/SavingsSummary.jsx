import { TrendingDown, Sparkles } from "lucide-react";
import Card from "./Card";

export default function SavingsSummary({ realized = 0, potential = 0, currency = "$" }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card title="Realized Savings">
        <div className="flex items-center justify-between">
          <TrendingDown className="w-8 h-8 text-emerald-400" />
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-400">
              {currency}{realized.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500">this month</p>
          </div>
        </div>
      </Card>
      <Card title="Potential Savings">
        <div className="flex items-center justify-between">
          <Sparkles className="w-8 h-8 text-cyan-400" />
          <div className="text-right">
            <p className="text-2xl font-bold text-cyan-400">
              {currency}{potential.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500">from recommendations</p>
          </div>
        </div>
      </Card>
    </div>
  );
}