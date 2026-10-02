import type { Interaction, Json, RunSummary, RunView } from "../dagmar-types.ts";

type Kind = Interaction["kind"];

// A gate or turn: the kinds answered by the shared HumanInteraction controls.
export type HumanInteractionData = Interaction & { kind: "gate" | "turn" };

// Short marker text on a graph node (plan "Graph").
export const PENDING_LABEL: Record<Kind, string> = {
  gate: "decision",
  turn: "reply",
  permission: "permission",
  input: "input",
};

const HINT: Record<Kind, string> = {
  gate: "gate: decision needed",
  turn: "turn: reply needed",
  permission: "permission: approval needed",
  input: "input: answer needed",
};

// The pending interaction a node shows: one on the task's latest attempt.
export function pendingForAttempt(
  interactions: Interaction[],
  runId: string,
  latestAttemptId: string | undefined,
): Interaction | undefined {
  if (latestAttemptId === undefined) return undefined;
  return interactions.find((i) => i.workflowRunId === runId && i.taskRunId === latestAttemptId);
}

// Hints for a dashboard run card: one per pending kind, in first-seen order.
// The kind picks the --state-<kind> colour, as on the graph node marker.
export function runPendingHints(interactions: Interaction[], runId: string): { kind: Kind; text: string }[] {
  const kinds = new Set<Kind>();
  for (const i of interactions) if (i.workflowRunId === runId) kinds.add(i.kind);
  return [...kinds].map((kind) => ({ kind, text: HINT[kind] }));
}

// The run's pending gate/turn interactions, oldest first (the ones answered in OpsDash).
export function runHumanInteractions(interactions: Interaction[], runId: string): HumanInteractionData[] {
  return interactions
    .filter((i): i is HumanInteractionData => i.workflowRunId === runId && (i.kind === "gate" || i.kind === "turn"))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// Runs with a pending gate/turn first; otherwise the given order is kept.
export function sortPendingFirst(runs: RunSummary[], interactions: Interaction[]): RunSummary[] {
  const waiting = new Set(runs.filter((r) => runHumanInteractions(interactions, r.id).length > 0).map((r) => r.id));
  return [...runs.filter((r) => waiting.has(r.id)), ...runs.filter((r) => !waiting.has(r.id))];
}

const TITLE_MAX = 80;

// Card title: the first non-empty line of `input.task`, truncated; the workflow
// id when there is no such string.
export function runTitle(input: Json | undefined, workflowId: string): string {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return workflowId;
  const task = input.task;
  if (typeof task !== "string") return workflowId;
  const line = task.split("\n").map((l) => l.trim()).find((l) => l !== "");
  if (line === undefined) return workflowId;
  return line.length > TITLE_MAX ? `${line.slice(0, TITLE_MAX - 1)}…` : line;
}

export interface DependencyResult {
  taskId: string;
  outcome: "completed" | "blocked";
  // `output.verdict` when the dependency has one, otherwise the result message.
  headline: string;
  output: Json;
}

// The task an attempt (an interaction's taskRunId) belongs to.
export function taskIdForAttempt(run: RunView, taskRunId: string): string | undefined {
  return Object.keys(run.tasks).find((id) => run.tasks[id]!.attempts.some((a) => a.id === taskRunId));
}

// Latest attempt result of each of the task's dependencies that has one.
export function gateDependencyResults(run: RunView, taskRunId: string): DependencyResult[] {
  const gateId = taskIdForAttempt(run, taskRunId);
  if (gateId === undefined) return [];
  const out: DependencyResult[] = [];
  for (const depId of run.tasks[gateId]!.dependsOn) {
    const attempts = run.tasks[depId]?.attempts ?? [];
    const latest = attempts.reduce<(typeof attempts)[number] | undefined>(
      (best, a) => (best === undefined || a.attempt > best.attempt ? a : best),
      undefined,
    );
    if (!latest?.result) continue;
    const { outcome, message, output } = latest.result;
    const verdict = isObject(output) ? output.verdict : undefined;
    out.push({ taskId: depId, outcome, headline: typeof verdict === "string" ? verdict : message, output });
  }
  return out;
}

const isObject = (v: Json | undefined): v is { [key: string]: Json } =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// `gate/answer` request: {prompt, schema?}. Null when the shape is not that,
// so the inspector can say so instead of guessing.
export function gateRequest(request: Json): { prompt: string; schema?: Json } | null {
  if (!isObject(request) || typeof request.prompt !== "string") return null;
  return request.schema === undefined ? { prompt: request.prompt } : { prompt: request.prompt, schema: request.schema };
}

// `turn/next` request: {message}.
export function turnMessage(request: Json): string | null {
  return isObject(request) && typeof request.message === "string" ? request.message : null;
}
