import type { RunView } from "../../dagmar-types.ts";
import { StatusBadge } from "../ui/StatusBadge.tsx";

// Sidebar list of a run's tasks (Archon's DagNodeProgress), used in the Logs view.
export function DagNodeProgress({
  run,
  selectedTaskId,
  onSelect,
}: {
  run: RunView;
  selectedTaskId: string | null;
  onSelect: (taskId: string) => void;
}) {
  return (
    <ul className="divide-y divide-border">
      {Object.keys(run.tasks).map((id) => (
        <li key={id}>
          <button
            onClick={() => onSelect(id)}
            className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
              id === selectedTaskId ? "bg-surface-elevated" : "hover:bg-surface-hover"
            }`}
          >
            <span className="truncate text-text-primary" title={id}>
              {id}
            </span>
            <StatusBadge state={run.tasks[id]!.state} />
          </button>
        </li>
      ))}
    </ul>
  );
}
