import { motion } from "framer-motion";
import Card from "./Card";

export default function SimpleBarChart({ data }) {
  // Debug: log what data is received
  console.log("Chart data:", data);
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card title="Usage Trend" subtitle="Weekly service activity">
          <div className="flex items-center justify-center h-64 text-slate-400">
            <p>No chart data available</p>
          </div>
        </Card>
      </motion.div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  console.log("Max value:", maxValue);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card title="Usage Trend" subtitle="Weekly service activity">
        <div className="h-64 flex items-end gap-4 mt-4">
          {data.map((item, idx) => {
            // Calculate height as percentage of the container (max 100%)
            const barHeight = (item.value / maxValue) * 100;
            
            return (
              <div key={item.name} className="flex-1 flex flex-col items-center gap-2 h-full">
                <div className="flex-1 w-full flex items-end">
                  <motion.div
                    className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg cursor-pointer relative group"
                    style={{ height: `${barHeight}%`, minHeight: barHeight > 0 ? '4px' : '0px' }}
                    initial={{ height: 0 }}
                    animate={{ height: `${barHeight}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.1, ease: "easeOut" }}
                    whileHover={{ scale: 1.05 }}
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-800 px-2 py-1 rounded text-xs text-white whitespace-nowrap">
                      {item.value}
                    </div>
                  </motion.div>
                </div>
                <div className="text-xs text-slate-400 font-medium">{item.name}</div>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"></div>
            <span className="text-xs text-slate-400">Usage Value</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}