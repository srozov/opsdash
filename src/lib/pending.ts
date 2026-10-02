import type { Interaction, Json } from "../dagmar-types.ts";

type Kind = Interaction["kind"];

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
  permission: "permission needed",
  input: "input needed",
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
export function runPendingHints(interactions: Interaction[], runId: string): string[] {
  const kinds = new Set<Kind>();
  for (const i of interactions) if (i.workflowRunId === runId) kinds.add(i.kind);
  return [...kinds].map((k) => HINT[k]);
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
