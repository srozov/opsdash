import { describe, expect, test } from "bun:test";
import type { Interaction } from "../dagmar-types.ts";
import { gateRequest, pendingForAttempt, runPendingHints, turnMessage } from "./pending.ts";

const ix = (id: string, kind: Interaction["kind"], workflowRunId: string, taskRunId: string): Interaction => ({
  id,
  workflowRunId,
  taskRunId,
  kind,
  method: "gate/answer",
  request: {},
  createdAt: "2026-09-29T00:00:00.000Z",
});

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
    expect(runPendingHints(list, "r1")).toEqual(["gate: decision needed", "turn: reply needed"]);
    expect(runPendingHints(list, "r2")).toEqual(["input needed"]);
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
