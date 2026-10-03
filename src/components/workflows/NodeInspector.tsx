import { useState, type ReactNode } from "react";
import type { Attempt, ExecutorSummary, Interaction, Json, RunView, TaskDef, Workflow } from "../../dagmar-types.ts";
import { useDagmar } from "../../dagmar/DagmarProvider.tsx";
import { formatDuration, formatTime, shortId } from "../../format.ts";
import { clauseText, exitBranchOf, stateNotes } from "../../lib/task-notes.ts";
import { StatusBadge } from "../ui/StatusBadge.tsx";
import { Button } from "../ui/Button.tsx";
import type { HumanInteractionData } from "../../lib/pending.ts";
import { HumanInteraction } from "./HumanInteraction.tsx";

const ACTIVE = ["running", "awaiting_permission", "awaiting_input"];

function permissionOptions(request: Json): { optionId: string; name?: string }[] {
  if (!request || typeof request !== "object" || Array.isArray(request)) return [];
  const options = (request as { [k: string]: Json }).options;
  if (!Array.isArray(options)) return [];
  const out: { optionId: string; name?: string }[] = [];
  for (const o of options) {
    if (!o || typeof o !== "object" || Array.isArray(o)) continue;
    const row = o as { [k: string]: Json };
    if (typeof row.optionId !== "string") continue;
    out.push({ optionId: row.optionId, name: typeof row.name === "string" ? row.name : undefined });
  }
  return out;
}

