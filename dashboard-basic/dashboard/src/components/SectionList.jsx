import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, ArrowUp, Eye, Filter, X } from "lucide-react";
import Card from "./Card";
import StatusDot from "./StatusDot";
import { buildServicesSnapshot } from "../utils/widgetSnapshots";
import FilterOverlay, {
  applyOptionFilters,
  getUniqueOptions,
  hasActiveFilters,
  toggleFilterValue,
} from "./FilterOverlay";

const STATUS_SORT_ORDER = {
  critical: 0,
  error: 1,
  failed: 2,
  unreachable: 3,
  unavailable: 4,
  warning: 5,
  pending: 6,
  degraded: 7,
  stopped: 8,
  healthy: 9,
  running: 10,
  installed: 11,
  reachable: 12,
  ready: 13,
  active: 14,
  successful: 15,
  serving: 16,
};

const sortItems = (items, direction, field) =>
  [...items].sort((a, b) => {
    let result;

    if (field === "status") {
      const aStatus = String(a.status || "").toLowerCase();
      const bStatus = String(b.status || "").toLowerCase();
      result =
        (STATUS_SORT_ORDER[aStatus] ?? 99) -
        (STATUS_SORT_ORDER[bStatus] ?? 99);
    } else {
      result = (a.label || "").localeCompare(b.label || "", undefined, {
        sensitivity: "base",
      });
    }

    if (result === 0) {
      result = (a.label || "").localeCompare(b.label || "", undefined, {
        sensitivity: "base",
      });
    }

    return direction === "asc" ? result : -result;
  });

const matchesSearch = (item, query) => {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [item.label, item.value, item.status].some((value) =>
    String(value || "").toLowerCase().includes(normalizedQuery)
  );
};

