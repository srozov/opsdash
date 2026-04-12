import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "../kanban/board.ts";
import { statusColors } from "../styles.ts";
import { fmtAge, fmtTime } from "../state.ts";
import type { TaskFlowRecord } from "../client.ts";

const FLOW_COLUMNS = [
  "queued",
  "running",
  "waiting",
  "blocked",
  "succeeded",
  "failed",
];

@customElement("ops-taskflows")
export class OpsTaskFlows extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ attribute: false }) flows: TaskFlowRecord[] = [];
  @state() private expanded = new Set<string>();

  private toggle(id: string, ev: Event) {
    ev.stopPropagation();
    const next = new Set(this.expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.expanded = next;
  }

  private renderCard(f: TaskFlowRecord) {
    const open = this.expanded.has(f.flowId);
    const color = statusColors[f.status] ?? "var(--fg-dim)";
    return html`
      <div
        class="ops-card ${open ? "open" : ""}"
        @click=${(ev: Event) => this.toggle(f.flowId, ev)}
      >
        <div class="ops-card-bar" style="background:${color}"></div>
        <div class="ops-card-head">
          <span class="ops-card-title">${f.goal}</span>
          ${f.blockedSummary ? html`<span class="ops-card-dot"></span>` : ""}
          <span class="ops-card-chev">›</span>
        </div>
        <div class="ops-card-meta">
          ${f.currentStep ? html`<span class="step">→ ${f.currentStep}</span>` : ""}
          ${f.childTaskCount != null ? html`<span>${f.childTaskCount} tasks</span>` : ""}
          <span class="age">T+${fmtAge(f.updatedAt)}</span>
        </div>
        ${open
          ? html`
              <div class="ops-card-body" @click=${(e: Event) => e.stopPropagation()}>
                ${f.blockedSummary
                  ? html`
                      <div class="section">
                        <div class="k">Blocked reason</div>
                        <div class="v err">⊘ ${f.blockedSummary}</div>
                      </div>
                    `
                  : ""}
                <dl class="kv">
                  <dt>flow id</dt>
                  <dd>${f.flowId}</dd>
                  <dt>status</dt>
                  <dd>${f.status}</dd>
                  <dt>created</dt>
                  <dd>${fmtTime(f.createdAt)}</dd>
                  <dt>updated</dt>
                  <dd>${fmtTime(f.updatedAt)}</dd>
                  ${f.endedAt
                    ? html`<dt>ended</dt>
                        <dd>${fmtTime(f.endedAt)}</dd>`
                    : ""}
                </dl>
              </div>
            `
          : ""}
      </div>
    `;
  }

  render() {
    if (!this.flows.length) {
      return html`
        <div class="ops-empty-panel">
          <div class="kicker">§ TaskFlows — Offline</div>
          <div class="head">nothing flowing yet.</div>
          <div class="sub">
            This console lights up once the conductor wires in. Until then,
            individual Tasks carry the signal and this panel stays dark by
            design.
          </div>
        </div>
      `;
    }
    return html`
      <ops-kanban
        .items=${this.flows.map((f) => ({ ...f, id: f.flowId }))}
        .columns=${FLOW_COLUMNS}
        .renderCard=${(f: TaskFlowRecord) => this.renderCard(f)}
      ></ops-kanban>
    `;
  }
}
