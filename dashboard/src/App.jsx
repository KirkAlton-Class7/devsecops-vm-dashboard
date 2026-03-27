import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Header from "./components/Header";
import QuoteCard from "./components/QuoteCard";
import SceneryGallery from "./components/SceneryGallery";
import ResourceTable from "./components/ResourceTable";
import SectionList from "./components/SectionList";
import Sidebar from "./components/Sidebar";
import RealTimeMetrics from "./components/RealTimeMetrics";
import StatCard from "./components/StatCard";
import { mockDashboard, mockQuotes } from "./data/mockDashboard";

function getRandomQuote(quotes) {
  if (!quotes?.length) return mockQuotes[0];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export default function App() {
  const [dashboard, setDashboard] = useState(mockDashboard);
  const [quotes, setQuotes] = useState(mockQuotes);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch("/data/dashboard-data.json", { cache: "no-store" });
        if (!res.ok) throw new Error("dashboard fetch failed");
        const data = await res.json();
        setDashboard(data);
      } catch {
        setDashboard(mockDashboard);
      } finally {
        setIsLoading(false);
      }
    }

    async function loadQuotes() {
      try {
        const res = await fetch("/data/quotes.json", { cache: "no-store" });
        if (!res.ok) throw new Error("quotes fetch failed");
        const data = await res.json();
        setQuotes(Array.isArray(data) ? data : mockQuotes);
      } catch {
        setQuotes(mockQuotes);
      }
    }

    Promise.all([loadDashboard(), loadQuotes()]);
  }, []);

  const featuredQuote = useMemo(() => getRandomQuote(quotes), [quotes]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 blur-xl animate-pulse"></div>
          <div className="relative animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <Sidebar />

      <motion.div 
        className="lg:ml-72"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Header
          appName={dashboard.meta?.appName || "DevSecOps"}
          tagline={dashboard.meta?.tagline || "Real-time infrastructure monitoring"}
          uptime={dashboard.meta?.uptime || "Unknown"}
        />

        <motion.main 
          className="space-y-8 px-4 py-4 lg:px-6 lg:py-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Stats Cards */}
          <motion.section 
            id="overview" 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full"
            variants={itemVariants}
          >
            {dashboard.summaryCards?.map((card, idx) => (
              <div key={card.label} className="w-full">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: idx * 0.1, type: "spring", stiffness: 200 }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className="h-full"
                >
                  <StatCard
                    label={card.label}
                    value={card.value}
                    status={card.status}
                  />
                </motion.div>
              </div>
            ))}
          </motion.section>

          {/* Real-time Metrics & Quote & Gallery */}
          <motion.section 
            className="grid grid-cols-1 gap-6 lg:grid-cols-3"
            variants={itemVariants}
          >
            <motion.div 
              className="lg:col-span-2"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <RealTimeMetrics />
            </motion.div>
            <div className="space-y-6">
              <motion.div
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <QuoteCard quote={featuredQuote} />
              </motion.div>
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
              >
                <SceneryGallery />
              </motion.div>
            </div>
          </motion.section>

          {/* Info Sections */}
          <motion.section 
            className="grid grid-cols-1 gap-6 lg:grid-cols-3"
            variants={itemVariants}
          >
            <motion.div 
              id="vm-information"
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
            >
              <SectionList
                title="VM Information"
                subtitle="Core instance identity and placement"
                items={dashboard.vmInformation || []}
              />
            </motion.div>
            <motion.div 
              id="services"
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
            >
              <SectionList
                title="Services"
                subtitle="Application and bootstrap health"
                items={dashboard.services || []}
              />
            </motion.div>
            <motion.div 
              id="security"
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
            >
              <SectionList
                title="Security"
                subtitle="Host posture and network exposure"
                items={dashboard.security || []}
              />
            </motion.div>
          </motion.section>

          {/* Resource Tables */}
          <motion.section 
            id="resources" 
            className="grid grid-cols-1 gap-6 lg:grid-cols-2"
            variants={itemVariants}
          >
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
            >
              <ResourceTable rows={dashboard.resourceTable || []} title="System Resources" />
            </motion.div>
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
            >
              <ResourceTable
                rows={dashboard.logs?.map((log) => ({
                  name: log.time,
                  type: log.level,
                  scope: "app",
                  status: log.message,
                })) || []}
                title="Application Logs"
              />
            </motion.div>
          </motion.section>
        </motion.main>
      </motion.div>
    </div>
  );
}