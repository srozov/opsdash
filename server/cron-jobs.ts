import { readFileSync, existsSync } from "node:fs";
import { openReadOnly } from "./db.ts";
import { config } from "./config.ts";
import type { CronJob } from "./types.ts";

type JobsFile = {
  version: number;
  jobs: CronJob[];
};

function loadJobsFile(): CronJob[] {
  if (!existsSync(config.cronJobsJsonPath)) return [];
  try {
    const raw = readFileSync(config.cronJobsJsonPath, "utf8");
    const parsed = JSON.parse(raw) as JobsFile;
    return parsed.jobs ?? [];
  } catch {
    return [];
  }
}

type RunRow = {
  task_id: string;
  status: string;
  created_at: number;
  ended_at: number | null;
  run_id: string | null;
};

function enrichWithRuns(jobs: CronJob[]): CronJob[] {
  const db = openReadOnly(config.runsSqlitePath);
  if (!db) return jobs;
  try {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return jobs.map((job) => {
      const runs = db
        .query<RunRow, [string]>(
          "SELECT task_id, status, created_at, ended_at, run_id FROM task_runs WHERE run_id LIKE ? ORDER BY created_at DESC LIMIT 50",
        )
        .all(`cron:${job.id}%`);
      const last24 = runs.filter((r) => r.created_at >= since);
      const terminal = last24.filter((r) =>
        ["succeeded", "failed", "timed_out", "cancelled", "lost"].includes(r.status),
      );
      const ok = terminal.filter((r) => r.status === "succeeded").length;
      return {
        ...job,
        recentRuns: runs.map((r) => ({
          taskId: r.task_id,
          status: r.status,
          createdAt: r.created_at,
          endedAt: r.ended_at ?? undefined,
        })),
        runs24h: last24.length,
        successPct24h: terminal.length ? Math.round((ok / terminal.length) * 100) : undefined,
      };
    });
  } finally {
    db.close();
  }
}

export function listCronJobs(): CronJob[] {
  return enrichWithRuns(loadJobsFile());
}

export function getCronJob(id: string): CronJob | null {
  const jobs = listCronJobs();
  return jobs.find((j) => j.id === id) ?? null;
}
