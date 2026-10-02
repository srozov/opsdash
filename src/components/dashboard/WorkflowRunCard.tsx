import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { RunSummary, RunView } from "../../dagmar-types.ts";
import { useDagmar, withDagmarQuery } from "../../dagmar/DagmarProvider.tsx";
import { formatDuration, formatTime, shortId } from "../../format.ts";
import {
  gateDependencyResults,
  runHumanInteractions,
  runPendingHints,
  runTitle,
  taskIdForAttempt,
} from "../../lib/pending.ts";
import { useNow } from "../../lib/useNow.ts";
import { StatusBadge } from "../ui/StatusBadge.tsx";
import { Button } from "../ui/Button.tsx";
import { HumanInteraction } from "../workflows/HumanInteraction.tsx";

// One active run, mirroring Archon's WorkflowRunCard: title, status, elapsed,
// timing, and inline lifecycle actions. Clicking opens the execution view.
export function WorkflowRunCard({ run }: { run: RunSummary }) {
  const navigate = useNavigate();
  const { cancelRun, resumeRun, interactions, connected, client, epoch } = useDagmar();
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

  const hints = runPendingHints(interactions, run.id);
  const human = runHumanInteractions(interactions, run.id);

  // RunSummary has no input, so the title and the gate's dependency results
  // come from run.get, loaded only for runs that have a pending gate/turn. A
  // failure leaves the workflow id as the title and is shown in the block.
  const [view, setView] = useState<RunView | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const humanKey = human.map((i) => i.id).join(",");
  useEffect(() => {
    setViewError(null);
    if (humanKey === "") {
      setView(null);
      return;
    }
    let live = true;
    client
      .request<RunView>("run.get", { workflowRunId: run.id })
      .then((v) => {
        if (!live) return;
        setView(v);
        setViewError(null);
      })
      .catch((e) => {
        if (!live) return;
        setView(null);
        setViewError(e instanceof Error ? e.message : "request failed");
      });
    return () => {
      live = false;
    };
  }, [client, run.id, humanKey, epoch]);
  const title = human.length > 0 ? runTitle(view?.input, run.workflowId) : run.workflowId;
  const active = run.status === "running" || run.status === "waiting";
  const blocked = run.status === "blocked";

  return (
    <div
      className="flex cursor-pointer flex-col gap-3 rounded-lg border border-border bg-surface p-4 hover:border-border-bright"
      onClick={() => navigate(withDagmarQuery(`/workflows/runs/${run.id}`))}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-text-primary" title={title}>
            {title}
          </div>
          {human.length === 0 && (
            <div className="mt-0.5 font-mono text-xs text-text-tertiary" title={run.id}>
              {shortId(run.id)}
            </div>
          )}
        </div>
        <StatusBadge state={run.status} />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-text-secondary">
        <span>elapsed {formatDuration(run.startedAt, run.endedAt)}</span>
        <span>start {formatTime(run.startedAt)}</span>
        <span>updated {formatTime(run.updatedAt)}</span>
      </div>

      {hints.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {hints.map((h) => (
            <span
              key={h.kind}
              className="animate-pulse rounded-full px-2 py-0.5 font-mono text-[10px]"
              style={{
                color: `var(--state-${h.kind})`,
                backgroundColor: `color-mix(in oklab, var(--state-${h.kind}) 20%, transparent)`,
              }}
            >
              {h.text}
            </span>
          ))}
        </div>
      )}

      {human.map((i) => {
        const taskId = view ? taskIdForAttempt(view, i.taskRunId) : undefined;
        return (
          <div key={i.id} className="space-y-2 rounded border border-border bg-surface-elevated p-2">
            <div className="font-mono text-xs text-text-tertiary">
              {[run.workflowId, shortId(run.id), taskId].filter((p) => p !== undefined).join(" · ")}
              <span className="block">waiting since {formatTime(i.createdAt)}</span>
            </div>
            {viewError !== null && (
              <div className="text-xs text-text-tertiary">details unavailable: {viewError}</div>
            )}
            <HumanInteraction
              interaction={i}
              compact
              dependencies={i.kind === "gate" && view ? gateDependencyResults(view, i.taskRunId) : []}
            />
          </div>
        );
      })}

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
