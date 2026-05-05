import { useEffect, useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import StatCard from "./StatCard";
import LockedPanel from "./LockedPanel";
import QuoteCard from "./QuoteCard";
import NetworkParticles from "./NetworkParticles";
import ImageGallery from "./ImageGallery";
import { finopsNavItems } from "../config/finopsNavItems";
import { mockFinOpsData } from "../data/mockFinOpsDashboard";

export default function ProtectedFinOpsDashboard({
  githubUrl,
  linkedinUrl,
  currentMode,
  onModeChange,
  flashMode,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onCopyFailure,
  onCopySuccess,
  onAuthRequired,
  devUnlocked = false,
  finopsUnlocked = false,
  onAuthSelect,
  onSignOut,
  onSignOutEverywhere,
}) {
  const [dailyBudget, setDailyBudget] = useState(() => {
    const saved = localStorage.getItem("finops_daily_budget");
    return saved ? parseFloat(saved) : 10;
  });
  const [monthlyBudget, setMonthlyBudget] = useState(() => {
    const saved = localStorage.getItem("finops_monthly_budget");
    return saved ? parseFloat(saved) : 100;
  });

  useEffect(() => {
    localStorage.setItem("finops_daily_budget", dailyBudget);
  }, [dailyBudget]);

  useEffect(() => {
    localStorage.setItem("finops_monthly_budget", monthlyBudget);
  }, [monthlyBudget]);

  const signIn = (message = "Sign in to view protected FinOps data.") => {
    onAuthRequired?.(message);
  };

  const featuredQuote = mockFinOpsData.quote || {
    text: "Optimize cloud costs with FinOps",
    author: "FinOps Team",
  };
  const protectedSummaryCards = [
    { label: "Total Cost (MTD)", status: "info", protectedSubtext: "Protected" },
    { label: "Forecast (EOM)", status: "info", protectedSubtext: "Protected" },
    { label: "Potential Savings", status: "info", protectedSubtext: "Protected" },
    { label: "CUD Coverage", status: "info", protectedSubtext: "Protected" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <Sidebar
        dashboardUser="Kirk Alton"
        dashboardName="FinOps Dashboard"
        githubUrl={githubUrl}
        linkedinUrl={linkedinUrl}
        navItems={finopsNavItems}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={onToggleSidebar}
      />

      <div className={isSidebarCollapsed ? "xl:ml-20" : "xl:ml-72"}>
        <Header
          appName="FinOps"
          tagline="Optimize resources and cost"
          uptime=""
          currentMode={currentMode}
          onModeChange={onModeChange}
          flashMode={flashMode}
          dailyBudget={dailyBudget}
          onDailyBudgetChange={setDailyBudget}
          monthlyBudget={monthlyBudget}
          onMonthlyBudgetChange={setMonthlyBudget}
          showBudgetControls={false}
          mockDataDiagnostics={[]}
          onCopyJsonSnapshot={() => signIn("Sign in to copy FinOps JSON payloads.")}
          onCopySnapshot={() => signIn("Sign in to copy FinOps snapshots.")}
          devUnlocked={devUnlocked}
          finopsUnlocked={finopsUnlocked}
          onAuthSelect={onAuthSelect}
          onSignOut={onSignOut}
          onSignOutEverywhere={onSignOutEverywhere}
        />

        <main className="space-y-8 px-4 py-4 lg:px-6 lg:py-6">
          <section
            id="finops-overview"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {protectedSummaryCards.map((card, idx) => (
              <StatCard
                key={`${card.label}-${idx}`}
                label={card.label}
                value="Protected"
                status={card.status}
                protectedMode
                protectedSubtext={card.protectedSubtext}
              />
            ))}
          </section>

          <section
            id="cost-trends"
            className="grid grid-cols-1 gap-6 lg:grid-cols-2"
          >
            <LockedPanel
              title="Daily Cost Trend"
              message="Cost trend data protected. Sign in to view."
            />
            <LockedPanel
              title="Top Services by Cost"
              message="Service cost data protected. Sign in to view."
            />
          </section>

          <section
            id="ambience"
            className="grid grid-cols-1 gap-6 md:grid-cols-2"
          >
            <div className="space-y-6">
              <QuoteCard
                quote={featuredQuote}
                onCopyFailure={onCopyFailure}
                onCopySuccess={onCopySuccess}
              />
              <NetworkParticles />
            </div>

            <ImageGallery onCopyFailure={onCopyFailure} onCopySuccess={onCopySuccess} />
          </section>

          <section id="budgets" className="grid grid-cols-1 gap-6">
            <LockedPanel
              title="Budget Status"
              message="Budget spend, forecast, and thresholds data protected. Sign in to view."
            />
          </section>

          <section id="utilization" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <LockedPanel
              title="CPU Utilization"
              message="VM utilization data protected. Sign in to view."
            />
            <LockedPanel
              title="Rightsizing Recommendations"
              message="Recommendations and savings data protected. Sign in to view."
            />
          </section>

          <section id="idle-resources" className="grid grid-cols-1 gap-6">
            <LockedPanel
              title="Idle Resources"
              message="Idle resource data protected. Sign in to view."
            />
          </section>
        </main>
      </div>
    </div>
  );
}
