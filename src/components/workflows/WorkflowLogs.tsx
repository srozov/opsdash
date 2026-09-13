import { type ReactNode } from "react";
import { useTranscript } from "../../dagmar/DagmarProvider.tsx";
import type { Json, TranscriptRecord } from "../../dagmar-types.ts";
import { formatTime } from "../../format.ts";

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

function contentText(content: Json | undefined): string | null {
  if (content === undefined) return null;
  if (isObject(content) && content.type === "text") return str(content.text);
  if (Array.isArray(content)) {
    const text = content
      .map((c) => (isObject(c) && c.type === "text" ? str(c.text) : null))
      .filter((p): p is string => p !== null)
      .join("");
    return text || null;
  }
  return null;
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
    if (kind === "agent_message_chunk" || kind === "user_message_chunk") {
      return (
        <div>
          {tag(kind === "user_message_chunk" ? "user" : "agent")}
          <span>{contentText(update.content) ?? stringify(update.content)}</span>
        </div>
      );
    }
    if (kind === "agent_thought_chunk") {
      return (
        <details className="text-text-secondary">
          <summary className="cursor-pointer text-xs">thought</summary>
          <div>{contentText(update.content) ?? stringify(update.content)}</div>
        </details>
      );
    }
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

// Archon's log panel: the attempt transcript. Lifecycle rows, stdio log blocks,
// parsed ACP messages, and a raw-JSON disclosure per record.
export function WorkflowLogs({ taskRunId }: { taskRunId: string | null }) {
  const { records, error } = useTranscript(taskRunId);

  if (!taskRunId) {
    return <p className="p-4 text-sm text-text-tertiary italic">Select a task to view its transcript.</p>;
  }
  return (
    <div className="flex h-full flex-col">
      {error && <div className="border-b border-error/40 bg-error/10 px-3 py-2 text-xs text-error">{error}</div>}
      <ol className="flex-1 overflow-auto p-3 text-sm">
        {records.length === 0 && !error && (
          <li className="text-text-tertiary italic">No transcript records yet.</li>
        )}
        {records.map((record, i) => (
          <li key={i} className="border-b border-border py-2 last:border-0">
            <div className="flex gap-2">
              <span className="shrink-0 font-mono text-[11px] text-text-tertiary">
                {formatTime(record.timestamp)}
              </span>
              <div className="min-w-0 flex-1">{recordBody(record)}</div>
            </div>
            <details className="mt-1 pl-[76px]">
              <summary className="cursor-pointer text-[11px] text-text-tertiary">raw</summary>
              {pre(record)}
            </details>
          </li>
        ))}
      </ol>
    </div>
  );
}
