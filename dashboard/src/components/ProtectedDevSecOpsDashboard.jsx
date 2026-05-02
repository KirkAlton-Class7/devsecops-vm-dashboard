import { motion } from "framer-motion";
import Header from "./Header";
import Sidebar from "./Sidebar";
import StatCard from "./StatCard";
import LockedPanel from "./LockedPanel";
import QuoteCard from "./QuoteCard";
import NetworkParticles from "./NetworkParticles";
import ImageGallery from "./ImageGallery";
import { mockDashboard } from "../data/mockDashboard";

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

export default function ProtectedDevSecOpsDashboard({
  githubUrl,
  linkedinUrl,
  currentMode,
  onModeChange,
  flashMode,
  isSidebarCollapsed = false,
  onToggleSidebar,
  featuredQuote,
  onCopyFailure,
  onCopySuccess,
  onAuthRequired,
  devUnlocked = false,
  finopsUnlocked = false,
  onAuthSelect,
  onSignOut,
  onSignOutEverywhere,
}) {
  const signIn = (message = "Sign in to view protected DevSecOps data.") => {
    onAuthRequired?.(message);
  };
  const protectedSummaryCards = [
    { label: "CPU", status: "info", protectedSubtext: "Utilization: Redacted" },
    { label: "Memory", status: "info", protectedSubtext: "Utilization: Redacted" },
    { label: "Disk", status: "info", protectedSubtext: "Utilization: Redacted" },
    { label: "Estimated Cost", status: "info", protectedSubtext: "Protected" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <Sidebar
        dashboardUser={mockDashboard.meta?.dashboardUser || "Kirk Alton"}
        dashboardName={mockDashboard.meta?.dashboardName || "DevSecOps Dashboard"}
        githubUrl={githubUrl}
        linkedinUrl={linkedinUrl}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={onToggleSidebar}
      />

      <motion.div
        className={isSidebarCollapsed ? "xl:ml-20" : "xl:ml-72"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Header
          appName={mockDashboard.meta?.appName || "DevSecOps"}
          tagline={mockDashboard.meta?.tagline || "Real-time infrastructure monitoring"}
          uptime={mockDashboard.meta?.uptime || "Unknown"}
          currentMode={currentMode}
          onModeChange={onModeChange}
          flashMode={flashMode}
          mockDataDiagnostics={[]}
          onCopyJsonSnapshot={() => signIn("Sign in to copy DevSecOps JSON payloads.")}
          onCopySnapshot={() => signIn("Sign in to copy DevSecOps snapshots.")}
          devUnlocked={devUnlocked}
          finopsUnlocked={finopsUnlocked}
          onAuthSelect={onAuthSelect}
          onSignOut={onSignOut}
          onSignOutEverywhere={onSignOutEverywhere}
        />

        <motion.main className="space-y-8 px-4 py-4 lg:px-6 lg:py-6" variants={containerVariants} initial="hidden" animate="visible">
          <motion.section id="overview" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full" variants={itemVariants}>
            {protectedSummaryCards.map((card, idx) => (
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
                    value="Protected"
                    status={card.status}
                    protectedMode
                    protectedSubtext={card.protectedSubtext}
                  />
                </motion.div>
              </div>
            ))}
          </motion.section>

          <motion.section id="load" className="grid grid-cols-1 gap-6" variants={itemVariants}>
            <LockedPanel
              title="System Load Trend"
              message="Load metrics protected. Sign in to view."
            />
          </motion.section>

          <motion.section id="ambience" className="grid grid-cols-1 md:grid-cols-2 gap-6" variants={itemVariants}>
            <div className="space-y-6">
              <QuoteCard
                quote={featuredQuote}
                onCopyFailure={onCopyFailure}
                onCopySuccess={onCopySuccess}
              />
              <NetworkParticles />
            </div>
            <ImageGallery onCopyFailure={onCopyFailure} onCopySuccess={onCopySuccess} />
          </motion.section>

          <motion.section id="vm-information" className="grid grid-cols-1 gap-6 lg:grid-cols-3" variants={itemVariants}>
            <LockedPanel
              title="Identity"
              message="Identity details protected. Sign in to view."
            />
            <LockedPanel
              title="Network"
              message="Network details protected. Sign in to view."
            />
            <LockedPanel
              title="Location"
              message="Location details protected. Sign in to view."
            />
          </motion.section>

          <motion.section id="system-resources" className="grid grid-cols-1 gap-6" variants={itemVariants}>
            <LockedPanel
              title="System Resources"
              message="CPU, memory, and disk details protected. Sign in to view."
            />
          </motion.section>

          <motion.section id="monitoring-endpoints" className="grid grid-cols-1 gap-6" variants={itemVariants}>
            <LockedPanel
              title="Monitoring Endpoints"
              message="Endpoint details protected. Sign in to view."
            />
          </motion.section>

          <motion.section id="services" className="grid grid-cols-1 gap-6" variants={itemVariants}>
            <LockedPanel
              title="Services"
              message="Service health protected. Sign in to view."
            />
          </motion.section>

          <motion.section id="logs" className="grid grid-cols-1 gap-6" variants={itemVariants}>
            <LockedPanel
              title="System Logs"
              message="Logs protected. Sign in to view."
            />
          </motion.section>
        </motion.main>
      </motion.div>
    </div>
  );
}
