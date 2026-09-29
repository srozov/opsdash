import { useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import type { ExecutorSummary, Interaction, RunView, Workflow } from "../../dagmar-types.ts";
import { buildFlow, type ExecutionNodeData } from "../../lib/dag-layout.ts";
import { ExecutionDagNode } from "./ExecutionDagNode.tsx";

const nodeTypes = { executionNode: ExecutionDagNode };
const minimapColor = (n: Node) => {
  const state = (n.data as ExecutionNodeData).state;
  return state ? `var(--state-${state})` : "var(--color-border-bright)";
};

// Corner legend for the four edge styles.
function Legend() {
  const swatch = (style: string) => <span className={`inline-block w-6 border-t-2 ${style}`} />;
  return (
    <Panel position="top-left" className="flex flex-col gap-1 rounded-md border border-border bg-surface/90 px-2.5 py-2 text-xs text-text-secondary">
      <div className="flex items-center gap-2">{swatch("border-border-bright")}dependency</div>
      <div className="flex items-center gap-2">{swatch("border-border-bright")}<span className="font-mono">x = v</span> guard</div>
      <div className="flex items-center gap-2">{swatch("border-dashed border-border-bright")}session continued</div>
      <div className="flex items-center gap-2">{swatch("border-accent")}loop back-edge</div>
    </Panel>
  );
}

// React Flow rendering of the workflow definition (dagre TB layout), with
// pan/zoom/minimap. `run` is null on the definition page; otherwise it overlays
// Dagmar's state and attempts, recomputed as the run updates.
export function WorkflowDagViewer({
  workflow,
  run,
  executors,
  interactions,
  selectedTaskId,
  onSelect,
}: {
  workflow: Workflow;
  run: RunView | null;
  executors: ExecutorSummary[];
  interactions: Interaction[];
  selectedTaskId: string | null;
  onSelect: (taskId: string) => void;
}) {
  const [buildError, setBuildError] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    try {
      const flow = buildFlow(workflow, run, executors, interactions, selectedTaskId);
      setNodes(flow.nodes);
      setEdges(flow.edges);
      setBuildError(null);
    } catch (e) {
      setBuildError(e instanceof Error ? e.message : "could not build the graph");
    }
  }, [workflow, run, executors, interactions, selectedTaskId, setNodes, setEdges]);

  if (buildError) {
    return (
      <div role="alert" className="m-4 rounded border border-error/40 bg-error/10 p-3 text-sm text-error">
        {buildError}
      </div>
    );
  }

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
      <Legend />
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
