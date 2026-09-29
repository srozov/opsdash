import { type ReactNode } from "react";
import { useTranscript } from "../../dagmar/DagmarProvider.tsx";
import type { Json, TranscriptRecord } from "../../dagmar-types.ts";
import { formatTime } from "../../format.ts";
import { groupTranscript, selectedConfig, type TranscriptItem } from "../../lib/transcript.ts";

const stringify = (v: unknown) => JSON.stringify(v, null, 2);
const isObject = (v: Json | undefined): v is { [k: string]: Json } =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: Json | undefined): string | null => (typeof v === "string" ? v : null);

function sessionUpdate(message: Json): { [k: string]: Json } | null {
  if (!isObject(message) || message.method !== "session/update") return null;
  const params = message.params;
  if (!isObject(params)) return null;
  const update = params.update;
  return isObject(update) ? update : null;
}

const tag = (label: string) => (
  <span className="mr-2 inline-block rounded border border-border px-1.5 font-mono text-[10px] uppercase text-text-tertiary">
    {label}
  </span>
);

const pre = (value: unknown) => (
  <pre className="mt-1 overflow-x-auto rounded border border-border bg-surface-inset p-2 font-mono text-[11px] whitespace-pre-wrap break-words">
    {stringify(value)}
  </pre>
);

function acpBody(message: Json): ReactNode {
  const update = sessionUpdate(message);
  if (update) {
    const kind = str(update.sessionUpdate);
    if (kind === "tool_call" || kind === "tool_call_update") {
      return (
        <div>
          {tag("tool")}
          <span className="font-mono text-accent">
            {str(update.title) ?? str(update.toolCallId) ?? "tool call"}
          </span>
          {update.status !== undefined && <span className="ml-2 text-text-tertiary">{str(update.status)}</span>}
          {pre(message)}
        </div>
      );
    }
  }
  return (
    <div>
      {tag("acp")}
      {isObject(message) && str(message.method) && (
        <span className="font-mono">{str(message.method)}</span>
      )}
      {pre(message)}
    </div>
  );
}

function recordBody(record: TranscriptRecord): ReactNode {
  if (record.type === "lifecycle") {
    return (
      <div>
        {tag("lifecycle")}
        <span className="font-mono">{record.event}</span>
        {record.data !== undefined && pre(record.data)}
      </div>
    );
  }
  if (record.type === "stdio") {
    return (
      <div>
        {tag(record.stream)}
        <pre className="mt-1 overflow-x-auto rounded border border-border bg-surface-inset p-2 font-mono text-[11px] whitespace-pre-wrap break-words">
          {record.data}
        </pre>
      </div>
    );
  }
  return acpBody(record.message);
}

const CHUNK_LABEL = { agent_message_chunk: "agent", user_message_chunk: "user", agent_thought_chunk: "thought" };

function itemBody(item: TranscriptItem): ReactNode {
  switch (item.kind) {
    case "record":
      return recordBody(item.records[0]);
    case "chunks":
      if (item.update === "agent_thought_chunk") {
        return (
          <details className="text-text-secondary">
            <summary className="cursor-pointer text-xs">thought</summary>
            <div className="whitespace-pre-wrap">{item.text}</div>
          </details>
        );
      }
      return (
        <div>
          {tag(CHUNK_LABEL[item.update])}
          <span className="whitespace-pre-wrap">{item.text}</span>
        </div>
      );
    case "prompt":
      // The contract and Dagmar's repair retry start collapsed; the human's revise turns are open.
      return (
        <details open={item.role === "reply"}>
          <summary className="cursor-pointer text-xs">
            {tag("prompt")}
            <span className="text-text-secondary">{item.role === "contract" ? "contract and inputs" : item.role}</span>
          </summary>
          <div className="mt-1 whitespace-pre-wrap">{item.text}</div>
        </details>
      );
    case "replay":
      return (
        <details className="text-text-secondary">
          <summary className="cursor-pointer text-xs">
            {tag("replay")}
            Loaded session <span className="font-mono">{item.sessionId ?? "?"}</span>: replayed {item.replayed}{" "}
            {item.replayed === 1 ? "record" : "records"}
            {!item.done && " (loading)"}
          </summary>
          <ol className="mt-1 border-l border-border pl-3">
            {item.items.map((inner, i) => (
              <li key={i} className="py-1">
                {itemBody(inner)}
              </li>
            ))}
          </ol>
        </details>
      );
  }
}

// Archon's log panel: the attempt transcript. Lifecycle rows, stdio log blocks,
// parsed ACP messages (session replay, merged chunks and prompts grouped), and a
// raw-JSON disclosure listing every record behind each row.
export function WorkflowLogs({ taskRunId }: { taskRunId: string | null }) {
  const { records, error } = useTranscript(taskRunId);

  if (!taskRunId) {
    return <p className="p-4 text-sm text-text-tertiary italic">Select a task to view its transcript.</p>;
  }
  const { model, mode } = selectedConfig(records);
  const items = groupTranscript(records);
  return (
    <div className="flex h-full flex-col">
      {error && <div className="border-b border-error/40 bg-error/10 px-3 py-2 text-xs text-error">{error}</div>}
      {(model || mode) && (
        <div className="border-b border-border px-3 py-1.5 font-mono text-[11px] text-text-secondary">
          {[model, mode].filter(Boolean).join(" · ")}
        </div>
      )}
      <ol className="flex-1 overflow-auto p-3 text-sm">
        {records.length === 0 && !error && (
          <li className="text-text-tertiary italic">No transcript records yet.</li>
        )}
        {/* Index keys: grouping only appends or extends the last item, so open/closed state survives live appends. */}
        {items.map((item, i) => (
          <li key={i} className="border-b border-border py-2 last:border-0">
            <div className="flex gap-2">
              <span className="shrink-0 font-mono text-[11px] text-text-tertiary">
                {formatTime(item.records[0].timestamp)}
              </span>
              <div className="min-w-0 flex-1">{itemBody(item)}</div>
            </div>
            <details className="mt-1 pl-[76px]">
              <summary className="cursor-pointer text-[11px] text-text-tertiary">
                raw{item.records.length > 1 && ` (${item.records.length} records)`}
              </summary>
              {pre(item.records.length === 1 ? item.records[0] : item.records)}
            </details>
          </li>
        ))}
      </ol>
    </div>
  );
}
