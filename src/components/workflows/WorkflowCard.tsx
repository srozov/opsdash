import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import type { Json, WorkflowSummary } from "../../dagmar-types.ts";
import { useDagmar } from "../../dagmar/DagmarProvider.tsx";
import { Button } from "../ui/Button.tsx";

// One workflow definition, mirroring Archon's WorkflowCard. Dagmar workflows are
// read-only YAML, so instead of an editor this offers a Start control with a
// JSON run-input box that calls run.start and opens the new run.
export function WorkflowCard({ wf }: { wf: WorkflowSummary }) {
  const { startRun, connected } = useDagmar();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("{}");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    let parsed: Json;
    try {
      parsed = JSON.parse(input) as Json;
    } catch {
      setError("Run input is not valid JSON");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await startRun(wf.id, parsed);
      setOpen(false);
      navigate(`/workflows/runs/${result.workflowRunId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "start failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-text-primary">{wf.id}</div>
          <div className="mt-0.5 text-xs text-text-secondary">
            {wf.taskCount} task{wf.taskCount === 1 ? "" : "s"}
          </div>
        </div>
        <Button variant="primary" disabled={!connected || busy} onClick={() => setOpen((o) => !o)}>
          <Play className="h-3 w-3" />
          Start
        </Button>
      </div>
      <div className="truncate font-mono text-xs text-text-tertiary" title={wf.file}>
        {wf.file}
      </div>
      {open && (
        <div className="flex flex-col gap-2">
          <label className="font-mono text-xs text-text-tertiary">run input (JSON)</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            spellCheck={false}
            className="rounded-md border border-border bg-surface-inset p-2 font-mono text-xs text-text-primary focus:border-accent focus:outline-none"
          />
          <div className="flex gap-2">
            <Button variant="primary" disabled={busy} onClick={start}>
              Start run
            </Button>
            <Button disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error && <div className="text-xs text-error">{error}</div>}
    </div>
  );
}
