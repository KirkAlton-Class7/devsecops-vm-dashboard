import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChartBarDecreasing,
  Cpu,
  Eye,
  Filter,
  Gauge,
  Server,
  Sparkles,
  Shrink,
  X
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
import QuoteCard from "./QuoteCard";
import NetworkParticles from "./NetworkParticles";
import ImageGallery from "./ImageGallery";
import CopyValueButton from "./CopyValueButton";
import FilterOverlay, {
  applyOptionFilters,
  getUniqueOptions,
  hasActiveFilters,
  toggleFilterValue,
} from "./FilterOverlay";
import { finopsNavItems } from "../config/finopsNavItems";
import { mockFinOpsData } from "../data/mockFinOpsDashboard";
import {
  buildCpuUtilizationSnapshot,
  buildIdleResourcesSnapshot,
  buildRightsizingSnapshot,
} from "../utils/widgetSnapshots";

const FINOPS_PREVIEW_LIMIT = 10;
const FINOPS_FALLBACK_DIAGNOSTICS = [
  {
    section: "FinOps API unavailable",
    route: "/api/finops",
  },
];
const IMPACT_SORT_ORDER = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
};

const sortByText = (items, direction, getValue) =>
  [...(items || [])].sort((a, b) => {
    const result = String(getValue(a) || "").localeCompare(
      String(getValue(b) || ""),
      undefined,
      { sensitivity: "base" }
    );

    return direction === "asc" ? result : -result;
  });

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

function SortButton({ direction, onClick, title }) {
  const SortIcon = direction === "asc" ? ArrowDown : ArrowUp;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 transition-colors hover:border-cyan-500/50 hover:text-cyan-400"
      title={title}
    >
      <SortIcon className="h-3 w-3" />
      <span className="hidden sm:inline">Sort</span>
    </button>
  );
}

function SortFieldButton({ label, onClick, title }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 transition-colors hover:border-cyan-500/50 hover:text-cyan-400"
      title={title}
    >
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ViewAllButton({ onClick, title = "View all" }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded border border-slate-700 px-2 py-1 text-xs text-cyan-400 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
      title={title}
    >
      <Eye className="h-3 w-3" />
      <span className="hidden sm:inline">View all</span>
    </button>
  );
}

