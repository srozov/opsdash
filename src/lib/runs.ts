import type { RunStatus } from "../dagmar-types.ts";

export const RUN_STATUSES: RunStatus[] = [
  "running",
  "waiting",
  "blocked",
  "completed",
  "cancelled",
];

// Runs shown in "Active Workflows" vs the "History" table.
export const ACTIVE_STATUSES: RunStatus[] = ["running", "waiting", "blocked"];
export const HISTORY_STATUSES: RunStatus[] = ["completed", "cancelled"];

export type DateRange = "today" | "7d" | "30d" | "all";

export function rangeCutoff(range: DateRange): number {
  const now = Date.now();
  if (range === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (range === "7d") return now - 7 * 86_400_000;
  if (range === "30d") return now - 30 * 86_400_000;
  return 0;
}
