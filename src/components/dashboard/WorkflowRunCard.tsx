import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { RunSummary } from "../../dagmar-types.ts";
import { useDagmar } from "../../dagmar/DagmarProvider.tsx";
import { formatDuration, formatTime, shortId } from "../../format.ts";
import { useNow } from "../../lib/useNow.ts";
import { StatusBadge } from "../ui/StatusBadge.tsx";
import { Button } from "../ui/Button.tsx";

// One active run, mirroring Archon's WorkflowRunCard: title, status, elapsed,
// timing, and inline lifecycle actions. Clicking opens the execution view.
export function WorkflowRunCard({ run }: { run: RunSummary }) {
  const navigate = useNavigate();
  const { cancelRun, resumeRun, connected } = useDagmar();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useNow();

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "action failed");
    } finally {
      setBusy(false);
    }
  };

  const active = run.status === "running" || run.status === "waiting";
  const blocked = run.status === "blocked";

  return (
    <div
      className="flex cursor-pointer flex-col gap-3 rounded-lg border border-border bg-surface p-4 hover:border-border-bright"
      onClick={() => navigate(`/workflows/runs/${run.id}`)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-text-primary">{run.workflowId}</div>
          <div className="mt-0.5 font-mono text-xs text-text-tertiary" title={run.id}>
            {shortId(run.id)}
          </div>
        </div>
        <StatusBadge state={run.status} />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-text-secondary">
        <span>elapsed {formatDuration(run.startedAt, run.endedAt)}</span>
        <span>start {formatTime(run.startedAt)}</span>
        <span>updated {formatTime(run.updatedAt)}</span>
      </div>

      {(active || blocked) && (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {blocked && (
            <Button variant="primary" disabled={busy || !connected} onClick={() => act(() => resumeRun(run.id))}>
              Resume
            </Button>
          )}
          <Button variant="danger" disabled={busy || !connected} onClick={() => act(() => cancelRun(run.id))}>
            Cancel
          </Button>
        </div>
      )}
      {error && <div className="text-xs text-error">{error}</div>}
    </div>
  );
}
