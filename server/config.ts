import { homedir } from "node:os";
import { join } from "node:path";

const home = homedir();

export const config = {
  host: "127.0.0.1",
  port: Number(process.env.OPSDASH_PORT ?? 7890),
  openclawDir: process.env.OPENCLAW_HOME ?? join(home, ".openclaw"),
  get runsSqlitePath() {
    return join(this.openclawDir, "tasks", "runs.sqlite");
  },
  get flowsSqlitePath() {
    return join(this.openclawDir, "tasks", "flows", "registry.sqlite");
  },
  get cronJobsJsonPath() {
    return join(this.openclawDir, "cron", "jobs.json");
  },
  pullMe: {
    waitingOlderThanMs: 4 * 60 * 60 * 1000,
    cronConsecutiveFailureThreshold: 3,
  },
  pollIntervalMs: 1000,
};
