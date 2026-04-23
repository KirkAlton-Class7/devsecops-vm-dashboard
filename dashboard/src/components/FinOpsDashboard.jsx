import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  ChartNoAxesGantt,
  Cpu,
  Gauge,
  RefreshCw,
  Server,
  Sparkles,
} from "lucide-react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import StatCard from "./StatCard";
import Card from "./Card";
import ResourceTable from "./ResourceTable";
import CostTrendChart from "./CostTrendChart";
import BudgetCard from "./BudgetCard";
import RecommendationItem from "./RecommendationItem";
import UtilizationChart from "./UtilizationChart";
import CostBreakdownChart from "./CostBreakdownChart";
import SavingsSummary from "./SavingsSummary";
import QuoteCard from "./QuoteCard";
import NetworkParticles from "./NetworkParticles";
import ImageGallery from "./ImageGallery";
import { finopsNavItems, mockFinOpsData } from "../data/mockFinOpsDashboard";

const cycleSteps = [3, 6, 9, 12];

function getStoredLimit(key, fallback) {
  const saved = localStorage.getItem(key);
  return saved ? parseInt(saved, 10) : fallback;
}

function getNextLimit(currentLimit, totalItems) {
  const maxItems = Math.min(totalItems, 12);
  const availableSteps = cycleSteps.filter((step) => step <= maxItems);

  if (availableSteps.length === 0) {
    return maxItems;
  }

  if (currentLimit >= maxItems) {
    return availableSteps[0];
  }

  const nextStep = availableSteps.find((step) => step > currentLimit);

  return nextStep || maxItems;
}

function getDisplayText(limit, totalItems) {
  const maxItems = Math.min(totalItems, 12);
  const shownItems = Math.min(limit, maxItems);

  return shownItems >= maxItems ? `all ${maxItems}` : `${shownItems} of ${maxItems}`;
}

function WidgetTitle({ icon: Icon, children, tone = "cyan" }) {
  const tones = {
    cyan: "from-cyan-500/20 to-sky-500/10 text-cyan-400",
    emerald: "from-emerald-500/20 to-lime-500/10 text-emerald-400",
    amber: "from-amber-500/20 to-orange-500/10 text-amber-400",
    violet: "from-violet-500/20 to-fuchsia-500/10 text-violet-400",
  };

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${tones[tone]}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span>{children}</span>
    </span>
  );
}

