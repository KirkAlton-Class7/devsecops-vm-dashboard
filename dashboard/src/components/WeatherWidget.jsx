import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Cloud, CloudRain, CloudSnow, Sun, Moon, Wind, Thermometer, Loader2 } from "lucide-react";

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // wttr.in returns plain text with format: temperature + condition
        // e.g., "+25°C ☀️"
        const response = await fetch('https://wttr.in/?format=%t+%C');
        if (!response.ok) throw new Error('Failed to fetch weather');
        const text = await response.text();
        // Parse into temperature and condition
        const match = text.match(/([+-]?\d+°C)\s+(.+)/);
        if (match) {
          setWeather({
            temperature: match[1],
            condition: match[2].trim(),
          });
        } else {
          setWeather({ temperature: text.trim(), condition: '' });
        }
        setLoading(false);
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError('Could not load weather');
        setLoading(false);
      }
    };

    fetchWeather();
    // Refresh every 10 minutes
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getWeatherIcon = () => {
    if (!weather) return <Cloud className="w-5 h-5" />;
    const cond = weather.condition.toLowerCase();
    if (cond.includes('rain')) return <CloudRain className="w-5 h-5 text-blue-400" />;
    if (cond.includes('snow')) return <CloudSnow className="w-5 h-5 text-blue-200" />;
    if (cond.includes('sun') || cond.includes('clear')) return <Sun className="w-5 h-5 text-yellow-400" />;
    if (cond.includes('night')) return <Moon className="w-5 h-5 text-indigo-300" />;
    if (cond.includes('wind')) return <Wind className="w-5 h-5 text-slate-400" />;
    return <Cloud className="w-5 h-5 text-slate-400" />;
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center p-4 rounded-xl bg-white/5 border border-white/10"
      >
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-400">Weather...</span>
      </motion.div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-xs text-slate-500">{error}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-white/10"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getWeatherIcon()}
          <span className="text-sm font-medium text-slate-300">
            {weather.temperature}
          </span>
          <span className="text-xs text-slate-400">{weather.condition}</span>
        </div>
        <div className="text-xs text-slate-500">
          <Thermometer className="w-3 h-3 inline mr-1" />
          Local weather
        </div>
      </div>
    </motion.div>
  );
};

export default WeatherWidget;