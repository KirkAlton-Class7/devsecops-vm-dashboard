import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Header from "./components/Header";
import QuoteCard from "./components/QuoteCard";
import ImageGallery from "./components/ImageGallery";
import ResourceTable from "./components/ResourceTable";
import SectionList from "./components/SectionList";
import Sidebar from "./components/Sidebar";
import StatCard from "./components/StatCard";
import IdentityCard from "./components/IdentityCard";
import NetworkCard from "./components/NetworkCard";
import LocationCard from "./components/LocationCard";
import SystemResourcesCard from "./components/SystemResourcesCard";
import LoadTrendChart from "./components/LoadTrendChart";
import NetworkParticles from "./components/NetworkParticles";
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
      <Sidebar
        dashboardUser={dashboard.meta?.dashboardUser || "Kirk Alton"}
        dashboardName={dashboard.meta?.dashboardName || "DevSecOps Dashboard"}
      />

      <motion.div 
        className="lg:ml-72"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Header
          appName={dashboard.meta?.appName || "Custom Application"}
          tagline={dashboard.meta?.tagline || "Real-time infrastructure monitoring"}
          uptime={dashboard.meta?.uptime || "Unknown"}
        />

        <motion.main 
          className="space-y-8 px-4 py-4 lg:px-6 lg:py-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Stats Cards - Live Current Values */}
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

          {/* Load Trend Chart - Historical Load Average */}
          <motion.section 
            className="grid grid-cols-1 gap-6"
            variants={itemVariants}
          >
            <LoadTrendChart />
          </motion.section>

          {/* Quote & Gallery - Side by side */}
          <motion.section 
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            variants={itemVariants}
          >
            {/* Left column: Quote Card + Network Particles */}
            <div className="space-y-6">
              <QuoteCard quote={featuredQuote} />
              <NetworkParticles />
            </div>

            {/* Right column: Image Gallery */}
            <ImageGallery />
          </motion.section>

          {/* Identity, Network, Location - Consolidated Cards */}
          <motion.section 
            className="grid grid-cols-1 gap-6 lg:grid-cols-3"
            variants={itemVariants}
          >
            <IdentityCard identity={dashboard.identity || {}} />
            <NetworkCard network={dashboard.network || {}} />
            <LocationCard location={dashboard.location || {}} />
          </motion.section>

          {/* Services Status */}
          <motion.section 
            className="grid grid-cols-1 gap-6"
            variants={itemVariants}
          >
            <SectionList
              title="Services"
              subtitle="Application and bootstrap health"
              items={dashboard.services || []}
            />
          </motion.section>

          {/* System Resources - Enhanced Resource View */}
          <motion.section 
            className="grid grid-cols-1 gap-6"
            variants={itemVariants}
          >
            <SystemResourcesCard resources={dashboard.systemResources || {}} />
          </motion.section>

          {/* Application Logs */}
          <motion.section 
            id="logs" 
            className="grid grid-cols-1 gap-6"
            variants={itemVariants}
          >
            <ResourceTable
              rows={dashboard.logs?.map((log) => ({
                name: log.time,
                type: log.level,
                scope: log.scope || "app",
                status: log.message,
              })) || []}
              title="Application Logs"
              isLogs={true}
            />
          </motion.section>
        </motion.main>
      </motion.div>
    </div>
  );
}