function CycleButton({ label, title, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 transition-colors hover:border-cyan-500/50 hover:text-cyan-400"
      title={title}
    >
      <RefreshCw className="h-3 w-3" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export default function FinOpsDashboard({
  onExit,
  githubUrl,
  linkedinUrl,
  currentMode,
  onModeChange,
  flashMode,
}) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [cpuLimit, setCpuLimit] = useState(() =>
    getStoredLimit("finops_cpu_limit", 3)
  );
  const [rightsizingLimit, setRightsizingLimit] = useState(() =>
    getStoredLimit("finops_rightsizing_limit", 3)
  );
  const [idleResourceLimit, setIdleResourceLimit] = useState(() =>
    getStoredLimit("finops_idle_resource_limit", 3)
  );

  const [budgetPage, setBudgetPage] = useState(0);
  const BUDGETS_PER_PAGE = 3;
  const [direction, setDirection] = useState(0); // -1 = left, 1 = right

  const goToPage = (newPage) => {
    if (newPage === budgetPage) return;
    setDirection(newPage > budgetPage ? 1 : -1);
    setBudgetPage(newPage);
  };

  useEffect(() => {
    localStorage.setItem("finops_cpu_limit", cpuLimit);
  }, [cpuLimit]);

  useEffect(() => {
    localStorage.setItem("finops_rightsizing_limit", rightsizingLimit);
  }, [rightsizingLimit]);

  useEffect(() => {
    localStorage.setItem("finops_idle_resource_limit", idleResourceLimit);
  }, [idleResourceLimit]);

  useEffect(() => {
    async function fetchFinOpsData() {
      try {
        const res = await fetch("/api/finops");

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("FinOps API error, using mock data:", err);
        setData(mockFinOpsData);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFinOpsData();

    const interval = setInterval(fetchFinOpsData, 600000);  // 10 minutes

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="relative h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-cyan-400"></div>
      </div>
    );
  }

  const sortedServices = [...(data.topServices || [])].sort(
    (a, b) => b.value - a.value
  );

  const top10Services = sortedServices.slice(0, 10);

  const utilizationRows = (data.utilization || []).slice(
    0,
    Math.min(cpuLimit, 12)
  );

  const recommendationRows = (data.recommendations || []).slice(
    0,
    Math.min(rightsizingLimit, 12)
  );

  const idleResourceRows = (data.idleResources || []).slice(0, 12);

  const featuredQuote = data.quote || {
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
      />

      <div className="lg:ml-72">
        <Header
          appName="FinOps"
          tagline="Optimize resources and cost"
          uptime=""
          currentMode={currentMode}
          onModeChange={onModeChange}
          flashMode={flashMode}
        />

        <main className="space-y-8 px-4 py-4 lg:px-6 lg:py-6">
          <section
            id="finops-overview"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {(data.summaryCards || []).map((card, idx) => (
              <StatCard
                key={`${card.label}-${idx}`}
                {...card}
                instanceName=""
                zone=""
                projectId={data.identity?.project || ""}
                billingAccountId={data.identity?.billingAccountId || ""}
              />
            ))}
          </section>

          <section id="savings" className="grid grid-cols-1 gap-4">
            <SavingsSummary
              realized={data.realizedSavings || 0}
              potential={data.potentialSavings || 0}
            />
          </section>

          <section
            id="cost-trends"
            className="grid grid-cols-1 gap-6 lg:grid-cols-2"
          >
            <CostTrendChart
              title={
                <WidgetTitle icon={BarChart3} tone="cyan">
                  Daily Cost Trend
                </WidgetTitle>
              }
            />

            <CostBreakdownChart
              data={top10Services}
              title={
                <WidgetTitle icon={ChartNoAxesGantt} tone="violet">
                  Top Services by Cost
                </WidgetTitle>
              }
              dataKey="value"
              nameKey="name"
            />
          </section>

          <section
            id="ambience"
            className="grid grid-cols-1 gap-6 md:grid-cols-2"
          >
            <div className="space-y-6">
              <QuoteCard quote={featuredQuote} />
              <NetworkParticles />
            </div>

            <ImageGallery />
          </section>

          {data.budgets && data.budgets.length > 0 && (
            <section id="budgets">
              <div className="relative overflow-hidden">
                <motion.div
                  className="flex"
                  animate={{ x: `-${budgetPage * 100}%` }}
                  transition={{ type: "spring", stiffness: 400, damping: 60, mass: 2.5 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(e, { offset, velocity }) => {
                    const pageCount = Math.ceil(data.budgets.length / BUDGETS_PER_PAGE);
                    if (Math.abs(offset.x) > 100 || Math.abs(velocity.x) > 500) {
                      if (offset.x > 0 && budgetPage > 0) setBudgetPage(budgetPage - 1);
                      else if (offset.x < 0 && budgetPage < pageCount - 1) setBudgetPage(budgetPage + 1);
                    }
                  }}
                >
                  {Array.from({ length: Math.ceil(data.budgets.length / BUDGETS_PER_PAGE) }).map((_, pageIdx) => (
                    <div
                      key={pageIdx}
                      className="flex-shrink-0 w-full grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
                      style={{ width: "100%" }}
                    >
                      {data.budgets
                        .slice(pageIdx * BUDGETS_PER_PAGE, (pageIdx + 1) * BUDGETS_PER_PAGE)
                        .map((budget, idx) => (
                          <BudgetCard key={`${budget.name}-${idx}`} {...budget} />
                        ))}
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Pagination buttons – same as before */}
              {data.budgets.length > BUDGETS_PER_PAGE && (
                <div className="flex justify-center gap-4 mt-6">
                  <button
                    onClick={() => setBudgetPage(p => Math.max(0, p - 1))}
                    disabled={budgetPage === 0}
                    className="px-3 py-1 text-sm rounded border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:border-cyan-500/50 transition-colors"
                  >
                    ← Previous
                  </button>
                  <span className="text-sm text-slate-400">
                    Page {budgetPage + 1} of {Math.ceil(data.budgets.length / BUDGETS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setBudgetPage(p => 
                      p + 1 < Math.ceil(data.budgets.length / BUDGETS_PER_PAGE) ? p + 1 : p
                    )}
                    disabled={budgetPage >= Math.ceil(data.budgets.length / BUDGETS_PER_PAGE) - 1}
                    className="px-3 py-1 text-sm rounded border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:border-cyan-500/50 transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
            </section>
          )}
          <section
            id="utilization"
            className="grid grid-cols-1 gap-6 lg:grid-cols-2"
          >
            {data.utilization && data.utilization.length > 0 && (
              <Card
                title={
                  <WidgetTitle icon={Gauge} tone="cyan">
                    CPU Utilization
                  </WidgetTitle>
                }
                subtitle="Top VMs • Last hour, P95"
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="text-xs text-slate-500">
                    Showing {getDisplayText(cpuLimit, data.utilization.length)} VMs
                  </div>

                  <CycleButton
                    label="Cycle VMs"
                    title="Cycle CPU utilization"
                    onClick={() =>
                      setCpuLimit((current) =>
                        getNextLimit(current, data.utilization.length)
                      )
                    }
                  />
                </div>

                <div className="space-y-3">
                  {utilizationRows.map((vm, idx) => (
                    <div
                      key={`${vm.instance}-${idx}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white/5 p-2"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 text-cyan-400">
                          <Cpu className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {vm.instance}
                          </p>

                          <div className="mt-0.5 flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              P95 CPU:
                            </span>

                            <span className="font-mono text-xs text-cyan-400">
                              {vm.cpuP95}%
                            </span>

                            {vm.recommendationMatch && (
                              <span className="whitespace-nowrap rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-400">
                                Rightsizing candidate
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="w-24 flex-shrink-0">
                        <UtilizationChart
                          data={[
                            vm.cpuP95 * 0.8,
                            vm.cpuP95 * 0.9,
                            vm.cpuP95,
                            vm.cpuP95 * 1.1,
                            vm.cpuP95,
                          ]}
                          unit="%"
                          height={32}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card
              title={
                <WidgetTitle icon={Sparkles} tone="emerald">
                  Rightsizing Opportunities
                </WidgetTitle>
              }
              subtitle="Estimated monthly savings"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="text-xs text-slate-500">
                  Showing{" "}
                  {getDisplayText(
                    rightsizingLimit,
                    data.recommendations?.length || 0
                  )}{" "}
                  recommendations
                </div>

                <CycleButton
                  label="Cycle Rightsizing"
                  title="Cycle rightsizing recommendations"
                  onClick={() =>
                    setRightsizingLimit((current) =>
                      getNextLimit(current, data.recommendations?.length || 0)
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                {recommendationRows.map((rec, idx) => (
                  <RecommendationItem
                    key={`${rec.resource}-${idx}`}
                    {...rec}
                  />
                ))}

                {(!data.recommendations ||
                  data.recommendations.length === 0) && (
                  <div className="py-8 text-center text-slate-400">
                    No recommendations available
                  </div>
                )}
              </div>
            </Card>
          </section>

          <section id="idle-resources">
            <ResourceTable
              rows={idleResourceRows}
              title={
                <WidgetTitle icon={Server} tone="amber">
                  Idle Resources
                </WidgetTitle>
              }
              subtitle="Resources with low usage or cleanup opportunities"
              isLogs={false}
              limit={idleResourceLimit}
              cycleLabel="resources"
              onLimitChange={() =>
                setIdleResourceLimit((current) =>
                  getNextLimit(current, data.idleResources?.length || 0)
                )
              }
            />
          </section>
        </main>
      </div>
    </div>
  );
}