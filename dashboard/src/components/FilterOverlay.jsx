import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import { Check, Filter, X } from "lucide-react";

export const EMPTY_FILTERS = {};

export const getUniqueOptions = (items, getValue) =>
  Array.from(
    new Set(
      (items || [])
        .map(getValue)
        .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
        .map((value) => String(value).trim())
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

export const toggleFilterValue = (filters, key, value) => {
  const currentValues = filters[key] || [];
  const nextValues = currentValues.includes(value)
    ? currentValues.filter((item) => item !== value)
    : [...currentValues, value];

  return {
    ...filters,
    [key]: nextValues,
  };
};

export const hasActiveFilters = (filters) =>
  Object.values(filters || {}).some((values) => Array.isArray(values) && values.length > 0);

export const applyOptionFilters = (items, filters, accessors) =>
  (items || []).filter((item) =>
    Object.entries(filters || {}).every(([key, values]) => {
      if (!Array.isArray(values) || values.length === 0) return true;
      const accessor = accessors[key];
      if (!accessor) return true;
      return values.includes(String(accessor(item)).trim());
    })
  );

export default function FilterOverlay({
  title = "Filters",
  sections = [],
  filters = EMPTY_FILTERS,
  onToggle,
  onClear,
  onClose,
}) {
  const active = hasActiveFilters(filters);
  const panelRef = useRef(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      panelRef.current?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      >
        <motion.div
          ref={panelRef}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onClose();
            }
          }}
          className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl outline-none"
        >
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
              <Filter className="h-5 w-5 text-cyan-400" />
              {title}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 transition-colors hover:bg-white/10"
              title="Close filters"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          <div className="max-h-[65vh] overflow-y-auto p-4">
            {sections.map((section) => (
              <div key={section.key} className="mb-5 last:mb-0">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {section.label}
                </div>
                <div className="flex flex-wrap gap-2">
                  {section.options.length ? (
                    section.options.map((option) => {
                      const selected = (filters[section.key] || []).includes(option.value);
                      return (
                        <button
                          key={option.value}
                          onClick={() => onToggle(section.key, option.value)}
                          className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors ${
                            selected
                              ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-300"
                              : "border-slate-700 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300"
                          }`}
                        >
                          {selected && <Check className="h-3 w-3" />}
                          {option.label}
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-500">No options available</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-white/10 p-4">
            <span className="text-xs text-slate-500">
              {active ? "Filters active" : "No filters active"}
            </span>
            <button
              onClick={onClear}
              className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 transition-colors hover:border-red-500/50 hover:text-red-300"
            >
              Clear filters
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
