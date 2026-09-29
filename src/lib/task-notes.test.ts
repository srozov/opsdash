import { describe, expect, test } from "bun:test";
import type { RunTask, RunView, Workflow } from "../dagmar-types.ts";
import { exitBranchOf, stateNotes } from "./task-notes.ts";
import workflowJson from "./__fixtures__/s1-workflow.json";
import runJson from "./__fixtures__/s1-run.json";

const workflow = workflowJson as unknown as Workflow;
const run = runJson as unknown as RunView;
const withState = (id: string, state: RunTask["state"]): RunTask => ({ ...run.tasks[id]!, state, attempts: [] });

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
  test("skipped task names the guard and its clauses", () => {
    expect(stateNotes(workflow, "exhausted", withState("exhausted", "skipped"))).toEqual([
      "`when` guard was false.",
      "$tasks.verify.output.passed = false",
    ]);
  });
  test("skipped exit branch gets no D4 note", () => {
    expect(stateNotes(workflow, "gate", withState("gate", "skipped"))).toHaveLength(2);
  });
  test("pending gate gets the D4 note", () => {
    expect(stateNotes(workflow, "gate", withState("gate", "pending")).at(-1)?.startsWith("Exit branch")).toBe(true);
  });
  test("unknown task throws", () => {
    expect(() => stateNotes(workflow, "nope", withState("gate", "ready"))).toThrow();
  });
});
