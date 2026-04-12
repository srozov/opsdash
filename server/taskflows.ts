import { openReadOnly } from "./db.ts";
import { config } from "./config.ts";
import type { TaskFlowRecord } from "./types.ts";

type Row = {
  flow_id: string;
  sync_mode: string | null;
  shape: string | null;
  owner_key: string;
  requester_origin_json: string | null;
  controller_id: string | null;
  revision: number | bigint | null;
  status: string;
  notify_policy: string;
  goal: string;
  current_step: string | null;
  blocked_task_id: string | null;
  blocked_summary: string | null;
  state_json: string | null;
  wait_json: string | null;
  cancel_requested_at: number | bigint | null;
  created_at: number | bigint;
  updated_at: number | bigint;
  ended_at: number | bigint | null;
};

function asNum(v: number | bigint | null | undefined): number | undefined {
  if (v == null) return undefined;
  return typeof v === "bigint" ? Number(v) : v;
}

function parseJson(raw: string | null): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function toRecord(r: Row, childCount: number): TaskFlowRecord {
  return {
    flowId: r.flow_id,
    syncMode:
      r.sync_mode === "task_mirrored" || r.sync_mode === "managed"
        ? r.sync_mode
        : r.shape === "single_task"
          ? "task_mirrored"
          : "managed",
    ownerKey: r.owner_key,
    controllerId: r.controller_id ?? undefined,
    revision: asNum(r.revision) ?? 0,
    status: r.status,
    notifyPolicy: r.notify_policy,
    goal: r.goal,
    currentStep: r.current_step ?? undefined,
    blockedTaskId: r.blocked_task_id ?? undefined,
    blockedSummary: r.blocked_summary ?? undefined,
    stateJson: parseJson(r.state_json),
    waitJson: parseJson(r.wait_json),
    cancelRequestedAt: asNum(r.cancel_requested_at),
    createdAt: asNum(r.created_at) ?? 0,
    updatedAt: asNum(r.updated_at) ?? 0,
    endedAt: asNum(r.ended_at),
    childTaskCount: childCount,
  };
}

export function listTaskFlows(): TaskFlowRecord[] {
  const db = openReadOnly(config.flowsSqlitePath);
  if (!db) return [];
  try {
    const tableExists = db
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='task_flows'",
      )
      .get();
    if (!tableExists) return [];
    const rows = db
      .query<Row, []>("SELECT * FROM task_flows ORDER BY updated_at DESC")
      .all();

    const runs = openReadOnly(config.runsSqlitePath);
    const counts = new Map<string, number>();
    if (runs) {
      try {
        const countRows = runs
          .query<{ parent_flow_id: string; c: number }, []>(
            "SELECT parent_flow_id, COUNT(*) as c FROM task_runs WHERE parent_flow_id IS NOT NULL GROUP BY parent_flow_id",
          )
          .all();
        for (const cr of countRows) counts.set(cr.parent_flow_id, cr.c);
      } finally {
        runs.close();
      }
    }
    return rows.map((r) => toRecord(r, counts.get(r.flow_id) ?? 0));
  } finally {
    db.close();
  }
}

export function getTaskFlow(flowId: string): TaskFlowRecord | null {
  const db = openReadOnly(config.flowsSqlitePath);
  if (!db) return null;
  try {
    const tableExists = db
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='task_flows'",
      )
      .get();
    if (!tableExists) return null;
    const row = db
      .query<Row, [string]>("SELECT * FROM task_flows WHERE flow_id = ?")
      .get(flowId);
    if (!row) return null;
    const runs = openReadOnly(config.runsSqlitePath);
    let count = 0;
    if (runs) {
      try {
        const cr = runs
          .query<{ c: number }, [string]>(
            "SELECT COUNT(*) as c FROM task_runs WHERE parent_flow_id = ?",
          )
          .get(flowId);
        count = cr?.c ?? 0;
      } finally {
        runs.close();
      }
    }
    return toRecord(row, count);
  } finally {
    db.close();
  }
}
