import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { OpsState } from "./state.ts";
import "./nav.ts";
import "./pull-me.ts";
import "./tabs/tasks.ts";
import "./tabs/taskflows.ts";
import "./tabs/cron-jobs.ts";

@customElement("ops-dash")
export class OpsDash extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  private state = new OpsState(this);

  private sectionHead(num: string, title: string, hint: string) {
    return html`
      <div class="section-head">
        <span class="num">${num}</span>
        <span class="title">${title}</span>
        <span class="rule"></span>
        <span class="hint">${hint}</span>
      </div>
    `;
  }

  private renderActive() {
    if (this.state.mode === "config") {
      return html`
        ${this.sectionHead("§", "config mode", "standing orders · hooks · webhooks")}
        <div class="placeholder">
          <div class="kicker">§ Queued for M2</div>
          <div class="head">Config console coming online.</div>
        </div>
      `;
    }
    const tab = this.state.liveTab;
    if (tab === "tasks") {
      return html`
        ${this.sectionHead(
          "01",
          "tasks",
          `${this.state.snapshot.tasks.length} rows · runs.sqlite`,
        )}
        <ops-tasks .tasks=${this.state.snapshot.tasks}></ops-tasks>
      `;
    }
    if (tab === "taskflows") {
      return html`
        ${this.sectionHead(
          "02",
          "taskflows",
          `${this.state.snapshot.flows.length} flows · flows/registry.sqlite`,
        )}
        <ops-taskflows .flows=${this.state.snapshot.flows}></ops-taskflows>
      `;
    }
    if (tab === "cron-jobs") {
      return html`
        ${this.sectionHead(
          "03",
          "cron jobs",
          `${this.state.snapshot.cronJobs.length} schedules · jobs.json`,
        )}
        <ops-cron-jobs .jobs=${this.state.snapshot.cronJobs}></ops-cron-jobs>
      `;
    }
    return html`
      ${this.sectionHead("04", "heartbeat", "queued for M2")}
      <div class="placeholder">
        <div class="kicker">§ Queued for M2</div>
        <div class="head">Heartbeat telemetry coming online.</div>
      </div>
    `;
  }

  render() {
    if (this.state.error) {
      return html`<div class="ops-error">⊘ failed to load: ${this.state.error}</div>`;
    }
    const snap = this.state.snapshot;
    const ts = snap.generatedAt ? new Date(snap.generatedAt).toLocaleTimeString() : "—";
    return html`
      <ops-nav
        .mode=${this.state.mode}
        .liveTab=${this.state.liveTab}
        @mode=${(e: CustomEvent) => this.state.setMode(e.detail)}
        @live-tab=${(e: CustomEvent) => this.state.setLiveTab(e.detail)}
      ></ops-nav>
      <ops-pull-me .snapshot=${this.state.snapshot}></ops-pull-me>
      <main class="ops-main">${this.renderActive()}</main>
      <div class="ops-footer">
        <div class="stat">snapshot · <span>${ts}</span></div>
        <div class="stat">
          t:<span>${snap.tasks.length}</span> f:<span>${snap.flows.length}</span>
          c:<span>${snap.cronJobs.length}</span>
        </div>
        <div>opsdash · m1 · 127.0.0.1:7890</div>
      </div>
    `;
  }
}
