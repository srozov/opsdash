// Dagmar public wire shapes consumed by OpsDash.
//
// Copied from /home/<host>/dagmar/src/types.ts (types) plus the inline result
// shapes returned by the RPC handlers in daemon.ts and the event payloads
// published in scheduler.ts. Field names and status strings are kept identical.
// Do not import Dagmar source files; OpsDash has no build dependency on Dagmar.

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };

export type ExecutorType = "process" | "acp";

export type RunStatus = "running" | "waiting" | "completed" | "blocked" | "cancelled";

export type AttemptStatus =
  | "running"
  | "awaiting_permission"
  | "awaiting_input"
  | "completed"
  | "blocked"
  | "failed"
  | "cancelled";

export type TaskState = "pending" | "ready" | AttemptStatus | "blocked_by_dependency";

export interface TaskResult {
  outcome: "completed" | "blocked";
  message: string;
  output: Json;
}

export interface TaskError {
  code: string;
  message: string;
  data?: Json;
}

// AttemptRow with workflowRunId/taskId/executorProfile/executorType omitted, as
// embedded in RunView.tasks[].attempts.
export interface Attempt {
  id: string;
  attempt: number;
  status: AttemptStatus;
  result: TaskResult | null;
  error: TaskError | null;
  acpSessionId: string | null;
  startedAt: string;
  updatedAt: string;
  endedAt: string | null;
}

export interface RunTask {
  dependsOn: string[];
  executor: string;
  state: TaskState;
  attempts: Attempt[];
}

// run.list returns Omit<RunRow, "input">[].
export interface RunSummary {
  id: string;
  workflowId: string;
  status: RunStatus;
  startedAt: string;
  updatedAt: string;
  endedAt: string | null;
}

// run.get returns the full RunView (RunRow + sequence + tasks). Input is
// included here but omitted from run.list rows.
export interface RunView extends RunSummary {
  input: Json;
  sequence: number;
  tasks: Record<string, RunTask>;
}

export interface Interaction {
  id: string;
  workflowRunId: string;
  taskRunId: string;
  kind: "permission" | "input";
  method: "session/request_permission" | "elicitation/create";
  request: Json;
  createdAt: string;
}

// Transcript records: exactly three types. The agent-message / thought /
// tool-call breakdown lives inside an `acp` record's `message` (the ACP payload).
export type TranscriptInput =
  | { type: "lifecycle"; direction: "internal"; event: string; data?: Json }
  | {
      type: "stdio";
      direction: "to_executor" | "from_executor";
      stream: "stdin" | "stdout" | "stderr";
      data: string;
    }
  | { type: "acp"; direction: "to_executor" | "from_executor"; message: Json; raw?: string };

export type TranscriptRecord = TranscriptInput & { timestamp: string };

export type EventType =
  | "workflow.status_changed"
  | "task.status_changed"
  | "interaction.changed"
  | "transcript.appended";

export interface DagmarEvent {
  sequence: number;
  timestamp: string;
  type: EventType;
  workflowRunId: string;
  taskRunId?: string;
  data: JsonObject;
}

// Event payloads (DagmarEvent.data) by type; see scheduler.ts.
export interface WorkflowStatusChangedData {
  status: RunStatus;
}
export interface TaskStatusChangedData {
  taskId: string;
  attempt: number;
  status: AttemptStatus;
}
export interface InteractionChangedData {
  interactionId: string;
  state: "pending" | "answered" | "cancelled";
}
export interface TranscriptAppendedData {
  line: number;
}

// --- RPC method result shapes (from daemon.ts / workflow.ts / transcript.ts) ---

export interface PingResult {
  ok: boolean;
  version: string;
  startedAt: string;
  currentSequence: number;
}

export interface WorkflowSummary {
  id: string;
  taskCount: number;
  file: string;
}

export interface WorkflowErrorView {
  file: string;
  code: string;
  message: string;
}

export interface WorkflowListResult {
  workflows: WorkflowSummary[];
  errors: WorkflowErrorView[];
}

export interface TranscriptReadResult {
  records: TranscriptRecord[];
  nextLine: number;
}

export interface SubscribeResult {
  subscriptionId: string;
  currentSequence: number;
}
