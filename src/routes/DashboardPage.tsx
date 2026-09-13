import { useMemo, useState } from "react";
import { useDagmar } from "../dagmar/DagmarProvider.tsx";
import {
  ACTIVE_STATUSES,
  HISTORY_STATUSES,
  RUN_STATUSES,
  rangeCutoff,
  type DateRange,
} from "../lib/runs.ts";
import { StatusSummaryBar } from "../components/dashboard/StatusSummaryBar.tsx";
import { WorkflowRunCard } from "../components/dashboard/WorkflowRunCard.tsx";
import { WorkflowHistoryTable } from "../components/dashboard/WorkflowHistoryTable.tsx";
import { formatTime } from "../format.ts";
import { useNow } from "../lib/useNow.ts";

// Archon "Mission Control": status summary bar, an Active Workflows card grid,
// and a History table with client-side pagination.
export function DashboardPage() {
  const { runs, runsError } = useDagmar();
  useNow(1000);

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<DateRange>("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of RUN_STATUSES) c[s] = 0;
    for (const r of runs) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [runs]);

  const filtered = useMemo(() => {
    const cut = rangeCutoff(range);
    const q = search.trim().toLowerCase();
    return runs.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (cut && new Date(r.startedAt).getTime() < cut) return false;
      if (q && !r.workflowId.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [runs, filter, range, search]);

  const active = filtered.filter((r) => ACTIVE_STATUSES.includes(r.status));
  const history = filtered.filter((r) => HISTORY_STATUSES.includes(r.status));
  const pageCount = Math.max(1, Math.ceil(history.length / pageSize));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageRuns = history.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-6 overflow-auto p-6">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold text-text-primary">Mission Control</h1>
          <span className="font-mono text-xs text-text-tertiary">
            updated {formatTime(new Date().toISOString())}
          </span>
        </div>

        <StatusSummaryBar
          counts={counts}
          total={runs.length}
          filter={filter}
          onFilter={setFilter}
          search={search}
          onSearch={setSearch}
          range={range}
          onRange={setRange}
        />

        {runsError && (
          <div className="rounded-md border border-error/50 bg-error/10 px-3 py-2 text-sm text-error">
            {runsError}
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">Active Workflows</h2>
          {active.length === 0 ? (
            <p className="text-sm text-text-tertiary italic">No active runs.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {active.map((r) => (
                <WorkflowRunCard key={r.id} run={r} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">History</h2>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>
                {history.length} run{history.length === 1 ? "" : "s"}
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                className="rounded-md border border-border bg-surface-inset px-1.5 py-1 text-text-primary focus:outline-none"
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <WorkflowHistoryTable runs={pageRuns} />
          {pageCount > 1 && (
            <div className="flex items-center justify-end gap-2 text-xs text-text-secondary">
              <button
                disabled={clampedPage === 0}
                onClick={() => setPage(clampedPage - 1)}
                className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <span>
                page {clampedPage + 1} / {pageCount}
              </span>
              <button
                disabled={clampedPage >= pageCount - 1}
                onClick={() => setPage(clampedPage + 1)}
                className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
