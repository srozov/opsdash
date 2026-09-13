import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ExecutionNodeData } from "../../lib/dag-layout.ts";
import { NODE_HEIGHT, NODE_WIDTH } from "../../lib/dag-layout.ts";
import { StatusBadge } from "../ui/StatusBadge.tsx";

// Custom React Flow node = Archon's ExecutionDagNode: a status-accented card
// showing the task id, state, executor, and latest attempt/duration.
export function ExecutionDagNode({ data }: NodeProps) {
  const d = data as ExecutionNodeData;
  const color = `var(--state-${d.state})`;
  return (
    <div
      className={`flex flex-col gap-1.5 overflow-hidden rounded-lg border bg-surface-elevated px-3 py-2 ${
        d.isSelected ? "border-accent ring-1 ring-accent" : "border-border-bright"
      }`}
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT, borderLeft: `3px solid ${color}` }}
    >
      <Handle type="target" position={Position.Top} className="!bg-border-bright" />
      <div className="truncate text-sm font-semibold text-text-primary" title={d.taskId}>
        {d.taskId}
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge state={d.state} />
        <span className="truncate font-mono text-xs text-text-tertiary">{d.executor}</span>
      </div>
      {d.attempt !== null && (
        <div className="font-mono text-xs text-text-tertiary">
          #{d.attempt}
          {d.duration ? ` · ${d.duration}` : ""}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-border-bright" />
    </div>
  );
}
