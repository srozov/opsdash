import { Search } from "lucide-react";
import { RUN_STATUSES, type DateRange } from "../../lib/runs.ts";

const RANGES: { key: DateRange; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "all", label: "All" },
];

// Archon's status summary bar: per-status count chips that double as filters,
// a search box, and date-range presets. (Counts/search/range are client-side.)
export function StatusSummaryBar({
  counts,
  total,
  filter,
  onFilter,
  search,
  onSearch,
  range,
  onRange,
}: {
  counts: Record<string, number>;
  total: number;
  filter: string;
  onFilter: (f: string) => void;
  search: string;
  onSearch: (s: string) => void;
  range: DateRange;
  onRange: (r: DateRange) => void;
}) {
  const chip = (key: string, label: string, count: number) => {
    const isActive = filter === key;
    const color = key === "all" ? "var(--color-text-secondary)" : `var(--state-${key})`;
    return (
      <button
        key={key}
        onClick={() => onFilter(key)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
          isActive
            ? "border-border-bright bg-surface-elevated text-text-primary"
            : "border-border bg-surface text-text-secondary hover:text-text-primary"
        }`}
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {label}
        <span className="font-mono text-text-tertiary">{count}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        {chip("all", "All", total)}
        {RUN_STATUSES.map((s) => chip(s, s, counts[s] ?? 0))}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search runs…"
            className="w-48 rounded-md border border-border bg-surface-inset py-1 pr-2 pl-7 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => onRange(r.key)}
              className={`rounded-md px-2 py-1 text-xs ${
                range === r.key
                  ? "bg-surface-elevated text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
