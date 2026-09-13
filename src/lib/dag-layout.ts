import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type { RunView, TaskState } from "../dagmar-types.ts";
import { formatDuration } from "../format.ts";

// Mirrors Archon's dag-layout: dagre rankdir TB, node 180x80, nodesep 40,
// ranksep 80. Positions come back centered, offset to top-left for React Flow.
export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 80;

export interface ExecutionNodeData {
  taskId: string;
  state: TaskState;
  executor: string;
  attempt: number | null;
  duration: string | null;
  isSelected: boolean;
  [key: string]: unknown;
}

export function runToFlow(
  run: RunView,
  selectedTaskId: string | null,
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", ranksep: 80, nodesep: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  const taskIds = Object.keys(run.tasks);
  for (const id of taskIds) g.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  for (const id of taskIds) {
    for (const dep of run.tasks[id]!.dependsOn) {
      if (run.tasks[dep]) g.setEdge(dep, id);
    }
  }
  dagre.layout(g);

  const nodes: Node[] = taskIds.map((id) => {
    const task = run.tasks[id]!;
    const pos = g.node(id);
    const latest = task.attempts[task.attempts.length - 1];
    const data: ExecutionNodeData = {
      taskId: id,
      state: task.state,
      executor: task.executor,
      attempt: latest?.attempt ?? null,
      duration: latest ? formatDuration(latest.startedAt, latest.endedAt) : null,
      isSelected: id === selectedTaskId,
    };
    return {
      id,
      type: "executionNode",
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    };
  });

  const edges: Edge[] = [];
  for (const id of taskIds) {
    for (const dep of run.tasks[id]!.dependsOn) {
      if (!run.tasks[dep]) continue;
      const targetState = run.tasks[id]!.state;
      edges.push({
        id: `${dep}->${id}`,
        source: dep,
        target: id,
        animated: targetState === "running",
        style: { stroke: `var(--state-${targetState})`, strokeWidth: 1.5 },
      });
    }
  }

  return { nodes, edges };
}
