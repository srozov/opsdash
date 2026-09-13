import { useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import type { RunView } from "../../dagmar-types.ts";
import { runToFlow, type ExecutionNodeData } from "../../lib/dag-layout.ts";
import { ExecutionDagNode } from "./ExecutionDagNode.tsx";

const nodeTypes = { executionNode: ExecutionDagNode };
const minimapColor = (n: Node) => `var(--state-${(n.data as ExecutionNodeData).state})`;

// React Flow rendering of the run DAG (dagre TB layout), with pan/zoom/minimap —
// Archon's WorkflowDagViewer. Node/edge data is recomputed as the run updates.
export function WorkflowDagViewer({
  run,
  selectedTaskId,
  onSelect,
}: {
  run: RunView;
  selectedTaskId: string | null;
  onSelect: (taskId: string) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const flow = runToFlow(run, selectedTaskId);
    setNodes(flow.nodes);
    setEdges(flow.edges);
  }, [run, selectedTaskId, setNodes, setEdges]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => onSelect(node.id)}
      nodesDraggable={false}
      nodesConnectable={false}
      fitView
      minZoom={0.2}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="var(--color-border)" gap={20} />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor={minimapColor}
        nodeStrokeWidth={2}
        pannable
        zoomable
        maskColor="color-mix(in oklab, var(--color-background) 70%, transparent)"
        style={{ background: "var(--color-surface)" }}
      />
    </ReactFlow>
  );
}
