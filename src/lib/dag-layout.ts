import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type {
  ExecutorSummary,
  Interaction,
  Json,
  RunView,
  TaskState,
  Workflow,
  WhenClause,
} from "../dagmar-types.ts";
import { formatDuration } from "../format.ts";

// dagre rankdir TB, nodesep 40, ranksep 80. Positions come back centered,
// offset to top-left for React Flow. Only `dependsOn` edges are laid out (they
// are acyclic); the loop back-edge is added afterwards (plan D3).
export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 88;

// Static kind of a task, from the definition and the executor profile's type.
export type NodeKind = "agent" | "process" | "gate";

export interface PendingMarker {
  kind: Interaction["kind"];
  label: string;
}

export interface ExecutionNodeData {
  taskId: string;
  kind: NodeKind;
  interactive: boolean;
  // Dagmar's native state; null when rendering a definition with no run.
  state: TaskState | null;
  executor: string;
  attempt: number | null;
  attemptCount: number;
  duration: string | null;
  // Completed attempts of a loop source over its maxVisits (display arithmetic).
  visits: { completed: number; max: number } | null;
  pending: PendingMarker | null;
  isSelected: boolean;
  [key: string]: unknown;
}

export interface FlowEdgeData {
  // Edge is also the `session: {mode: continue, from}` edge.
  session: boolean;
  // Guard label from `when` clauses on `$tasks.<dep>.output…`, else null.
  guard: string | null;
  loop: boolean;
  [key: string]: unknown;
}

const PENDING_LABEL: Record<Interaction["kind"], string> = {
  gate: "decision",
  turn: "reply",
  permission: "permission",
  input: "input",
};

const showValue = (v: Json): string => (typeof v === "string" ? v : JSON.stringify(v));

// `$tasks.<dep>.output[.path]` → { dep, path }, else null (`$run.input` refs
// are shown in the inspector only).
function taskRef(ref: string): { dep: string; path: string } | null {
  const m = /^\$tasks\.([^.]+)\.output((?:\.[^.]+)*)$/.exec(ref);
  return m ? { dep: m[1]!, path: m[2]!.slice(1) } : null;
}

function guardLabel(clause: WhenClause, path: string): string {
  const name = path === "" ? "output" : path;
  return clause.in !== undefined
    ? `${name} ∈ [${clause.in.map(showValue).join(", ")}]`
    : `${name} = ${showValue(clause.equals ?? null)}`;
}

function nodeKind(taskId: string, def: Workflow["tasks"][string], executors: ExecutorSummary[]): {
  kind: NodeKind;
  executor: string;
} {
  if (def.gate) return { kind: "gate", executor: "gate" };
  const profile = executors.find((e) => e.name === def.executor);
  if (!profile) {
    throw new Error(`Task ${taskId}: executor profile "${def.executor ?? ""}" is not in executor.list`);
  }
  return { kind: profile.type === "acp" ? "agent" : "process", executor: profile.name };
}

// Nodes and edges come from the definition; the run, when present, overlays
// Dagmar's native state and attempts. Throws on a definition that references a
// task or executor that does not exist (Dagmar validates these, so it is a bug
// or a stale executor list, not a case to paper over).
export function buildFlow(
  workflow: Workflow,
  run: RunView | null,
  executors: ExecutorSummary[],
  interactions: Interaction[],
  selectedTaskId: string | null,
): { nodes: Node[]; edges: Edge[] } {
  const taskIds = Object.keys(workflow.tasks);
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", ranksep: 80, nodesep: 40 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const id of taskIds) g.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  for (const id of taskIds) {
    for (const dep of workflow.tasks[id]!.dependsOn) {
      if (!workflow.tasks[dep]) throw new Error(`Task ${id} depends on unknown task ${dep}`);
      g.setEdge(dep, id);
    }
  }
  dagre.layout(g);

  const nodes: Node[] = taskIds.map((id) => {
    const def = workflow.tasks[id]!;
    const { kind, executor } = nodeKind(id, def, executors);
    const runTask = run?.tasks[id];
    const latest = runTask?.attempts[runTask.attempts.length - 1];
    const pendingInteraction =
      run && latest
        ? interactions.find((i) => i.workflowRunId === run.id && i.taskRunId === latest.id)
        : undefined;
    const data: ExecutionNodeData = {
      taskId: id,
      kind,
      interactive: def.interactive === true,
      state: runTask?.state ?? null,
      executor,
      attempt: latest?.attempt ?? null,
      attemptCount: runTask?.attempts.length ?? 0,
      duration: latest ? formatDuration(latest.startedAt, latest.endedAt) : null,
      visits: def.loop
        ? {
            completed: runTask?.attempts.filter((a) => a.status === "completed").length ?? 0,
            max: def.loop.maxVisits,
          }
        : null,
      pending: pendingInteraction
        ? { kind: pendingInteraction.kind, label: PENDING_LABEL[pendingInteraction.kind] }
        : null,
      isSelected: id === selectedTaskId,
    };
    const pos = g.node(id);
    return {
      id,
      type: "executionNode",
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    };
  });

  const edges: Edge[] = [];
  for (const id of taskIds) {
    const def = workflow.tasks[id]!;
    const targetState = run?.tasks[id]?.state ?? null;

    const guards = new Map<string, string[]>();
    for (const clause of def.when ?? []) {
      const ref = taskRef(clause.ref);
      if (!ref) continue;
      if (!def.dependsOn.includes(ref.dep)) {
        throw new Error(`Task ${id} guard references non-dependency ${ref.dep}`);
      }
      guards.set(ref.dep, [...(guards.get(ref.dep) ?? []), guardLabel(clause, ref.path)]);
    }
    const sessionFrom = def.session?.mode === "continue" ? def.session.from : null;
    if (sessionFrom !== null && !def.dependsOn.includes(sessionFrom)) {
      throw new Error(`Task ${id} continues session from non-dependency ${sessionFrom}`);
    }

    for (const dep of def.dependsOn) {
      const guard = guards.get(dep)?.join(", ") ?? null;
      const session = dep === sessionFrom;
      const data: FlowEdgeData = { session, guard, loop: false };
      edges.push({
        id: `${dep}->${id}`,
        source: dep,
        target: id,
        label: guard ?? undefined,
        animated: targetState === "running",
        data,
        style: {
          stroke: targetState ? `var(--state-${targetState})` : "var(--color-border-bright)",
          strokeWidth: 1.5,
          strokeDasharray: session ? "6 4" : undefined,
          opacity: targetState === "skipped" ? 0.4 : 1,
        },
        labelStyle: { fill: "var(--color-text-secondary)", fontSize: 10 },
        labelBgStyle: { fill: "var(--color-surface-inset)" },
      });
    }

    if (def.loop) {
      if (!workflow.tasks[def.loop.to]) throw new Error(`Task ${id} loops to unknown task ${def.loop.to}`);
      const data: FlowEdgeData = { session: false, guard: null, loop: true };
      edges.push({
        id: `loop:${id}->${def.loop.to}`,
        source: id,
        sourceHandle: "loop-out",
        target: def.loop.to,
        targetHandle: "loop-in",
        type: "default",
        label: `loop ≤ ${def.loop.maxVisits}`,
        data,
        style: { stroke: "var(--color-accent)", strokeWidth: 1.5 },
        labelStyle: { fill: "var(--color-accent)", fontSize: 10 },
        labelBgStyle: { fill: "var(--color-surface-inset)" },
      });
    }
  }

  return { nodes, edges };
}