export default function SectionList({ title, subtitle, items, limit, onCopyFailure, onCopySuccess }) {
  const [showAllModal, setShowAllModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  const [sortField, setSortField] = useState("label");

  // Convert item status to StatusDot compatible status
  const getStatusDotStatus = (itemStatus) => {
    const status = itemStatus?.toLowerCase() || "";
    if (status === "healthy" || status === "running" || status === "installed" || 
        status === "reachable" || status === "ready" || status === "active" ||
        status === "successful" || status === "serving") {
      return "success";
    }
    if (status === "warning" || status === "pending" || status === "degraded") {
      return "warning";
    }
    if (status === "critical" || status === "error" || status === "failed" || 
        status === "unreachable" || status === "unavailable") {
      return "critical";
    }
    return "healthy";
  };

  const totalItems = items.length;
  const filteredItems = applyOptionFilters(items, filters, {
    name: (item) => item.label,
    status: (item) => item.status,
  });
  const sortedItems = sortItems(filteredItems, sortDirection, sortField);
  const searchedItems = sortedItems.filter((item) => matchesSearch(item, searchQuery));
  const displayedItems = sortedItems.slice(0, limit);
  const shownCount = Math.min(limit, sortedItems.length);
  const SortIcon = sortDirection === "asc" ? ArrowDown : ArrowUp;
  const sortFieldLabel = sortField === "status" ? "Status" : "Name";
  const sortTitle =
    sortField === "status"
      ? sortDirection === "asc"
        ? "Sorted by status priority. Click to reverse."
        : "Sorted by reversed status priority. Click to reverse."
      : sortDirection === "asc"
        ? "Sorted A-Z. Click for Z-A."
        : "Sorted Z-A. Click for A-Z.";
  const filterSections = [
    {
      key: "name",
      label: "Name",
      options: getUniqueOptions(items, (item) => item.label).map((value) => ({
        value,
        label: value,
      })),
    },
    {
      key: "status",
      label: "Status",
      options: getUniqueOptions(items, (item) => item.status).map((value) => ({
        value,
        label: value,
      })),
    },
  ];
  const toggleSortDirection = () => {
    setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
  };
  const toggleSortField = () => {
    setSortField((current) => (current === "label" ? "status" : "label"));
  };

  const renderServiceItem = (item, idx) => (
    <motion.div
      key={item.label}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900/50 to-slate-950/50 backdrop-blur-sm border border-slate-800 hover:border-slate-700 transition-all duration-300"
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-purple-600/0"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.6 }}
      />

      <div className="relative px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-200">
              {item.label}
            </p>
            <p className="break-all text-sm text-slate-400 mt-1 font-mono">
              {item.value}
            </p>
          </div>

          <div className="ml-4 flex items-center gap-3">
            <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/5 backdrop-blur-sm">
              <StatusDot
                status={getStatusDotStatus(item.status)}
                size="sm"
                showTooltip={true}
                animated={true}
              />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {item.status}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card
          title={title}
          subtitle={subtitle}
          snapshotText={buildServicesSnapshot(sortedItems)}
          snapshotLabel="Services snapshot"
          onCopyFailure={onCopyFailure}
          onCopySuccess={onCopySuccess}
        >
          <div className="flex justify-between items-center mb-3 px-1">
            <div className="text-xs text-slate-500">
              Showing {shownCount} of {totalItems} services
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleSortDirection}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors px-2 py-1 rounded border border-slate-700 hover:border-cyan-500/50"
                title={sortTitle}
              >
                <SortIcon className="w-3 h-3" />
                <span className="hidden sm:inline">Sort</span>
              </button>
              <button
                onClick={toggleSortField}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors px-2 py-1 rounded border border-slate-700 hover:border-cyan-500/50"
                title="Switch service sort field"
              >
                <span className="hidden sm:inline">{sortFieldLabel}</span>
              </button>
              <button
                onClick={() => setShowFilters(true)}
                className={`flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded border ${
                  hasActiveFilters(filters)
                    ? "border-cyan-500/60 text-cyan-300"
                    : "border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50"
                }`}
                title="Filter services"
              >
                <Filter className="w-3 h-3" />
                <span className="hidden sm:inline">Filter</span>
              </button>
              <button
                onClick={() => setShowAllModal(true)}
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors px-2 py-1 rounded border border-slate-700 hover:border-cyan-500/50"
                title="View all services"
              >
                <Eye className="w-3 h-3" />
                <span className="hidden sm:inline">View all</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {displayedItems.map(renderServiceItem)}
            {displayedItems.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                No services match the active filters.
              </p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              Showing {shownCount} of {totalItems} service{totalItems !== 1 ? 's' : ''}
            </p>
          </div>
        </Card>
      </motion.div>

      <AnimatePresence>
        {showAllModal && (
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
              className="mx-auto flex h-full max-w-4xl flex-col rounded-xl border border-slate-700 bg-slate-950 shadow-2xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">All Services</h2>
                  <p className="text-xs text-slate-500">
                    Showing {searchedItems.length} of {totalItems} services
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={toggleSortDirection}
                    className="flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 transition-colors hover:border-cyan-500/50 hover:text-cyan-400"
                    title={sortTitle}
                  >
                    <SortIcon className="w-3 h-3" />
                    <span className="hidden sm:inline">Sort</span>
                  </button>
                  <button
                    onClick={toggleSortField}
                    className="flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 transition-colors hover:border-cyan-500/50 hover:text-cyan-400"
                    title="Switch service sort field"
                  >
                    <span className="hidden sm:inline">{sortFieldLabel}</span>
                  </button>
                  <button
                    onClick={() => setShowFilters(true)}
                    className={`flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors ${
                      hasActiveFilters(filters)
                        ? "border-cyan-500/60 text-cyan-300"
                        : "border-slate-700 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400"
                    }`}
                    title="Filter services"
                  >
                    <Filter className="w-3 h-3" />
                    <span className="hidden sm:inline">Filter</span>
                  </button>
                  <button
                    onClick={() => setShowAllModal(false)}
                    className="flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 transition-colors hover:border-red-500/50 hover:text-red-300"
                    title="Close all services"
                  >
                    <X className="w-3 h-3" />
                    <span className="hidden sm:inline">Close</span>
                  </button>
                </div>
              </div>

              <div className="border-b border-slate-800 p-4 pt-0">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-500"
                  placeholder="Search services by name, value, or status"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {searchedItems.map(renderServiceItem)}
                  {searchedItems.length === 0 && (
                    <p className="py-8 text-center text-slate-400">
                      No services match the active filters or search.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showFilters && (
          <FilterOverlay
            title="Filter Services"
            sections={filterSections}
            filters={filters}
            onToggle={(key, value) => setFilters((current) => toggleFilterValue(current, key, value))}
            onClear={() => setFilters({})}
            onClose={() => setShowFilters(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
