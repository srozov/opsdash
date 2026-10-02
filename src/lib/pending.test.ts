import { describe, expect, test } from "bun:test";
import type { Interaction, RunSummary, RunView } from "../dagmar-types.ts";
import {
  gateDependencyResults,
  gateRequest,
  pendingForAttempt,
  runHumanInteractions,
  runPendingHints,
  runTitle,
  sortPendingFirst,
  turnMessage,
} from "./pending.ts";
import s1Run from "./__fixtures__/s1-run.json";

const METHOD: Record<Interaction["kind"], Interaction["method"]> = {
  gate: "gate/answer",
  turn: "turn/next",
  permission: "session/request_permission",
  input: "elicitation/create",
};

const ix = (
  id: string,
  kind: Interaction["kind"],
  workflowRunId: string,
  taskRunId: string,
  createdAt = "2026-09-29T00:00:00.000Z",
): Interaction => ({ id, workflowRunId, taskRunId, kind, method: METHOD[kind], request: {}, createdAt });

describe("pendingForAttempt", () => {
  const list = [ix("a", "gate", "r1", "t1"), ix("b", "turn", "r2", "t1")];
  test("matches run and latest attempt", () => {
    expect(pendingForAttempt(list, "r2", "t1")?.id).toBe("b");
  });
  test("an older attempt or no attempt shows nothing", () => {
    expect(pendingForAttempt(list, "r1", "t0")).toBe(undefined);
    expect(pendingForAttempt(list, "r1", undefined)).toBe(undefined);
  });
});

describe("runPendingHints", () => {
  test("lists each pending kind of the run once, ignoring other runs", () => {
    const list = [
      ix("a", "gate", "r1", "t1"),
      ix("b", "turn", "r1", "t2"),
      ix("c", "gate", "r1", "t3"),
      ix("d", "input", "r2", "t4"),
    ];
    expect(runPendingHints(list, "r1")).toEqual([
      { kind: "gate", text: "gate: decision needed" },
      { kind: "turn", text: "turn: reply needed" },
    ]);
    expect(runPendingHints(list, "r2")).toEqual([{ kind: "input", text: "input: answer needed" }]);
    expect(runPendingHints([ix("p", "permission", "r4", "t")], "r4")).toEqual([
      { kind: "permission", text: "permission: approval needed" },
    ]);
    expect(runPendingHints(list, "r3")).toEqual([]);
  });
});

describe("request parsing", () => {
  test("gate request with and without schema", () => {
    expect(gateRequest({ prompt: "ok?", schema: { type: "object" } })).toEqual({
      prompt: "ok?",
      schema: { type: "object" },
    });
    expect(gateRequest({ prompt: "ok?" })).toEqual({ prompt: "ok?" });
  });
  test("malformed requests are null, not guessed", () => {
    expect(gateRequest({ message: "x" })).toBe(null);
    expect(gateRequest("x")).toBe(null);
    expect(turnMessage({ prompt: "x" })).toBe(null);
    expect(turnMessage(null)).toBe(null);
  });
  test("turn message", () => {
    expect(turnMessage({ message: "line1\nline2" })).toBe("line1\nline2");
  });
});

const summary = (id: string): RunSummary => ({
  id,
  workflowId: "wf",
  status: "waiting",
  startedAt: "2026-09-29T00:00:00.000Z",
  updatedAt: "2026-09-29T00:00:00.000Z",
  endedAt: null,
});

describe("pending-run ordering", () => {
  test("runs with a pending gate/turn come first, order otherwise kept", () => {
    const runs = [summary("a"), summary("b"), summary("c"), summary("d")];
    const list = [ix("1", "turn", "c", "t"), ix("2", "gate", "b", "t"), ix("3", "permission", "a", "t")];
    expect(sortPendingFirst(runs, list).map((r) => r.id)).toEqual(["b", "c", "a", "d"]);
  });
  test("a run's gate/turn interactions are oldest first, other kinds excluded", () => {
    const list = [
      ix("late", "turn", "r1", "t", "2026-09-29T00:00:02.000Z"),
      ix("perm", "permission", "r1", "t"),
      ix("early", "gate", "r1", "t", "2026-09-29T00:00:01.000Z"),
    ];
    expect(runHumanInteractions(list, "r1").map((i) => i.id)).toEqual(["early", "late"]);
  });
});

describe("runTitle", () => {
  test("first non-empty line of input.task", () => {
    expect(runTitle({ task: "\n  add a greeting \nmore detail" }, "wf")).toBe("add a greeting");
  });
  test("long lines are truncated", () => {
    const t = runTitle({ task: "x".repeat(200) }, "wf");
    expect(t.length).toBe(80);
    expect(t.endsWith("…")).toBe(true);
  });
  test("falls back to the workflow id", () => {
    expect(runTitle(undefined, "wf")).toBe("wf");
    expect(runTitle({}, "wf")).toBe("wf");
    expect(runTitle({ task: 3 }, "wf")).toBe("wf");
    expect(runTitle({ task: "  \n " }, "wf")).toBe("wf");
    expect(runTitle("task", "wf")).toBe("wf");
  });
});

describe("gateDependencyResults", () => {
  const run = (): RunView => structuredClone(s1Run) as unknown as RunView;
  const gateAttempt = (r: RunView) => {
    const a = r.tasks.gate!.attempts.at(-1);
    if (!a) throw new Error("fixture has no gate attempt");
    return a.id;
  };
  test("lists each dependency's latest result; the review shows its verdict", () => {
    const r = run();
    const res = gateDependencyResults(r, gateAttempt(r));
    expect(res.map((d) => d.taskId)).toEqual(["review", "verify"]);
    const review = res[0]!;
    expect(review.headline).toBe("approve");
    expect(review.output).toEqual(r.tasks.review!.attempts[0]!.result!.output);
  });
  test("uses the latest attempt of a looped dependency, and the message without a verdict", () => {
    const r = run();
    const verify = r.tasks.verify!;
    expect(verify.attempts.length > 1).toBe(true);
    const last = verify.attempts.reduce((a, b) => (b.attempt > a.attempt ? b : a));
    verify.attempts.reverse();
    const res = gateDependencyResults(r, gateAttempt(r));
    const v = res.find((d) => d.taskId === "verify")!;
    expect(v.output).toEqual(last.result!.output);
    expect(v.headline).toBe(last.result!.message);
  });
  test("unknown attempt id gives nothing", () => {
    expect(gateDependencyResults(run(), "nope")).toEqual([]);
  });
});
