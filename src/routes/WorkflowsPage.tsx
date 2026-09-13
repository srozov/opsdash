import { WorkflowList } from "../components/workflows/WorkflowList.tsx";

// Archon's Workflows tab. The "New Workflow"/builder action is dropped — Dagmar
// workflows are read-only YAML discovered on the daemon.
export function WorkflowsPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <h1 className="text-lg font-semibold text-text-primary">Workflows</h1>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <WorkflowList />
      </div>
    </div>
  );
}
