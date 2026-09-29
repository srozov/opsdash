import type { Json, TranscriptRecord } from "../dagmar-types.ts";

// Pure grouping of an attempt's transcript records for display. Every item
// lists the records it was built from, so the raw-JSON disclosure stays complete.

export type ChunkKind = "agent_message_chunk" | "agent_thought_chunk" | "user_message_chunk";

export type TranscriptItem =
  | { kind: "record"; records: [TranscriptRecord] }
  | { kind: "chunks"; update: ChunkKind; text: string; records: TranscriptRecord[] }
  // `contract` is the attempt's first prompt (contract and inputs); `repair` is Dagmar's
  // one retry after an invalid result; every other prompt is a human's `reply`.
  | { kind: "prompt"; text: string; role: "contract" | "reply" | "repair"; records: [TranscriptRecord] }
  // `records` holds the session/load request, the replayed records and the response
  // (absent while the load is still in flight); `replayed` counts only the middle.
  | {
      kind: "replay";
      sessionId: string | null;
      replayed: number;
      done: boolean;
      items: TranscriptItem[];
      records: TranscriptRecord[];
    };

const isObject = (v: Json | undefined): v is { [k: string]: Json } =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: Json | undefined): string | null => (typeof v === "string" ? v : null);

// Text of an ACP content block, or of an array of them; null when there is none.
export function contentText(content: Json | undefined): string | null {
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

function acpMessage(record: TranscriptRecord): { [k: string]: Json } | null {
  return record.type === "acp" && isObject(record.message) ? record.message : null;
}

function request(record: TranscriptRecord, method: string): { [k: string]: Json } | null {
  const message = acpMessage(record);
  if (!message || record.type !== "acp" || record.direction !== "to_executor") return null;
  if (message.method !== method) return null;
  return isObject(message.params) ? message.params : {};
}

function chunkOf(record: TranscriptRecord): { update: ChunkKind; text: string } | null {
  const message = acpMessage(record);
  if (!message || message.method !== "session/update" || !isObject(message.params)) return null;
  const update = message.params.update;
  if (!isObject(update)) return null;
  const kind = update.sessionUpdate;
  if (kind !== "agent_message_chunk" && kind !== "agent_thought_chunk" && kind !== "user_message_chunk") {
    return null;
  }
  const text = contentText(update.content);
  return text === null ? null : { update: kind, text };
}

function isResponseTo(record: TranscriptRecord, id: Json | undefined): boolean {
  const message = acpMessage(record);
  return (
    message !== null &&
    record.type === "acp" &&
    record.direction === "from_executor" &&
    message.method === undefined &&
    message.id === id
  );
}

// Adds a record as a generic row, or merges it into the previous chunk block.
function pushRecord(items: TranscriptItem[], record: TranscriptRecord): void {
  const chunk = chunkOf(record);
  const last = items[items.length - 1];
  if (chunk && last?.kind === "chunks" && last.update === chunk.update) {
    last.text += chunk.text;
    last.records.push(record);
  } else if (chunk) {
    items.push({ kind: "chunks", update: chunk.update, text: chunk.text, records: [record] });
  } else {
    items.push({ kind: "record", records: [record] });
  }
}

export function groupTranscript(records: TranscriptRecord[]): TranscriptItem[] {
  const items: TranscriptItem[] = [];
  let prompts = 0;
  for (let i = 0; i < records.length; i++) {
    const record = records[i]!;

    const load = request(record, "session/load");
    if (load) {
      const id = acpMessage(record)!.id;
      let end = i + 1;
      while (end < records.length && !isResponseTo(records[end]!, id)) end++;
      const done = end < records.length;
      const inner = records.slice(i + 1, end);
      const innerItems: TranscriptItem[] = [];
      for (const r of inner) pushRecord(innerItems, r);
      items.push({
        kind: "replay",
        sessionId: str(load.sessionId),
        replayed: inner.length,
        done,
        items: innerItems,
        records: records.slice(i, done ? end + 1 : end),
      });
      i = done ? end : end - 1;
      continue;
    }

    const prompt = request(record, "session/prompt");
    const text = prompt ? contentText(prompt.prompt) : null;
    if (text !== null) {
      const prev = records[i - 1];
      const repair = prev?.type === "lifecycle" && prev.event === "acp_result_repair";
      const role = prompts === 0 ? "contract" : repair ? "repair" : "reply";
      items.push({ kind: "prompt", text, role, records: [record] });
      prompts++;
      continue;
    }

    pushRecord(items, record);
  }
  return items;
}

// The model and mode Dagmar selected for the attempt, from the lifecycle events
// `acp_model_selected` / `acp_mode_selected` (data: `{model}` / `{mode}`).
export function selectedConfig(records: TranscriptRecord[]): { model: string | null; mode: string | null } {
  const pick = (event: string, key: string): string | null => {
    for (const r of records) {
      if (r.type === "lifecycle" && r.event === event && isObject(r.data)) return str(r.data[key]);
    }
    return null;
  };
  return { model: pick("acp_model_selected", "model"), mode: pick("acp_mode_selected", "mode") };
}
