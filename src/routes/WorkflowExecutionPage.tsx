import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import type { Attempt } from "../dagmar-types.ts";
import { useRun } from "../dagmar/DagmarProvider.tsx";
import { formatDuration, formatTime, shortId } from "../format.ts";
import { useNow } from "../lib/useNow.ts";
import { StatusBadge } from "../components/ui/StatusBadge.tsx";
import { WorkflowDagViewer } from "../components/workflows/WorkflowDagViewer.tsx";
import { DagNodeProgress } from "../components/workflows/DagNodeProgress.tsx";
import { NodeInspector } from "../components/workflows/NodeInspector.tsx";
import { WorkflowLogs } from "../components/workflows/WorkflowLogs.tsx";

const latest = (attempts: Attempt[]): Attempt | undefined =>
  attempts.reduce<Attempt | undefined>((best, a) => (!best || a.attempt > best.attempt ? a : best), undefined);

const tab = (active: boolean) =>
  `rounded-md px-3 py-1 text-sm ${
    active ? "bg-surface-elevated text-text-primary" : "text-text-secondary hover:text-text-primary"
  }`;

// Archon's WorkflowExecution view: header, Graph/Logs tabs, and a resizable
// split between the graph (or task list) and the log/detail panel.
export function WorkflowExecutionPage() {
  const { runId } = useParams();
  const { run, error } = useRun(runId);
  const [view, setView] = useState<"graph" | "logs">("graph");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  useNow();

  useEffect(() => {
    if (!run) return;
    setTaskId((prev) => (prev && run.tasks[prev] ? prev : (Object.keys(run.tasks)[0] ?? null)));
  }, [run]);

  useEffect(() => {
    if (!run || !taskId || !run.tasks[taskId]) {
      setAttemptId(null);
      return;
    }
    const attempts = run.tasks[taskId].attempts;
    setAttemptId((prev) => (prev && attempts.some((a) => a.id === prev) ? prev : (latest(attempts)?.id ?? null)));
  }, [run, taskId]);

  const selectTask = (id: string) => {
    setTaskId(id);
    setAttemptId(latest(run?.tasks[id]?.attempts ?? [])?.id ?? null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <Link to="/" className="text-text-tertiary hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        {run ? (
          <>
            <span className="text-sm font-semibold text-text-primary">{run.workflowId}</span>
            <StatusBadge state={run.status} />
            <span className="font-mono text-xs text-text-tertiary" title={run.id}>
              {shortId(run.id)}
            </span>
            <span className="ml-auto font-mono text-xs text-text-secondary">
              elapsed {formatDuration(run.startedAt, run.endedAt)} · start {formatTime(run.startedAt)}
            </span>
          </>
        ) : (
          <span className="text-sm text-text-tertiary">{error ?? "Loading run…"}</span>
        )}
      </div>

      <div className="flex items-center gap-1 border-b border-border px-4 py-1.5">
        <button className={tab(view === "graph")} onClick={() => setView("graph")}>
          Graph
        </button>
        <button className={tab(view === "logs")} onClick={() => setView("logs")}>
          Logs
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {run ? (
          <PanelGroup direction="horizontal">
            <Panel defaultSize={60} minSize={30}>
              {view === "graph" ? (
                <div className="h-full">
                  <WorkflowDagViewer run={run} selectedTaskId={taskId} onSelect={selectTask} />
                </div>
              ) : (
                <div className="h-full overflow-auto">
                  <DagNodeProgress run={run} selectedTaskId={taskId} onSelect={selectTask} />
                </div>
              )}
            </Panel>
            <PanelResizeHandle className="w-px bg-border transition-colors hover:bg-border-bright data-[resize-handle-state=drag]:bg-accent" />
            <Panel defaultSize={40} minSize={20}>
              <div className="flex h-full flex-col">
                <div className="max-h-[50%] shrink-0 overflow-auto border-b border-border">
                  <NodeInspector
                    run={run}
                    selectedTaskId={taskId}
                    selectedAttemptId={attemptId}
                    onSelectAttempt={setAttemptId}
                  />
                </div>
                <div className="min-h-0 flex-1">
                  <WorkflowLogs taskRunId={attemptId} />
                </div>
              </div>
            </Panel>
          </PanelGroup>
        ) : (
          <div className="p-6 text-sm text-text-tertiary">{error ?? "Loading…"}</div>
        )}
      </div>
    </div>
  );
}
