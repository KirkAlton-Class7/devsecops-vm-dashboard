import Card from "./Card";

export default function BudgetCard({ name, amount, spent, forecast, thresholds = [] }) {
  const percentUsed = (spent / amount) * 100;
  const forecastPercent = forecast ? (forecast / amount) * 100 : 0;
  const isOverBudget = spent > amount;
  const isNearLimit = percentUsed > 90;

  // Gradient colors for the progress bar
  const getGradientColors = () => {
    if (percentUsed <= 50) return "from-emerald-500 to-lime-500";
    if (percentUsed <= 80) return "from-lime-500 to-amber-500";
    if (percentUsed <= 90) return "from-amber-500 to-orange-500";
    if (percentUsed <= 100) return "from-orange-500 to-red-500";
    return "from-red-500 to-rose-600";
  };

  // Forecast color based on forecast percentage
  const getForecastColor = () => {
    if (forecastPercent <= 50) return "text-emerald-600";
    if (forecastPercent <= 80) return "text-amber-600";
    if (forecastPercent <= 90) return "text-orange-600";
    if (forecastPercent <= 100) return "text-red-600";
    return "text-rose-700";
  };

  const barColor = getGradientColors();
  const forecastColor = forecast ? getForecastColor() : null;

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
          {forecast && forecastColor && (
            <span className={`${forecastColor} font-medium`}>
              Forecast: ${forecast.toFixed(2)}
            </span>
          )}
        </div>
        {thresholds.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2">
            {thresholds.map((t, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300"
              >
                {t * 100}% alert
              </span>
            ))}
          </div>
        )}
        {isNearLimit && !isOverBudget && (
          <p className="text-xs text-orange-400">⚠️ Approaching budget limit</p>
        )}
        {isOverBudget && (
          <p className="text-xs text-red-400">‼️ Budget exceeded!</p>
        )}
      </div>
    </Card>
  );
}