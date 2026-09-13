import { useNavigate } from "react-router-dom";
import type { RunSummary } from "../../dagmar-types.ts";
import { formatDuration, formatTime, shortId } from "../../format.ts";
import { StatusBadge } from "../ui/StatusBadge.tsx";

// Completed/cancelled runs, mirroring Archon's WorkflowHistoryTable.
export function WorkflowHistoryTable({ runs }: { runs: RunSummary[] }) {
  const navigate = useNavigate();
  if (runs.length === 0) {
    return <p className="px-1 py-6 text-sm text-text-tertiary italic">No runs in history.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-surface text-xs text-text-tertiary">
          <tr>
            <th className="px-3 py-2 font-medium">Workflow</th>
            <th className="px-3 py-2 font-medium">Run</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Started</th>
            <th className="px-3 py-2 font-medium">Ended</th>
            <th className="px-3 py-2 font-medium">Duration</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr
              key={run.id}
              className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-hover"
              onClick={() => navigate(`/workflows/runs/${run.id}`)}
            >
              <td className="px-3 py-2 text-text-primary">{run.workflowId}</td>
              <td className="px-3 py-2 font-mono text-xs text-text-secondary" title={run.id}>
                {shortId(run.id)}
              </td>
              <td className="px-3 py-2">
                <StatusBadge state={run.status} />
              </td>
              <td className="px-3 py-2 font-mono text-xs text-text-secondary">
                {formatTime(run.startedAt)}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-text-secondary">
                {run.endedAt ? formatTime(run.endedAt) : "—"}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-text-secondary">
                {formatDuration(run.startedAt, run.endedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
