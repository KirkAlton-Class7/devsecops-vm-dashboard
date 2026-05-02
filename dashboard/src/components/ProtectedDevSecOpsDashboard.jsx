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
}) {
  const signIn = (message = "Sign in to view protected DevSecOps data.") => {
    onAuthRequired?.(message);
  };

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
        />

        <motion.main className="space-y-8 px-4 py-4 lg:px-6 lg:py-6" variants={containerVariants} initial="hidden" animate="visible">
          <motion.section id="overview" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full" variants={itemVariants}>
            {mockDashboard.summaryCards?.map((card, idx) => (
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
                    instanceName={mockDashboard.identity?.instanceName}
                    zone={mockDashboard.location?.zone}
                    projectId={mockDashboard.identity?.project}
                    billingAccountId={mockDashboard.identity?.billingAccountId}
                  />
                </motion.div>
              </div>
            ))}
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

          <motion.section id="protected-sections" className="grid grid-cols-1 gap-4 lg:grid-cols-2" variants={itemVariants}>
            <LockedPanel
              title="VM Details"
              message="VM details protected. Sign in to view."
              onSignIn={() => signIn("Sign in to view VM details.")}
            />
            <LockedPanel
              title="System Resources"
              message="System resources protected. Sign in to view."
              onSignIn={() => signIn("Sign in to view system resources.")}
            />
            <LockedPanel
              title="Services"
              message="Services protected. Sign in to view."
              onSignIn={() => signIn("Sign in to view service health.")}
            />
            <LockedPanel
              title="System Logs"
              message="Logs protected. Sign in to view."
              onSignIn={() => signIn("Sign in to view logs.")}
            />
          </motion.section>
        </motion.main>
      </motion.div>
    </div>
  );
}
