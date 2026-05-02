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
          mockDataDiagnostics={[]}
          onCopyJsonSnapshot={() => signIn("Sign in to copy FinOps JSON payloads.")}
          onCopySnapshot={() => signIn("Sign in to copy FinOps snapshots.")}
        />

        <main className="space-y-8 px-4 py-4 lg:px-6 lg:py-6">
          <section
            id="finops-overview"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {(mockFinOpsData.summaryCards || []).map((card, idx) => (
              <StatCard
                key={`${card.label}-${idx}`}
                {...card}
                instanceName=""
                zone=""
                projectId={mockFinOpsData.identity?.project || ""}
                billingAccountId={mockFinOpsData.identity?.billingAccountId || ""}
                monthlyBudget={monthlyBudget}
              />
            ))}
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

          <section id="finops-protected" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <LockedPanel
              title="Cost Details"
              message="Cost details protected. Sign in to view."
              onSignIn={() => signIn("Sign in to view FinOps cost details.")}
            />
            <LockedPanel
              title="Budgets"
              message="Budgets protected. Sign in to view."
              onSignIn={() => signIn("Sign in to view budgets.")}
            />
            <LockedPanel
              title="VM Utilization"
              message="VM utilization protected. Sign in to view."
              onSignIn={() => signIn("Sign in to view VM utilization.")}
            />
            <LockedPanel
              title="Rightsizing Recommendations"
              message="Rightsizing recommendations protected. Sign in to view."
              onSignIn={() => signIn("Sign in to view rightsizing recommendations.")}
            />
            <LockedPanel
              title="Idle Resources"
              message="Idle resources protected. Sign in to view."
              onSignIn={() => signIn("Sign in to view idle resources.")}
            />
          </section>
        </main>
      </div>
    </div>
  );
}
