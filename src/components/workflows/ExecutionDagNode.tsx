import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Bot, Hand, MessageSquare, Terminal } from "lucide-react";
import type { ExecutionNodeData, NodeKind } from "../../lib/dag-layout.ts";
import { NODE_HEIGHT, NODE_WIDTH } from "../../lib/dag-layout.ts";
import { StatusBadge } from "../ui/StatusBadge.tsx";

const KIND_ICON: Record<NodeKind, typeof Bot> = { agent: Bot, process: Terminal, gate: Hand };

// Custom React Flow node: a state-accented card showing the task id and kind
// icons, native state and executor profile, and latest attempt / attempt count /
// loop visits. Kind is shown by icon only; colour is reserved for state and for
// pending-interaction markers (the existing --state-<kind> tokens).
export function ExecutionDagNode({ data }: NodeProps) {
  const d = data as ExecutionNodeData;
  const color = d.state ? `var(--state-${d.state})` : "var(--color-border-bright)";
  const Icon = KIND_ICON[d.kind];
  const skipped = d.state === "skipped";
  const attemptLine =
    d.attempt === null
      ? null
      : [
          `#${d.attempt}`,
          d.duration,
          d.attemptCount > 1 ? `×${d.attemptCount}` : null,
          d.visits ? `visits ${d.visits.completed}/${d.visits.max}` : null,
        ]
          .filter((part) => part)
          .join(" · ");
  return (
    <div
      className={`relative flex flex-col gap-1 overflow-hidden rounded-lg border bg-surface-elevated px-3 py-2 ${
        d.isSelected ? "border-accent ring-1 ring-accent" : "border-border-bright"
      } ${skipped ? "border-dashed opacity-50" : ""}`}
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT, borderLeft: `3px solid ${color}` }}
    >
      <Handle type="target" position={Position.Top} className="!bg-border-bright" />
      <Handle id="loop-in" type="target" position={Position.Right} className="!bg-accent" />
      <div className="flex items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary" title={d.taskId}>
          {d.taskId}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-text-tertiary" title={d.kind}>
          {d.interactive && <MessageSquare className="h-3.5 w-3.5" aria-label="interactive" />}
          <Icon className="h-3.5 w-3.5" aria-label={d.kind} />
        </span>
      </div>
      <div className="flex items-center gap-2">
        {d.state ? (
          <StatusBadge state={d.state} />
        ) : (
          <span className="font-mono text-xs text-text-tertiary">definition</span>
        )}
        <span className="truncate font-mono text-xs text-text-tertiary">{d.executor}</span>
      </div>
      {attemptLine && <div className="truncate font-mono text-xs text-text-tertiary">{attemptLine}</div>}
      {d.pending && (
        <span
          className="absolute right-2 bottom-1.5 inline-flex animate-pulse items-center rounded-full px-2 py-0.5 font-mono text-[10px]"
          style={{
            color: `var(--state-${d.pending.kind})`,
            backgroundColor: `color-mix(in oklab, var(--state-${d.pending.kind}) 20%, transparent)`,
          }}
        >
          {d.pending.label}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-border-bright" />
      <Handle id="loop-out" type="source" position={Position.Right} className="!bg-accent" />
    </div>
  );
}