// Selected task detail: attempts, result/error/ACP session, task cancellation,
// and pending interactions with answer controls.
export function NodeInspector({
  run,
  workflow,
  executors,
  selectedTaskId,
  selectedAttemptId,
  onSelectAttempt,
  onSelectTask,
}: {
  run: RunView;
  workflow: Workflow;
  executors: ExecutorSummary[];
  selectedTaskId: string | null;
  selectedAttemptId: string | null;
  onSelectAttempt: (attemptId: string) => void;
  onSelectTask: (taskId: string) => void;
}) {
  const { interactions, cancelTask, answerInteraction, connected } = useDagmar();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const task = selectedTaskId ? run.tasks[selectedTaskId] : undefined;
  if (!selectedTaskId || !task) {
    return <p className="p-4 text-sm text-text-tertiary italic">Select a task in the graph.</p>;
  }

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

  const def = workflow.tasks[selectedTaskId];
  // Dagmar records a guard skip as a skipped attempt, so a skipped task has attempts too.
  const notes =
    task.attempts.length === 0 || task.state === "skipped" ? stateNotes(workflow, selectedTaskId, task) : [];
  const attempt = task.attempts.find((a) => a.id === selectedAttemptId) ?? null;
  const pending = interactions.filter((i) => task.attempts.some((a) => a.id === i.taskRunId));

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-semibold text-text-primary">{selectedTaskId}</span>
        <StatusBadge state={task.state} />
      </div>
      <div className="space-y-0.5 font-mono text-xs text-text-secondary">
        <div>executor: {task.executor}</div>
        <div>depends on: {task.dependsOn.length ? task.dependsOn.join(", ") : "—"}</div>
      </div>

      {pending.length > 0 && (
        <PendingInteractions
          interactions={pending}
          busy={busy}
          connected={connected}
          inputs={inputs}
          setInputs={setInputs}
          answer={(id, response) => act(() => answerInteraction(id, response))}
        />
      )}

      {def && <Definition workflow={workflow} executors={executors} taskId={selectedTaskId} def={def} onSelectTask={onSelectTask} />}

      {notes.length > 0 && (
        <div className="space-y-1 text-sm text-text-tertiary italic">
          {notes.map((n, i) => (
            <p key={i}>{n}</p>
          ))}
        </div>
      )}

      {task.attempts.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {task.attempts.map((a) => (
              <button
                key={a.id}
                onClick={() => onSelectAttempt(a.id)}
                title={a.result?.message ?? a.id}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs ${
                  a.id === selectedAttemptId
                    ? "border-accent bg-surface-elevated text-text-primary"
                    : "border-border text-text-secondary hover:text-text-primary"
                }`}
              >
                #{a.attempt}
                <StatusBadge state={a.status} />
              </button>
            ))}
          </div>
          {attempt && (
            <AttemptDetail
              attempt={attempt}
              busy={busy}
              connected={connected}
              onCancelTask={() => act(() => cancelTask(attempt.id))}
            />
          )}
        </>
      )}
      {error && <div className="text-xs text-error">{error}</div>}
    </div>
  );
}

function AttemptDetail({
  attempt,
  busy,
  connected,
  onCancelTask,
}: {
  attempt: Attempt;
  busy: boolean;
  connected: boolean;
  onCancelTask: () => void;
}) {
  const row = (label: string, value: ReactNode) => (
    <>
      <span className="text-text-tertiary">{label}</span>
      <span className="text-text-secondary">{value}</span>
    </>
  );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 font-mono text-xs">
        {row("id", <span title={attempt.id}>{shortId(attempt.id)}</span>)}
        {row("status", <StatusBadge state={attempt.status} />)}
        {row("started", formatTime(attempt.startedAt))}
        {row("updated", formatTime(attempt.updatedAt))}
        {row("ended", attempt.endedAt ? formatTime(attempt.endedAt) : "—")}
        {row("duration", formatDuration(attempt.startedAt, attempt.endedAt))}
        {row("ACP session", attempt.acpSessionId ?? "—")}
      </div>

      {ACTIVE.includes(attempt.status) && (
        <Button variant="danger" disabled={busy || !connected} onClick={onCancelTask}>
          Cancel task
        </Button>
      )}

      {attempt.result && (
        <div className="border-t border-border pt-2">
          <h3 className="text-xs font-semibold uppercase text-text-tertiary">Result</h3>
          <div className="font-mono text-xs text-text-secondary">outcome: {attempt.result.outcome}</div>
          <div className="text-sm">{attempt.result.message}</div>
          <pre className="mt-1 overflow-x-auto rounded border border-border bg-surface-inset p-2 font-mono text-[11px] whitespace-pre-wrap break-words">
            {JSON.stringify(attempt.result.output, null, 2)}
          </pre>
        </div>
      )}

      {attempt.error && (
        <div className="border-t border-border pt-2">
          <h3 className="text-xs font-semibold uppercase text-text-tertiary">Error</h3>
          <div className="font-mono text-xs text-error">{attempt.error.code}</div>
          <div className="text-sm">{attempt.error.message}</div>
          {attempt.error.data !== undefined && (
            <pre className="mt-1 overflow-x-auto rounded border border-border bg-surface-inset p-2 font-mono text-[11px] whitespace-pre-wrap break-words">
              {JSON.stringify(attempt.error.data, null, 2)}
            </pre>
          )}
        </div>
      )}

    </div>
  );
}

// Pending interactions of the selected task, shown first so a gate or turn is
// not below the fold.
function PendingInteractions({
  interactions,
  busy,
  connected,
  inputs,
  setInputs,
  answer,
}: {
  interactions: Interaction[];
  busy: boolean;
  connected: boolean;
  inputs: Record<string, string>;
  setInputs: (v: Record<string, string>) => void;
  answer: (id: string, response: Json) => void;
}) {
  // Exhaustive on purpose: gate/turn must never get the permission/elicitation controls.
  const controls = (i: Interaction): ReactNode => {
    switch (i.kind) {
      case "gate":
      case "turn":
        // Interaction is not a discriminated union, so the case labels do not narrow `i`.
        return <HumanInteraction key={i.id} interaction={i as HumanInteractionData} />;
      case "permission":
        return (
          <div className="mt-2 flex flex-wrap gap-2">
            {permissionOptions(i.request).map((o) => (
              <Button
                key={o.optionId}
                variant="primary"
                disabled={busy || !connected}
                onClick={() =>
                  answer(i.id, { outcome: { outcome: "selected", optionId: o.optionId } })
                }
              >
                {o.name ?? o.optionId}
              </Button>
            ))}
            <Button
              disabled={busy || !connected}
              onClick={() => answer(i.id, { outcome: { outcome: "cancelled" } })}
            >
              Cancel
            </Button>
          </div>
        );
      case "input":
        return (
          <div className="mt-2 flex flex-col gap-2">
            <textarea
              value={inputs[i.id] ?? "{}"}
              onChange={(e) => setInputs({ ...inputs, [i.id]: e.target.value })}
              rows={3}
              spellCheck={false}
              className="rounded-md border border-border bg-surface-inset p-2 font-mono text-xs text-text-primary focus:border-accent focus:outline-none"
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                disabled={busy || !connected}
                onClick={() => {
                  let content: Json;
                  try {
                    content = JSON.parse(inputs[i.id] ?? "{}") as Json;
                  } catch {
                    return;
                  }
                  answer(i.id, { action: "accept", content });
                }}
              >
                Accept
              </Button>
              <Button disabled={busy || !connected} onClick={() => answer(i.id, { action: "decline" })}>
                Decline
              </Button>
            </div>
          </div>
        );
      default: {
        const unreachable: never = i.kind;
        throw new Error(`unhandled interaction kind ${String(unreachable)}`);
      }
    }
  };
  return (
      <div className="border-t border-border pt-2">
        <h3 className="text-xs font-semibold uppercase text-text-tertiary">Pending interactions</h3>
        {interactions.map((i) => (
          <div key={i.id} className="mt-2 rounded border border-border bg-surface-elevated p-2">
            <div className="font-mono text-xs">
              <StatusBadge state={i.kind} /> {i.method}
            </div>
            {i.kind === "gate" || i.kind === "turn" ? null : <pre className={pre}>{JSON.stringify(i.request, null, 2)}</pre>}
            {controls(i)}
          </div>
        ))}
      </div>
  );
}

// Profile name and its type from executor.list; gate tasks have no profile.
function executorLabel(def: TaskDef, executors: ExecutorSummary[]): string {
  if (def.gate) return "gate";
  const profile = executors.find((e) => e.name === def.executor);
  if (!profile) throw new Error(`executor profile "${def.executor ?? ""}" is not in executor.list`);
  return `${profile.name} (${profile.type})`;
}

const pre =
  "mt-1 overflow-x-auto rounded border border-border bg-surface-inset p-2 font-mono text-[11px] whitespace-pre-wrap break-words";

// Static task definition from workflow.get: what the task is, not what it did.
function Definition({
  workflow,
  executors,
  taskId,
  def,
  onSelectTask,
}: {
  workflow: Workflow;
  executors: ExecutorSummary[];
  taskId: string;
  def: TaskDef;
  onSelectTask: (taskId: string) => void;
}) {
  const exit = exitBranchOf(workflow, taskId);
  const sessionFrom = def.session?.mode === "continue" ? def.session.from : null;
  const json = (v: unknown) => <pre className={pre}>{JSON.stringify(v, null, 2)}</pre>;
  const sub = (label: string, body: ReactNode) => (
    <div>
      <div className="text-text-tertiary">{label}</div>
      {body}
    </div>
  );
  return (
    <details className="rounded border border-border">
      <summary className="cursor-pointer px-2 py-1 text-xs font-semibold uppercase text-text-tertiary">
        Definition
      </summary>
      <div className="space-y-2 border-t border-border p-2 font-mono text-xs text-text-secondary">
        <div>executor: {executorLabel(def, executors)}</div>
        {def.interactive && <div>interactive: true</div>}
        {def.session?.mode === "fresh" && <div>session: fresh</div>}
        {sessionFrom !== null && (
          <div>
            session: continue from{" "}
            <button className="underline hover:text-text-primary" onClick={() => onSelectTask(sessionFrom)}>
              {sessionFrom}
            </button>
          </div>
        )}
        {Object.keys(def.inputs).length > 0 && sub("inputs", json(def.inputs))}
        {def.gate && (
          <>
            {sub("gate prompt", <div className="whitespace-pre-wrap font-sans text-sm">{def.gate.prompt}</div>)}
            {def.gate.schema !== undefined && sub("gate schema", json(def.gate.schema))}
          </>
        )}
        {def.prompt !== undefined && (
          <details>
            <summary className="cursor-pointer text-text-tertiary">prompt</summary>
            <pre className={pre}>{def.prompt}</pre>
          </details>
        )}
        {def.run && sub("run", json(def.run))}
        {def.outputSchema !== undefined && sub("outputSchema", json(def.outputSchema))}
        {def.when && def.when.length > 0 && (
          <div>
            <div className="text-text-tertiary">when (all must hold)</div>
            {def.when.map((c, i) => (
              <div key={i}>{clauseText(c)}</div>
            ))}
          </div>
        )}
        {def.loop && (
          <div>
            loop: back to {def.loop.to}, max {def.loop.maxVisits} visits
          </div>
        )}
        {exit && (
          <div>
            exit branch of loop {exit.from} → {exit.to}
          </div>
        )}
      </div>
    </details>
  );
}
