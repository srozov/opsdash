export type Snapshot = {
  tasks: TaskRecord[];
  flows: TaskFlowRecord[];
  cronJobs: CronJob[];
  generatedAt: number;
};

export type TaskRecord = {
  taskId: string;
  runtime: string;
  agentId?: string;
  runId?: string;
  label?: string;
  task: string;
  status: string;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  lastEventAt?: number;
  error?: string;
  progressSummary?: string;
  terminalSummary?: string;
  parentFlowId?: string;
  parentCronJobId?: string;
};

export type TaskFlowRecord = {
  flowId: string;
  status: string;
  goal: string;
  currentStep?: string;
  blockedSummary?: string;
  createdAt: number;
  updatedAt: number;
  endedAt?: number;
  childTaskCount?: number;
};

export type CronJob = {
  id: string;
  agentId: string;
  name: string;
  enabled: boolean;
  schedule: { kind: string; expr?: string; tz?: string };
  state?: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: string;
    consecutiveErrors?: number;
    lastError?: string;
  };
  runs24h?: number;
  successPct24h?: number;
  recentRuns?: { taskId: string; status: string; createdAt: number }[];
};

export async function fetchSnapshot(): Promise<Snapshot> {
  const res = await fetch("/api/snapshot");
  if (!res.ok) throw new Error(`snapshot ${res.status}`);
  return res.json();
}

export function openEventStream(onSnapshot: (s: Snapshot) => void): () => void {
  const es = new EventSource("/api/events");
  es.addEventListener("snapshot", (ev) => {
    try {
      onSnapshot(JSON.parse((ev as MessageEvent).data));
    } catch {
      // ignore
    }
  });
  return () => es.close();
}
