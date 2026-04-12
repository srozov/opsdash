export type TaskStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "timed_out"
  | "cancelled"
  | "lost";

export type TaskRuntime = "subagent" | "acp" | "cli" | "cron";

export type TaskRecord = {
  taskId: string;
  runtime: TaskRuntime | string;
  sourceId?: string;
  ownerKey: string;
  scopeKind: string;
  childSessionKey?: string;
  parentFlowId?: string;
  parentTaskId?: string;
  agentId?: string;
  runId?: string;
  label?: string;
  task: string;
  status: TaskStatus | string;
  deliveryStatus: string;
  notifyPolicy: string;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  lastEventAt?: number;
  cleanupAfter?: number;
  error?: string;
  progressSummary?: string;
  terminalSummary?: string;
  terminalOutcome?: string;
  parentCronJobId?: string;
};

export type TaskFlowStatus =
  | "queued"
  | "running"
  | "waiting"
  | "blocked"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "lost";

export type TaskFlowRecord = {
  flowId: string;
  syncMode: string;
  ownerKey: string;
  controllerId?: string;
  revision: number;
  status: TaskFlowStatus | string;
  notifyPolicy: string;
  goal: string;
  currentStep?: string;
  blockedTaskId?: string;
  blockedSummary?: string;
  stateJson?: unknown;
  waitJson?: unknown;
  cancelRequestedAt?: number;
  createdAt: number;
  updatedAt: number;
  endedAt?: number;
  childTaskCount?: number;
};

export type CronJobSchedule = {
  kind: string;
  expr?: string;
  tz?: string;
};

export type CronJobState = {
  nextRunAtMs?: number;
  lastRunAtMs?: number;
  lastStatus?: string;
  lastDurationMs?: number;
  lastRunStatus?: string;
  lastDeliveryStatus?: string;
  consecutiveErrors?: number;
  lastError?: string;
};

export type CronJob = {
  id: string;
  agentId: string;
  name: string;
  enabled: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  schedule: CronJobSchedule;
  sessionTarget?: string;
  wakeMode?: string;
  payload?: unknown;
  state?: CronJobState;
  delivery?: unknown;
  recentRuns?: {
    taskId: string;
    status: string;
    createdAt: number;
    endedAt?: number;
  }[];
  successPct24h?: number;
  runs24h?: number;
};

export type Snapshot = {
  tasks: TaskRecord[];
  flows: TaskFlowRecord[];
  cronJobs: CronJob[];
  generatedAt: number;
};
