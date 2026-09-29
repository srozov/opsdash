import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useDagmar, useWorkflow, withDagmarQuery } from "../dagmar/DagmarProvider.tsx";
import { WorkflowDagViewer } from "../components/workflows/WorkflowDagViewer.tsx";

// A workflow definition rendered as a graph with no run, so the shape of a
// workflow (guards, sessions, loops, gates) is visible before anything runs.
export function WorkflowDefinitionPage() {
  const { workflowId } = useParams();
  const { workflow, error } = useWorkflow(workflowId);
  const { executors, executorsError } = useDagmar();
  const [taskId, setTaskId] = useState<string | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <Link to={withDagmarQuery("/workflows")} className="text-text-tertiary hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-semibold text-text-primary">{workflowId}</span>
        <span className="font-mono text-xs text-text-tertiary">definition</span>
        {workflow && (
          <span className="ml-auto font-mono text-xs text-text-secondary">
            {Object.keys(workflow.tasks).length} tasks
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {workflow && executors ? (
          <WorkflowDagViewer
            workflow={workflow}
            run={null}
            executors={executors}
            interactions={[]}
            selectedTaskId={taskId}
            onSelect={setTaskId}
          />
        ) : (
          <div className="p-6 text-sm text-text-tertiary">{error ?? executorsError ?? "Loading…"}</div>
        )}
      </div>
    </div>
  );
}
