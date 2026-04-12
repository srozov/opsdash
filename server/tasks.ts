import { openReadOnly } from "./db.ts";
import { config } from "./config.ts";
import type { TaskRecord } from "./types.ts";

type Row = {
  task_id: string;
  runtime: string;
  source_id: string | null;
  owner_key: string;
  scope_kind: string;
  child_session_key: string | null;
  parent_flow_id: string | null;
  parent_task_id: string | null;
  agent_id: string | null;
  run_id: string | null;
  label: string | null;
  task: string;
  status: string;
  delivery_status: string;
  notify_policy: string;
  created_at: number;
  started_at: number | null;
  ended_at: number | null;
  last_event_at: number | null;
  cleanup_after: number | null;
  error: string | null;
  progress_summary: string | null;
  terminal_summary: string | null;
  terminal_outcome: string | null;
};

function toRecord(r: Row): TaskRecord {
  const parentCronJobId = r.run_id?.startsWith("cron:")
    ? r.run_id.slice(5).split(":")[0]
    : undefined;
  return {
    taskId: r.task_id,
    runtime: r.runtime,
    sourceId: r.source_id ?? undefined,
    ownerKey: r.owner_key,
    scopeKind: r.scope_kind,
    childSessionKey: r.child_session_key ?? undefined,
    parentFlowId: r.parent_flow_id ?? undefined,
    parentTaskId: r.parent_task_id ?? undefined,
    agentId: r.agent_id ?? undefined,
    runId: r.run_id ?? undefined,
    label: r.label ?? undefined,
    task: r.task,
    status: r.status,
    deliveryStatus: r.delivery_status,
    notifyPolicy: r.notify_policy,
    createdAt: r.created_at,
    startedAt: r.started_at ?? undefined,
    endedAt: r.ended_at ?? undefined,
    lastEventAt: r.last_event_at ?? undefined,
    cleanupAfter: r.cleanup_after ?? undefined,
    error: r.error ?? undefined,
    progressSummary: r.progress_summary ?? undefined,
    terminalSummary: r.terminal_summary ?? undefined,
    terminalOutcome: r.terminal_outcome ?? undefined,
    parentCronJobId,
  };
}

export function listTasks(): TaskRecord[] {
  const db = openReadOnly(config.runsSqlitePath);
  if (!db) return [];
  try {
    const rows = db
      .query<Row, []>("SELECT * FROM task_runs ORDER BY created_at DESC")
      .all();
    return rows.map(toRecord);
  } finally {
    db.close();
  }
}

export function getTask(taskId: string): TaskRecord | null {
  const db = openReadOnly(config.runsSqlitePath);
  if (!db) return null;
  try {
    const row = db
      .query<Row, [string]>("SELECT * FROM task_runs WHERE task_id = ?")
      .get(taskId);
    return row ? toRecord(row) : null;
  } finally {
    db.close();
  }
}
