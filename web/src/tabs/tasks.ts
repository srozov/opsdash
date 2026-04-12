import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "../kanban/board.ts";
import { statusColors } from "../styles.ts";
import { fmtAge, fmtTime } from "../state.ts";
import type { TaskRecord } from "../client.ts";

const TASK_COLUMNS = ["queued", "running", "succeeded", "failed", "cancelled"];

@customElement("ops-tasks")
export class OpsTasks extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ attribute: false }) tasks: TaskRecord[] = [];
  @state() runtimeFilter = "";
  @state() agentFilter = "";
  @state() private expanded = new Set<string>();

  private toggle(id: string, ev: Event) {
    ev.stopPropagation();
    const next = new Set(this.expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.expanded = next;
  }

  private get filtered() {
    return this.tasks.filter(
      (t) =>
        (!this.runtimeFilter || t.runtime === this.runtimeFilter) &&
        (!this.agentFilter || t.agentId === this.agentFilter),
    );
  }

  private renderCard(t: TaskRecord) {
    const open = this.expanded.has(t.taskId);
    const title = t.label || t.task;
    const body = t.progressSummary || t.terminalSummary;
    const color = statusColors[t.status] ?? "var(--fg-dim)";
    return html`
      <div
        class="ops-card ${open ? "open" : ""}"
        @click=${(ev: Event) => this.toggle(t.taskId, ev)}
      >
        <div class="ops-card-bar" style="background:${color}"></div>
        <div class="ops-card-head">
          <span class="ops-card-title">${title}</span>
          ${t.error ? html`<span class="ops-card-dot" title="has error"></span>` : ""}
          <span class="ops-card-chev">›</span>
        </div>
        <div class="ops-card-meta">
          <span class="runtime">${t.runtime}</span>
          ${t.agentId ? html`<span class="agent">${t.agentId}</span>` : ""}
          <span class="age">T+${fmtAge(t.createdAt)}</span>
        </div>
        ${open
          ? html`
              <div class="ops-card-body" @click=${(e: Event) => e.stopPropagation()}>
                ${body
                  ? html`
                      <div class="section">
                        <div class="k">Summary</div>
                        <div class="v">${body}</div>
                      </div>
                    `
                  : ""}
                ${t.task && t.task !== title
                  ? html`
                      <div class="section">
                        <div class="k">Task</div>
                        <div class="v mono">${t.task}</div>
                      </div>
                    `
                  : ""}
                ${t.error
                  ? html`
                      <div class="section">
                        <div class="k">Error</div>
                        <div class="v err">${t.error}</div>
                      </div>
                    `
                  : ""}
                <dl class="kv">
                  <dt>task id</dt>
                  <dd>${t.taskId}</dd>
                  <dt>status</dt>
                  <dd>${t.status}</dd>
                  <dt>created</dt>
                  <dd>${fmtTime(t.createdAt)}</dd>
                  ${t.startedAt
                    ? html`<dt>started</dt>
                        <dd>${fmtTime(t.startedAt)}</dd>`
                    : ""}
                  ${t.endedAt
                    ? html`<dt>ended</dt>
                        <dd>${fmtTime(t.endedAt)}</dd>`
                    : ""}
                  ${t.runId
                    ? html`<dt>run id</dt>
                        <dd>${t.runId}</dd>`
                    : ""}
                  ${t.parentFlowId
                    ? html`<dt>flow</dt>
                        <dd>${t.parentFlowId}</dd>`
                    : ""}
                  ${t.parentCronJobId
                    ? html`<dt>cron job</dt>
                        <dd>${t.parentCronJobId}</dd>`
                    : ""}
                </dl>
              </div>
            `
          : ""}
      </div>
    `;
  }

  render() {
    const runtimes = [...new Set(this.tasks.map((t) => t.runtime))].sort();
    const agents = [
      ...new Set(this.tasks.map((t) => t.agentId).filter(Boolean)),
    ].sort() as string[];
    return html`
      <div class="ops-filters">
        <div class="ops-filter-group">
          <label>Runtime</label>
          <select
            @change=${(e: Event) => (this.runtimeFilter = (e.target as HTMLSelectElement).value)}
          >
            <option value="">all</option>
            ${runtimes.map((r) => html`<option value=${r}>${r}</option>`)}
          </select>
        </div>
        <div class="ops-filter-group">
          <label>Agent</label>
          <select
            @change=${(e: Event) => (this.agentFilter = (e.target as HTMLSelectElement).value)}
          >
            <option value="">all</option>
            ${agents.map((a) => html`<option value=${a}>${a}</option>`)}
          </select>
        </div>
        <div class="ops-filter-summary">
          Showing <span>${this.filtered.length}</span>
        </div>
      </div>
      <ops-kanban
        .items=${this.filtered.map((t) => ({ ...t, id: t.taskId }))}
        .columns=${TASK_COLUMNS}
        .renderCard=${(t: TaskRecord) => this.renderCard(t)}
      ></ops-kanban>
    `;
  }
}
