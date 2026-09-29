import { describe, expect, test } from "bun:test";
import type { Edge } from "@xyflow/react";
import type { ExecutorSummary, Interaction, RunView, Workflow } from "../dagmar-types.ts";
import { buildFlow, type ExecutionNodeData, type FlowEdgeData } from "./dag-layout.ts";
import workflowJson from "./__fixtures__/s1-workflow.json";
import runJson from "./__fixtures__/s1-run.json";
import executorsJson from "./__fixtures__/s1-executors.json";

// Captured from the T6 verification fixture (dev/t6-fixture), scenario S1:
// one failing verify, then approve at the gate.
const workflow = workflowJson as unknown as Workflow;
const run = runJson as unknown as RunView;
const executors = executorsJson as ExecutorSummary[];

const edgeData = (e: Edge) => e.data as FlowEdgeData;
const dataOf = (nodes: ReturnType<typeof buildFlow>["nodes"], id: string) =>
  nodes.find((n) => n.id === id)!.data as ExecutionNodeData;

describe("buildFlow: definition only", () => {
  const { nodes, edges } = buildFlow(workflow, null, executors, [], null);
  const deps = edges.filter((e) => !edgeData(e).loop);

  test("one node per task, 12 dependency edges, 1 loop edge", () => {
    expect(nodes).toHaveLength(8);
    expect(deps).toHaveLength(12);
    expect(edges.filter((e) => edgeData(e).loop)).toHaveLength(1);
  });

  test("6 guard labels", () => {
    expect(deps.filter((e) => edgeData(e).guard !== null)).toHaveLength(6);
    expect(edges.find((e) => e.id === "verify->fixup")!.label).toBe("passed = false");
    expect(edges.find((e) => e.id === "gate->done")!.label).toBe("decision = approve");
    expect(edges.find((e) => e.id === "gate->revise")!.label).toBe("decision = revise");
  });

  test("3 dashed session edges, each the same edge as a dependency", () => {
    const sessions = deps.filter((e) => edgeData(e).session).map((e) => e.id).sort();
    expect(sessions).toEqual(["implement->fixup", "implement->review", "implement->revise"]);
    for (const e of deps) {
      expect(e.style?.strokeDasharray === undefined).toBe(!edgeData(e).session);
    }
  });

  test("loop edge runs from the loop source to loop.to on the right-hand handles", () => {
    const loop = edges.find((e) => edgeData(e).loop)!;
    expect(loop.source).toBe("fixup");
    expect(loop.target).toBe("verify");
    expect(loop.sourceHandle).toBe("loop-out");
    expect(loop.targetHandle).toBe("loop-in");
    expect(loop.label).toBe("loop ≤ 3");
  });

  test("only the loop source and target carry loop handles", () => {
    const withLoop = nodes.filter((n) => dataOf(nodes, n.id).loopSource || dataOf(nodes, n.id).loopTarget);
    expect(withLoop.map((n) => n.id).sort()).toEqual(["fixup", "verify"]);
    expect(dataOf(nodes, "fixup").loopSource).toBe(true);
    expect(dataOf(nodes, "fixup").loopTarget).toBe(false);
    expect(dataOf(nodes, "verify").loopTarget).toBe(true);
    expect(dataOf(nodes, "verify").loopSource).toBe(false);
  });

  test("node kinds and no run overlay", () => {
    expect(dataOf(nodes, "implement").kind).toBe("agent");
    expect(dataOf(nodes, "verify").kind).toBe("process");
    expect(dataOf(nodes, "gate").kind).toBe("gate");
    expect(dataOf(nodes, "revise").interactive).toBe(true);
    expect(dataOf(nodes, "implement").interactive).toBe(false);
    expect(dataOf(nodes, "verify").state).toBe(null);
    expect(dataOf(nodes, "verify").attempt).toBe(null);
  });
});

describe("buildFlow: completed S1 run", () => {
  const { nodes, edges } = buildFlow(workflow, run, executors, [], "verify");

  test("overlays native state, attempt counts and loop visits", () => {
    expect(dataOf(nodes, "verify").state).toBe("completed");
    expect(dataOf(nodes, "verify").attemptCount).toBe(2);
    expect(dataOf(nodes, "fixup").state).toBe("skipped");
    expect(dataOf(nodes, "fixup").attemptCount).toBe(2);
    expect(dataOf(nodes, "fixup").visits).toEqual({ completed: 1, max: 3 });
    expect(dataOf(nodes, "verify").visits).toBe(null);
    expect(dataOf(nodes, "exhausted").state).toBe("skipped");
    expect(dataOf(nodes, "verify").isSelected).toBe(true);
    expect(dataOf(nodes, "gate").isSelected).toBe(false);
  });

  test("edges into a skipped target are dimmed", () => {
    expect(edges.find((e) => e.id === "verify->exhausted")!.style?.opacity).toBe(0.4);
    expect(edges.find((e) => e.id === "verify->review")!.style?.opacity).toBe(1);
  });
});

describe("buildFlow: pending interaction and errors", () => {
  test("marks the task whose latest attempt has a pending interaction", () => {
    const gateAttempt = run.tasks.gate!.attempts.at(-1)!;
    const interaction: Interaction = {
      id: "ix_1",
      workflowRunId: run.id,
      taskRunId: gateAttempt.id,
      kind: "gate",
      method: "gate/answer",
      request: { prompt: "?" },
      createdAt: "2026-09-29T00:00:00.000Z",
    };
    const { nodes } = buildFlow(workflow, run, executors, [interaction], null);
    expect(dataOf(nodes, "gate").pending).toEqual({ kind: "gate", label: "decision" });
    expect(dataOf(nodes, "verify").pending).toBe(null);
  });

  test("an executor profile missing from executor.list is an error", () => {
    expect(() => buildFlow(workflow, null, [], [], null)).toThrow("not in executor.list");
  });
});
