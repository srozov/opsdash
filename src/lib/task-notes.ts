import type { RunTask, TaskDef, Workflow } from "../dagmar-types.ts";

// Loop that `taskId` is the exit branch of, from the definition only (plan D4).
// Heuristic: Dagmar has no exit-branch concept, so this treats every direct
// dependent of the loop target except the loop source as one. That fits the
// example workflow (review, exhausted, gate) but would also match an unrelated
// task that merely depends on the target.
export function exitBranchOf(workflow: Workflow, taskId: string): { from: string; to: string } | null {
  for (const [from, def] of Object.entries(workflow.tasks)) {
    if (!def.loop) continue;
    const to = def.loop.to;
    if (taskId !== from && workflow.tasks[taskId]?.dependsOn.includes(to)) return { from, to };
  }
  return null;
}

export function clauseText(clause: NonNullable<TaskDef["when"]>[number]): string {
  const show = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));
  return clause.in !== undefined
    ? `${clause.ref} in [${clause.in.map(show).join(", ")}]`
    : `${clause.ref} = ${show(clause.equals ?? null)}`;
}

// Notes for a task with no attempt, replacing the old describeState guesses.
// Dagmar's state is shown as reported; only what the definition proves is added.
export function stateNotes(workflow: Workflow, taskId: string, task: RunTask): string[] {
  const def = workflow.tasks[taskId];
  if (!def) throw new Error(`Task ${taskId} is not in workflow ${workflow.id}`);
  const notes: string[] = [];
  switch (task.state) {
    case "pending":
      notes.push("Pending: waiting for a dependency to complete.");
      break;
    case "ready":
      notes.push("Dependencies settled.");
      break;
    case "skipped":
      notes.push("`when` guard was false.");
      for (const c of def.when ?? []) notes.push(clauseText(c));
      break;
    case "blocked_by_dependency":
      notes.push("Blocked by dependency: an upstream task did not complete.");
      break;
    case "blocked":
      notes.push("Blocked: the task cannot proceed.");
      break;
    case "cancelled":
      notes.push("Cancelled before any attempt started.");
      break;
    default:
      notes.push(`State: ${task.state} (no attempts recorded).`);
  }
  const loop = exitBranchOf(workflow, taskId);
  if (loop && (task.state === "pending" || task.state === "ready")) {
    notes.push(`Exit branch of loop \`${loop.from} → ${loop.to}\`: decided once the loop is final.`);
  }
  return notes;
}
