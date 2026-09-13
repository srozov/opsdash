import { LitElement, html, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { DagmarClient } from "./dagmar-client.ts";
import type { Json, TranscriptReadResult, TranscriptRecord } from "./dagmar-types.ts";
import { formatTime } from "./format.ts";

// Loads and renders one attempt transcript. It owns its own record buffer and
// line cursor: a full read when the selected attempt (or the reload token)
// changes, and an incremental read after `tick` bumps in response to a matching
// transcript.appended event.
@customElement("attempt-transcript")
export class AttemptTranscript extends LitElement {
  @property({ attribute: false }) client!: DagmarClient;
  @property({ attribute: false }) taskRunId: string | null = null;
  // Bumped by the application on a matching transcript.appended event.
  @property({ attribute: false }) tick = 0;
  // Bumped by the application after a reconnect to force a fresh read.
  @property({ attribute: false }) reloadToken = 0;

  @state() private records: TranscriptRecord[] = [];
  @state() private error: string | null = null;
  private nextLine = 0;
  private generation = 0;
  private loading = false;

  protected createRenderRoot(): HTMLElement {
    return this;
  }

  protected willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("taskRunId") || changed.has("reloadToken")) {
      this.generation += 1;
      this.records = [];
      this.nextLine = 0;
      this.error = null;
      if (this.taskRunId) void this.load(this.generation, 0);
    } else if (changed.has("tick") && this.taskRunId && !this.loading) {
      void this.load(this.generation, this.nextLine);
    }
  }

  private async load(generation: number, afterLine: number): Promise<void> {
    const taskRunId = this.taskRunId;
    if (!taskRunId) return;
    this.loading = true;
    try {
      const result = await this.client.request<Json>("transcript.read", {
        taskRunId,
        afterLine,
      });
      // Ignore responses for a selection that has since changed.
      if (generation !== this.generation) return;
      const { records, nextLine } = result as unknown as TranscriptReadResult;
      this.records = afterLine === 0 ? records : [...this.records, ...records];
      this.nextLine = nextLine;
      this.error = null;
    } catch (error) {
      if (generation !== this.generation) return;
      this.error = error instanceof Error ? error.message : "Failed to read transcript";
    } finally {
      this.loading = false;
    }
  }

  protected render(): unknown {
    if (!this.taskRunId) {
      return html`<p class="empty">Select an attempt to view its transcript.</p>`;
    }
    return html`
      ${this.error ? html`<p class="panel-error">${this.error}</p>` : nothing}
      ${this.records.length === 0 && !this.error
        ? html`<p class="empty">No transcript records yet.</p>`
        : nothing}
      <ol class="transcript">
        ${this.records.map((record, index) => this.renderRecord(record, index))}
      </ol>
    `;
  }

  private renderRecord(record: TranscriptRecord, index: number): TemplateResult {
    return html`
      <li class="transcript-record">
        <div class="transcript-row">
          <span class="mono muted transcript-time">${formatTime(record.timestamp)}</span>
          <div class="transcript-body">${this.renderBody(record)}</div>
        </div>
        <details class="transcript-raw">
          <summary class="muted">raw</summary>
          <pre class="mono json">${stringify(record)}</pre>
        </details>
      </li>
    `;
  }

  private renderBody(record: TranscriptRecord): TemplateResult {
    if (record.type === "lifecycle") {
      return html`<div class="transcript-lifecycle">
        <span class="transcript-tag">lifecycle</span>
        <span class="mono">${record.event}</span>
        ${record.data !== undefined ? html`<pre class="mono json">${stringify(record.data)}</pre>` : nothing}
      </div>`;
    }
    if (record.type === "stdio") {
      return html`<div class="transcript-stdio">
        <span class="transcript-tag">${record.stream}</span>
        <pre class="mono log">${record.data}</pre>
      </div>`;
    }
    return this.renderAcp(record.message);
  }

  // Parse an ACP message payload defensively. The interesting cases are
  // session/update notifications, whose `update.sessionUpdate` distinguishes
  // agent messages, thoughts, and tool calls. Anything else falls back to JSON.
  private renderAcp(message: Json): TemplateResult {
    const update = sessionUpdate(message);
    if (update) {
      const kind = str(update.sessionUpdate);
      if (kind === "agent_message_chunk" || kind === "user_message_chunk") {
        const who = kind === "user_message_chunk" ? "user" : "agent";
        return html`<div class="transcript-message">
          <span class="transcript-tag">${who}</span>
          <span>${contentText(update.content) ?? stringify(update.content)}</span>
        </div>`;
      }
      if (kind === "agent_thought_chunk") {
        return html`<details class="transcript-thought">
          <summary class="muted">thought</summary>
          <div>${contentText(update.content) ?? stringify(update.content)}</div>
        </details>`;
      }
      if (kind === "tool_call" || kind === "tool_call_update") {
        return html`<div class="transcript-tool">
          <span class="transcript-tag">tool</span>
          <span class="mono">${str(update.title) ?? str(update.toolCallId) ?? "tool call"}</span>
          ${update.kind !== undefined ? html`<span class="muted mono">${str(update.kind)}</span>` : nothing}
          ${update.status !== undefined
            ? html`<span class="state-badge">${str(update.status)}</span>`
            : nothing}
          <pre class="mono json">${stringify(message)}</pre>
        </div>`;
      }
    }
    return html`<div class="transcript-acp">
      <span class="transcript-tag">acp</span>
      ${method(message) ? html`<span class="mono">${method(message)}</span>` : nothing}
      <pre class="mono json">${stringify(message)}</pre>
    </div>`;
  }
}

function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function isObject(value: Json | undefined): value is { [key: string]: Json } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: Json | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function method(message: Json): string | null {
  return isObject(message) ? str(message.method) : null;
}

// Extract params.update from a session/update notification, if present.
function sessionUpdate(message: Json): { [key: string]: Json } | null {
  if (!isObject(message) || message.method !== "session/update") return null;
  const params = message.params;
  if (!isObject(params)) return null;
  const update = params.update;
  return isObject(update) ? update : null;
}

// Pull display text from an ACP content block (or array of blocks).
function contentText(content: Json | undefined): string | null {
  if (content === undefined) return null;
  if (isObject(content) && content.type === "text") return str(content.text);
  if (Array.isArray(content)) {
    const parts = content.map((c) => (isObject(c) && c.type === "text" ? str(c.text) : null));
    const text = parts.filter((p): p is string => p !== null).join("");
    return text || null;
  }
  return null;
}

declare global {
  interface HTMLElementTagNameMap {
    "attempt-transcript": AttemptTranscript;
  }
}