function FilterButton({ onClick, active = false, title = "Filter" }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors ${
        active
          ? "border-cyan-500/60 text-cyan-300"
          : "border-slate-700 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400"
      }`}
      title={title}
    >
      <Filter className="h-3 w-3" />
      <span className="hidden sm:inline">Filter</span>
    </button>
  );
}

function FinOpsModal({
  title,
  subtitle,
  sortDirection,
  sortTitle,
  onSort,
  sortFieldLabel,
  onSortField,
  onFilter,
  filterActive,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  onClose,
  children,
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-950/90 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="mx-auto flex h-full max-w-5xl flex-col rounded-xl border border-slate-700 bg-slate-950 shadow-2xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
            <div className="flex gap-2">
              <SortButton direction={sortDirection} onClick={onSort} title={sortTitle} />
              {onSortField && (
                <SortFieldButton
                  label={sortFieldLabel}
                  onClick={onSortField}
                  title={`Switch ${title} sort field`}
                />
              )}
              {onFilter && (
                <FilterButton
                  onClick={onFilter}
                  active={filterActive}
                  title={`Filter ${title}`}
                />
              )}
              <button
                onClick={onClose}
                className="flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 transition-colors hover:border-red-500/50 hover:text-red-300"
                title={`Close ${title}`}
              >
                <X className="h-3 w-3" />
                <span className="hidden sm:inline">Close</span>
              </button>
            </div>
          </div>

          {onSearchChange && (
            <div className="border-b border-slate-800 p-4 pt-0">
              <input
                type="search"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-500"
                placeholder={searchPlaceholder}
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function CpuUtilizationRow({ vm, onCopyFailure, onCopySuccess }) {
  return (
    <div
      className="group flex items-center justify-between gap-2 rounded-lg bg-white/5 p-2 cursor-pointer hover:bg-white/10 transition-colors"
      onClick={() => window.open("https://console.cloud.google.com/compute/instances", "_blank")}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 text-cyan-400">
          <Cpu className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              ID
            </span>
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-white">
              {vm.instance}
            </p>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-xs text-slate-400">P95 CPU:</span>
            <span className="font-mono text-xs text-cyan-400">{vm.cpuP95}%</span>
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
      <CopyValueButton
        value={vm.instance}
        label="instance ID"
        onCopyFailure={onCopyFailure}
        onCopySuccess={onCopySuccess}
        hoverOnly
      />
    </div>
  );
}

function ListControls({
  shownCount,
  totalCount,
  label,
  sortDirection,
  sortTitle,
  onSort,
  sortFieldLabel,
  onSortField,
  onFilter,
  filterActive,
  onViewAll,
}) {
  return (
    <div className="mb-3 flex items-center justify-between px-1">
      <div className="text-xs text-slate-500">
        Showing {shownCount} of {totalCount} {label}
      </div>
      <div className="flex gap-2">
        <SortButton direction={sortDirection} onClick={onSort} title={sortTitle} />
        {onSortField && (
          <SortFieldButton
            label={sortFieldLabel}
            onClick={onSortField}
            title={`Switch ${label} sort field`}
          />
        )}
        {onFilter && (
          <FilterButton
            onClick={onFilter}
            active={filterActive}
            title={`Filter ${label}`}
          />
        )}
        <ViewAllButton onClick={onViewAll} title={`View all ${label}`} />
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="py-8 text-center text-slate-400">
      <Icon className="w-12 h-12 mx-auto mb-2 opacity-40" />
      <p>{title}</p>
      <p className="text-xs mt-1">{subtitle}</p>
    </div>
  );
}

function RecommendationList({ rows, onCopyFailure, onCopySuccess }) {
  return (
    <div className="space-y-2">
      {rows.map((rec, idx) => (
        <RecommendationItem
          key={`${rec.resource}-${idx}`}
          {...rec}
          onCopyFailure={onCopyFailure}
          onCopySuccess={onCopySuccess}
        />
      ))}
    </div>
  );
}

function CpuList({ rows, onCopyFailure, onCopySuccess }) {
  return (
    <div className="space-y-3">
      {rows.map((vm, idx) => (
        <CpuUtilizationRow
          key={`${vm.instance}-${idx}`}
          vm={vm}
          onCopyFailure={onCopyFailure}
          onCopySuccess={onCopySuccess}
        />
      ))}
    </div>
  );
}

function getSortTitle(direction) {
  return direction === "asc"
    ? "Sorted A-Z. Click for Z-A."
    : "Sorted Z-A. Click for A-Z.";
}

function toggleSort(current) {
  return current === "asc" ? "desc" : "asc";
}

function toggleRightsizingSortField(current) {
  const fields = ["name", "level", "costDelta", "resource"];
  const currentIndex = fields.indexOf(current);
  return fields[(currentIndex + 1) % fields.length];
}

function toggleCpuSortField(current) {
  return current === "name" ? "candidate" : "name";
}

const getCpuRange = (vm) => {
  const cpu = Number(vm?.cpuP95);
  if (!Number.isFinite(cpu)) return "Unknown";
  if (cpu < 10) return "0-10%";
  if (cpu < 30) return "10-30%";
  if (cpu < 40) return "30-40%";
  if (cpu < 50) return "40-50%";
  if (cpu < 60) return "50-60%";
  return "60%+";
};

const getCandidateValue = (vm) => (vm?.recommendationMatch ? "Yes" : "No");

const getRecommendationImpact = (rec) => (rec?.impact || "MEDIUM").toUpperCase();

const matchesSearch = (item, query, getValues) => {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return true;

  return getValues(item).some((value) =>
    String(value || "").toLowerCase().includes(normalizedQuery)
  );
};

const buildSavingsRange = (recommendations) => {
  const values = (recommendations || [])
    .map((rec) => Number(rec?.monthlySavings))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (!values.length) {
    return {
      getRange: () => "Unknown",
      options: [{ value: "Unknown", label: "Unknown" }],
    };
  }

  const lowBreak = Math.ceil(values[Math.floor((values.length - 1) / 3)]);
  const highBreak = Math.ceil(values[Math.floor(((values.length - 1) * 2) / 3)]);

  if (lowBreak >= highBreak) {
    const exactOptions = getUniqueOptions(recommendations || [], (rec) => {
      const savings = Number(rec?.monthlySavings);
      return Number.isFinite(savings) ? `$${savings.toFixed(2)}/mo` : "Unknown";
    }).map((value) => ({ value, label: value }));

    return {
      getRange: (rec) => {
        const savings = Number(rec?.monthlySavings);
        return Number.isFinite(savings) ? `$${savings.toFixed(2)}/mo` : "Unknown";
      },
      options: exactOptions,
    };
  }

  const lowLabel = `Under $${lowBreak}/mo`;
  const midLabel = `$${lowBreak}-$${highBreak}/mo`;
  const highLabel = `$${highBreak}+/mo`;

  return {
    getRange: (rec) => {
      const savings = Number(rec?.monthlySavings);
      if (!Number.isFinite(savings)) return "Unknown";
      if (savings < lowBreak) return lowLabel;
      if (savings < highBreak) return midLabel;
      return highLabel;
    },
    options: [
      { value: lowLabel, label: lowLabel },
      { value: midLabel, label: midLabel },
      { value: highLabel, label: highLabel },
    ],
  };
};

export default function FinOpsDashboard({
  onExit,
  githubUrl,
  linkedinUrl,
  currentMode,
  onModeChange,
  flashMode,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onCopyFailure,
  onCopySuccess,
  onCopySnapshot,
  onCopyJsonSnapshot,
  authHeaders = {},
  devUnlocked = false,
  finopsUnlocked = false,
  onAuthSelect,
  onSignOut,
  onSignOutEverywhere,
}) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllCpu, setShowAllCpu] = useState(false);
  const [showAllRightsizing, setShowAllRightsizing] = useState(false);
  const [showCpuFilters, setShowCpuFilters] = useState(false);
  const [showRightsizingFilters, setShowRightsizingFilters] = useState(false);
  const [cpuFilters, setCpuFilters] = useState({});
  const [rightsizingFilters, setRightsizingFilters] = useState({});
  const [cpuSearch, setCpuSearch] = useState("");
  const [rightsizingSearch, setRightsizingSearch] = useState("");
  const [finOpsRefreshKey, setFinOpsRefreshKey] = useState(0);
  const [cpuSortDirection, setCpuSortDirection] = useState("asc");
  const [cpuSortField, setCpuSortField] = useState("name");
  const [rightsizingSortDirection, setRightsizingSortDirection] = useState("asc");
  const [rightsizingSortField, setRightsizingSortField] = useState("name");
  const [finOpsDiagnostics, setFinOpsDiagnostics] = useState([]);
  const hasLiveFinOpsRef = useRef(false);

  const [budgetPage, setBudgetPage] = useState(0);
  const BUDGETS_PER_PAGE = 3;
  const [direction, setDirection] = useState(0); // -1 = left, 1 = right

  // Daily budget state (client-side, stored in localStorage)
  const [dailyBudget, setDailyBudget] = useState(() => {
    const saved = localStorage.getItem("finops_daily_budget");
    return saved ? parseFloat(saved) : 10;
  });

  // Monthly budget state (client-side, stored in localStorage)
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

  const goToPage = (newPage) => {
    if (newPage === budgetPage) return;
    setDirection(newPage > budgetPage ? 1 : -1);
    setBudgetPage(newPage);
  };

  useEffect(() => {
    async function fetchFinOpsData() {
      try {
        const res = await fetch("/api/finops", {
          cache: "no-store",
          headers: authHeaders,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        setData({
          summaryCards: json.summaryCards || [],
          identity: json.identity || {},
          topServices: json.topServices || [],
          costTrend: json.costTrend || [],
          budgets: json.budgets || [],
          utilization: json.utilization || [],
          recommendations: json.recommendations || [],
          idleResources: json.idleResources || [],
          quote: json.quote,
        });
        hasLiveFinOpsRef.current = true;
        setCpuFilters({});
        setRightsizingFilters({});
        setCpuSearch("");
        setRightsizingSearch("");
        setFinOpsRefreshKey((current) => current + 1);
        setFinOpsDiagnostics([]);
      } catch (err) {
        console.error("FinOps API error, using mock data:", err);
        if (!hasLiveFinOpsRef.current) {
          setData(mockFinOpsData);
          setCpuFilters({});
          setRightsizingFilters({});
          setCpuSearch("");
          setRightsizingSearch("");
          setFinOpsRefreshKey((current) => current + 1);
        }
        setFinOpsDiagnostics(FINOPS_FALLBACK_DIAGNOSTICS);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFinOpsData();

    const interval = setInterval(fetchFinOpsData, 600000);  // 10 minutes

    return () => clearInterval(interval);
  }, [authHeaders]);

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

  const filteredUtilizationRows = applyOptionFilters(data.utilization || [], cpuFilters, {
    candidate: getCandidateValue,
    cpuRange: getCpuRange,
  });
  const sortedUtilizationRows = [...filteredUtilizationRows].sort((a, b) => {
    let result;

    if (cpuSortField === "candidate") {
      result = Number(Boolean(b?.recommendationMatch)) - Number(Boolean(a?.recommendationMatch));
    } else {
      result = String(a?.instance || "").localeCompare(String(b?.instance || ""), undefined, {
        sensitivity: "base",
      });
    }

    if (result === 0) {
      result = String(a?.instance || "").localeCompare(String(b?.instance || ""), undefined, {
        sensitivity: "base",
      });
    }

    return cpuSortField === "candidate"
      ? result
      : cpuSortDirection === "asc"
        ? result
        : -result;
  });
  const utilizationRows = sortedUtilizationRows.slice(0, FINOPS_PREVIEW_LIMIT);
  const searchedUtilizationRows = sortedUtilizationRows.filter((vm) =>
    matchesSearch(vm, cpuSearch, (item) => [
      item.instance,
      item.cpuP95,
      getCandidateValue(item),
      getCpuRange(item),
    ])
  );

  const savingsRange = buildSavingsRange(data.recommendations || []);
  const filteredRecommendationRows = applyOptionFilters(data.recommendations || [], rightsizingFilters, {
    resource: (rec) => rec.resource,
    impact: getRecommendationImpact,
    savingsRange: savingsRange.getRange,
  });
  const sortedRecommendationRows = [...filteredRecommendationRows].sort((a, b) => {
    let result;

    if (rightsizingSortField === "level") {
      result =
        (IMPACT_SORT_ORDER[getRecommendationImpact(a)] ?? 99) -
        (IMPACT_SORT_ORDER[getRecommendationImpact(b)] ?? 99);
    } else if (rightsizingSortField === "costDelta") {
      result = Number(a?.monthlySavings || 0) - Number(b?.monthlySavings || 0);
    } else {
      result = String(a?.resource || "").localeCompare(String(b?.resource || ""), undefined, {
        sensitivity: "base",
      });
    }

    if (result === 0) {
      result = String(a?.resource || "").localeCompare(String(b?.resource || ""), undefined, {
        sensitivity: "base",
      });
    }

    return rightsizingSortDirection === "asc" ? result : -result;
  });
  const recommendationRows = sortedRecommendationRows.slice(0, FINOPS_PREVIEW_LIMIT);
  const searchedRecommendationRows = sortedRecommendationRows.filter((rec) =>
    matchesSearch(rec, rightsizingSearch, (item) => [
      item.resource,
      item.description,
      item.monthlySavings,
      getRecommendationImpact(item),
      savingsRange.getRange(item),
    ])
  );

  const idleResourceRows = data.idleResources || [];
  const cpuSortTitle =
    cpuSortField === "candidate"
      ? "Sorted rightsizing candidates first."
      : getSortTitle(cpuSortDirection);
  const cpuSortFieldLabel = cpuSortField === "candidate" ? "Candidate" : "ID";
  const rightsizingSortTitle =
    rightsizingSortField === "level"
      ? rightsizingSortDirection === "asc"
        ? "Sorted LOW to HIGH. Click for HIGH to LOW."
        : "Sorted HIGH to LOW. Click for LOW to HIGH."
      : rightsizingSortField === "costDelta"
        ? rightsizingSortDirection === "asc"
          ? "Sorted low savings to high savings. Click to reverse."
          : "Sorted high savings to low savings. Click to reverse."
        : getSortTitle(rightsizingSortDirection);
  const rightsizingSortFieldLabel =
    rightsizingSortField === "level"
      ? "Level"
      : rightsizingSortField === "costDelta"
        ? "Savings"
        : rightsizingSortField === "resource"
          ? "Resource"
          : "Name";
  const cpuFilterSections = [
    {
      key: "candidate",
      label: "Rightsizing Candidate",
      options: getUniqueOptions(data.utilization || [], getCandidateValue).map((value) => ({
        value,
        label: value,
      })),
    },
    {
      key: "cpuRange",
      label: "CPU Usage Range",
      options: ["0-10%", "10-30%", "30-40%", "40-50%", "50-60%"].map((value) => ({
        value,
        label: value,
      })),
    },
  ];
  const rightsizingFilterSections = [
    {
      key: "impact",
      label: "Level",
      options: getUniqueOptions(data.recommendations || [], getRecommendationImpact).map((value) => ({
        value,
        label: value,
      })),
    },
    {
      key: "savingsRange",
      label: "Savings",
      options: savingsRange.options,
    },
  ];

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
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={onToggleSidebar}
      />

      <div className={isSidebarCollapsed ? "xl:ml-20" : "xl:ml-72"}>
        <Header
          appName="FinOps"
          tagline="Cost analysis, budget health, and optimization insights"
          uptime=""
          currentMode={currentMode}
          onModeChange={onModeChange}
          flashMode={flashMode}
          dailyBudget={dailyBudget}
          onDailyBudgetChange={setDailyBudget}
          monthlyBudget={monthlyBudget}
          onMonthlyBudgetChange={setMonthlyBudget}
          mockDataDiagnostics={finOpsDiagnostics}
          onCopyJsonSnapshot={() => onCopyJsonSnapshot?.(data)}
          onCopySnapshot={() => onCopySnapshot?.(data)}
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
            {(data.summaryCards || []).map((card, idx) => (
              <StatCard
                key={`${card.label}-${idx}`}
                {...card}
                instanceName=""
                zone=""
                projectId={data.identity?.project || ""}
                billingAccountId={data.identity?.billingAccountId || ""}
                monthlyBudget={monthlyBudget}
              />
            ))}
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
                  dailyBudget={dailyBudget}
                  data={data.costTrend || []}
                  onCopyFailure={onCopyFailure}
                  onCopySuccess={onCopySuccess}
                />

                <CostBreakdownChart
                  data={top10Services}
                  title={
                    <WidgetTitle icon={ChartBarDecreasing} tone="violet">
                      Top Services by Cost
                    </WidgetTitle>
                  }
                  dataKey="value"
                  nameKey="name"
                  onCopyFailure={onCopyFailure}
                  onCopySuccess={onCopySuccess}
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
                              <BudgetCard
                                key={`${budget.name}-${idx}`}
                                {...budget}
                                onCopyFailure={onCopyFailure}
                                onCopySuccess={onCopySuccess}
                              />
                            ))}
                        </div>
                      ))}
                    </motion.div>
                  </div>

                  {/* Pagination buttons */}
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

              {/* CPU Utilization – always visible, with placeholder when empty */}
              <section id="utilization" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card
                  title={<WidgetTitle icon={Gauge} tone="cyan">CPU Utilization</WidgetTitle>}
                  subtitle="Top VMs • Last hour, P95"
                  snapshotText={buildCpuUtilizationSnapshot(sortedUtilizationRows)}
                  snapshotLabel="CPU Utilization snapshot"
                  onCopyFailure={onCopyFailure}
                  onCopySuccess={onCopySuccess}
                >
                  {data.utilization && data.utilization.length > 0 ? (
                    <>
                      <ListControls
                        shownCount={Math.min(FINOPS_PREVIEW_LIMIT, sortedUtilizationRows.length)}
                        totalCount={sortedUtilizationRows.length}
                        label="VMs"
                        sortDirection={cpuSortDirection}
                        sortTitle={cpuSortTitle}
                        onSort={() => setCpuSortDirection(toggleSort)}
                        sortFieldLabel={cpuSortFieldLabel}
                        onSortField={() => setCpuSortField(toggleCpuSortField)}
                        onFilter={() => setShowCpuFilters(true)}
                        filterActive={hasActiveFilters(cpuFilters)}
                        onViewAll={() => setShowAllCpu(true)}
                      />
                      {utilizationRows.length ? (
                        <CpuList
                          rows={utilizationRows}
                          onCopyFailure={onCopyFailure}
                          onCopySuccess={onCopySuccess}
                        />
                      ) : (
                        <div className="py-6 text-center text-sm text-slate-400">
                          No VMs match the active filters.
                        </div>
                      )}
                    </>
                  ) : (
                    <EmptyState
                      icon={Gauge}
                      title="No CPU utilization data available."
                      subtitle="CPU utilization appears within 5-10 minutes after a VM starts."
                    />
                  )}
                </Card>

                <Card
                  title={<WidgetTitle icon={Sparkles} tone="emerald">Rightsizing Recommendations</WidgetTitle>}
                  subtitle="Estimated monthly savings"
                  snapshotText={buildRightsizingSnapshot(sortedRecommendationRows)}
                  snapshotLabel="Rightsizing Recommendations snapshot"
                  onCopyFailure={onCopyFailure}
                  onCopySuccess={onCopySuccess}
                >
                  {data.recommendations && data.recommendations.length > 0 ? (
                    <>
                      <ListControls
                        shownCount={Math.min(FINOPS_PREVIEW_LIMIT, sortedRecommendationRows.length)}
                        totalCount={sortedRecommendationRows.length}
                        label="recommendations"
                        sortDirection={rightsizingSortDirection}
                        sortTitle={rightsizingSortTitle}
                        onSort={() => setRightsizingSortDirection(toggleSort)}
                        sortFieldLabel={rightsizingSortFieldLabel}
                        onSortField={() => setRightsizingSortField(toggleRightsizingSortField)}
                        onFilter={() => setShowRightsizingFilters(true)}
                        filterActive={hasActiveFilters(rightsizingFilters)}
                        onViewAll={() => setShowAllRightsizing(true)}
                      />
                      {recommendationRows.length ? (
                        <RecommendationList
                          rows={recommendationRows}
                          onCopyFailure={onCopyFailure}
                          onCopySuccess={onCopySuccess}
                        />
                      ) : (
                        <div className="py-6 text-center text-sm text-slate-400">
                          No recommendations match the active filters.
                        </div>
                      )}
                    </>
                  ) : (
                    <EmptyState
                      icon={Shrink}
                      title="No recommendations available."
                      subtitle="GCP Recommender API may take up to 48 hours to generate insights."
                    />
                  )}
                </Card>
              </section>

              <section id="idle-resources">
                <ResourceTable
                  rows={idleResourceRows}
                  title={<WidgetTitle icon={Server} tone="amber">Idle Resources</WidgetTitle>}
                  subtitle="Resources with low usage or cleanup opportunities"
                  isLogs={false}
                  limit={FINOPS_PREVIEW_LIMIT}
                  onRowClick="https://console.cloud.google.com/home/dashboard"
                  filterResetKey={finOpsRefreshKey}
                  onCopyFailure={onCopyFailure}
                  onCopySuccess={onCopySuccess}
                  snapshotText={buildIdleResourcesSnapshot(idleResourceRows)}
                  snapshotLabel="Idle Resources snapshot"
                />
              </section>
        </main>
      </div>

      {showAllCpu && (
        <FinOpsModal
          title="CPU Utilization"
          subtitle={`Showing ${searchedUtilizationRows.length} of ${(data.utilization || []).length} VMs`}
          sortDirection={cpuSortDirection}
          sortTitle={cpuSortTitle}
          onSort={() => setCpuSortDirection(toggleSort)}
          sortFieldLabel={cpuSortFieldLabel}
          onSortField={() => setCpuSortField(toggleCpuSortField)}
          onFilter={() => setShowCpuFilters(true)}
          filterActive={hasActiveFilters(cpuFilters)}
          searchValue={cpuSearch}
          onSearchChange={setCpuSearch}
          searchPlaceholder="Search VMs by instance ID, CPU range, or candidate status"
          onClose={() => setShowAllCpu(false)}
        >
          {searchedUtilizationRows.length ? (
            <CpuList
              rows={searchedUtilizationRows}
              onCopyFailure={onCopyFailure}
              onCopySuccess={onCopySuccess}
            />
          ) : (
            <div className="py-8 text-center text-sm text-slate-400">
              No VMs match the active filters or search.
            </div>
          )}
        </FinOpsModal>
      )}

      {showAllRightsizing && (
        <FinOpsModal
          title="Rightsizing Recommendations"
          subtitle={`Showing ${searchedRecommendationRows.length} of ${(data.recommendations || []).length} recommendations`}
          sortDirection={rightsizingSortDirection}
          sortTitle={rightsizingSortTitle}
          onSort={() => setRightsizingSortDirection(toggleSort)}
          sortFieldLabel={rightsizingSortFieldLabel}
          onSortField={() => setRightsizingSortField(toggleRightsizingSortField)}
          onFilter={() => setShowRightsizingFilters(true)}
          filterActive={hasActiveFilters(rightsizingFilters)}
          searchValue={rightsizingSearch}
          onSearchChange={setRightsizingSearch}
          searchPlaceholder="Search recommendations by resource, impact, savings, or description"
          onClose={() => setShowAllRightsizing(false)}
        >
          {searchedRecommendationRows.length ? (
            <RecommendationList
              rows={searchedRecommendationRows}
              onCopyFailure={onCopyFailure}
              onCopySuccess={onCopySuccess}
            />
          ) : (
            <div className="py-8 text-center text-sm text-slate-400">
              No recommendations match the active filters or search.
            </div>
          )}
        </FinOpsModal>
      )}

      {showCpuFilters && (
        <FilterOverlay
          title="Filter CPU Utilization"
          sections={cpuFilterSections}
          filters={cpuFilters}
          onToggle={(key, value) => setCpuFilters((current) => toggleFilterValue(current, key, value))}
          onClear={() => setCpuFilters({})}
          onClose={() => setShowCpuFilters(false)}
        />
      )}

      {showRightsizingFilters && (
        <FilterOverlay
          title="Filter Rightsizing"
          sections={rightsizingFilterSections}
          filters={rightsizingFilters}
          onToggle={(key, value) => setRightsizingFilters((current) => toggleFilterValue(current, key, value))}
          onClear={() => setRightsizingFilters({})}
          onClose={() => setShowRightsizingFilters(false)}
        />
      )}
    </div>
  );
}
