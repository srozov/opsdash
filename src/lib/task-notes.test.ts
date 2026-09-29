import { describe, expect, test } from "bun:test";
import type { RunTask, RunView, Workflow } from "../dagmar-types.ts";
import { exitBranchOf, stateNotes } from "./task-notes.ts";
import workflowJson from "./__fixtures__/s1-workflow.json";
import runJson from "./__fixtures__/s1-run.json";

const workflow = workflowJson as unknown as Workflow;
const run = runJson as unknown as RunView;
// Real S1 tasks. Dagmar records a guard skip as a skipped attempt, so skipped
// tasks keep their attempts; only ready/pending tasks are built here with none.
const fixtureTask = (id: string): RunTask => run.tasks[id]!;
const withState = (id: string, state: RunTask["state"]): RunTask => ({ ...fixtureTask(id), state, attempts: [] });

describe("exitBranchOf", () => {
  test("review, exhausted and gate are the exit branch of fixup → verify", () => {
    for (const id of ["review", "exhausted", "gate"]) {
      expect(exitBranchOf(workflow, id)).toEqual({ from: "fixup", to: "verify" });
    }
  });
  test("the loop source, target and others are not", () => {
    for (const id of ["implement", "verify", "fixup", "done", "revise"]) {
      expect(exitBranchOf(workflow, id)).toBe(null);
    }
  });
});

describe("stateNotes", () => {
  test("ready exit branch gets the settled note and the D4 note", () => {
    expect(stateNotes(workflow, "review", withState("review", "ready"))).toEqual([
      "Dependencies settled.",
      "Exit branch of loop `fixup → verify`: decided once the loop is final.",
    ]);
  });
  test("ready non-exit task has no D4 note and no slot text", () => {
    expect(stateNotes(workflow, "done", withState("done", "ready"))).toEqual(["Dependencies settled."]);
  });
  test("skipped task (with its skipped attempt) names the guard and its clauses", () => {
    expect(fixtureTask("exhausted").attempts[0]?.status).toBe("skipped");
    expect(stateNotes(workflow, "exhausted", fixtureTask("exhausted"))).toEqual([
      "`when` guard was false.",
      "$tasks.verify.output.passed = false",
    ]);
  });
  test("fixup, skipped after a completed attempt, still gets the guard note", () => {
    const fixup = fixtureTask("fixup");
    expect(fixup.attempts.map((a) => a.status)).toEqual(["completed", "skipped"]);
    expect(stateNotes(workflow, "fixup", fixup)).toEqual([
      "`when` guard was false.",
      "$tasks.verify.output.passed = false",
    ]);
  });
  test("skipped exit branch (exhausted) gets no D4 note", () => {
    expect(stateNotes(workflow, "exhausted", fixtureTask("exhausted"))).toHaveLength(2);
  });
  test("pending gate gets the D4 note", () => {
    expect(stateNotes(workflow, "gate", withState("gate", "pending")).at(-1)?.startsWith("Exit branch")).toBe(true);
  });
  test("unknown task throws", () => {
    expect(() => stateNotes(workflow, "nope", withState("gate", "ready"))).toThrow();
  });
});
