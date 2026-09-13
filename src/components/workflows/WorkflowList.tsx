import { useDagmar } from "../../dagmar/DagmarProvider.tsx";
import { WorkflowCard } from "./WorkflowCard.tsx";

// Archon's WorkflowList, backed by Dagmar's workflow.list (workflows + errors).
export function WorkflowList() {
  const { workflows, workflowsError } = useDagmar();

  if (workflowsError) {
    return (
      <div className="rounded-md border border-error/50 bg-error/10 px-3 py-2 text-sm text-error">
        Workflow discovery failed: {workflowsError}
      </div>
    );
  }

  const wfs = workflows?.workflows ?? [];
  const errors = workflows?.errors ?? [];

  return (
    <div className="space-y-6">
      {errors.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-text-primary">Workflow errors</h2>
          {errors.map((e, i) => (
            <div key={i} className="rounded-md border border-error/40 bg-error/5 px-3 py-2 text-sm">
              <div className="font-mono text-error">{e.code}</div>
              <div className="text-text-secondary">{e.message}</div>
              <div className="font-mono text-xs text-text-tertiary">{e.file}</div>
            </div>
          ))}
        </div>
      )}
      {wfs.length === 0 ? (
        <p className="text-sm text-text-tertiary italic">No workflows discovered.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {wfs.map((w) => (
            <WorkflowCard key={w.id} wf={w} />
          ))}
        </div>
      )}
    </div>
  );
}
