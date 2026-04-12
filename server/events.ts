import { listTasks } from "./tasks.ts";
import { listTaskFlows } from "./taskflows.ts";
import { listCronJobs } from "./cron-jobs.ts";
import { config } from "./config.ts";
import type { Snapshot } from "./types.ts";

type Subscriber = (snapshot: Snapshot) => void;

let currentSnapshot: Snapshot = {
  tasks: [],
  flows: [],
  cronJobs: [],
  generatedAt: 0,
};
let currentHash = "";
const subscribers = new Set<Subscriber>();
let pollTimer: ReturnType<typeof setInterval> | null = null;

function buildSnapshot(): Snapshot {
  return {
    tasks: listTasks(),
    flows: listTaskFlows(),
    cronJobs: listCronJobs(),
    generatedAt: Date.now(),
  };
}

function hashSnapshot(s: Snapshot): string {
  const parts: string[] = [];
  for (const t of s.tasks) {
    parts.push(`T:${t.taskId}:${t.status}:${t.lastEventAt ?? t.createdAt}`);
  }
  for (const f of s.flows) {
    parts.push(`F:${f.flowId}:${f.status}:${f.updatedAt}:${f.revision}`);
  }
  for (const j of s.cronJobs) {
    parts.push(
      `C:${j.id}:${j.enabled}:${j.state?.lastRunAtMs ?? 0}:${j.state?.lastStatus ?? ""}:${j.state?.nextRunAtMs ?? 0}`,
    );
  }
  return parts.join("|");
}

function tick() {
  try {
    const next = buildSnapshot();
    const h = hashSnapshot(next);
    currentSnapshot = next;
    if (h !== currentHash) {
      currentHash = h;
      for (const sub of subscribers) {
        try {
          sub(next);
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    console.error("[opsdash] snapshot tick failed", err);
  }
}

export function startEventLoop(): void {
  if (pollTimer) return;
  tick();
  pollTimer = setInterval(tick, config.pollIntervalMs);
}

export function stopEventLoop(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function getSnapshot(): Snapshot {
  if (currentSnapshot.generatedAt === 0) {
    currentSnapshot = buildSnapshot();
    currentHash = hashSnapshot(currentSnapshot);
  }
  return currentSnapshot;
}

export function subscribe(fn: Subscriber): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
