import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { baseStyles } from "../styles.ts";
import { fmtTime, fmtAge } from "../state.ts";
import type { CronJob } from "../client.ts";

@customElement("ops-cron-jobs")
export class OpsCronJobs extends LitElement {
  static styles = [
    baseStyles,
    css`
      .wrap {
        border: 1px solid var(--rule);
        background: var(--panel);
      }
      .head {
        display: grid;
        grid-template-columns: 24px 2fr 1.2fr 1fr 1fr 1fr 1.3fr 70px 70px;
        gap: 0;
        padding: 12px 16px;
        border-bottom: 1px solid var(--rule);
        font-size: 9px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--fg-dim);
      }
      .row {
        display: grid;
        grid-template-columns: 24px 2fr 1.2fr 1fr 1fr 1fr 1.3fr 70px 70px;
        gap: 0;
        padding: 14px 16px;
        border-bottom: 1px solid var(--rule);
        align-items: center;
        transition: background 0.1s;
        position: relative;
      }
      .row:last-child {
        border-bottom: 0;
      }
      .row:hover {
        background: rgba(255, 255, 255, 0.015);
      }
      .row.disabled {
        opacity: 0.45;
      }
      .row .idx {
        font-family: "Fraunces", serif;
        font-size: 13px;
        color: var(--fg-dimmer);
        font-variant-numeric: tabular-nums;
        font-style: italic;
      }
      .row .name {
        color: var(--cream);
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding-right: 12px;
      }
      .row .schedule {
        color: var(--fg-dim);
        font-size: 11px;
        font-variant-numeric: tabular-nums;
      }
      .row .schedule .tz {
        color: var(--fg-dimmer);
        margin-left: 6px;
      }
      .row .agent {
        color: var(--fg);
        font-size: 11px;
      }
      .row .ago,
      .row .next {
        font-size: 11px;
        color: var(--fg-dim);
        font-variant-numeric: tabular-nums;
      }
      .row .next {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .row .status {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      .row .status .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }
      .row .status.ok {
        color: var(--green);
      }
      .row .status.ok .dot {
        background: var(--green);
        box-shadow: 0 0 6px rgba(142, 192, 124, 0.5);
      }
      .row .status.err {
        color: var(--red);
      }
      .row .status.err .dot {
        background: var(--red);
        box-shadow: 0 0 6px rgba(224, 108, 94, 0.5);
      }
      .row .status.warn {
        color: var(--amber);
      }
      .row .status.warn .dot {
        background: var(--amber);
      }
      .row .status.muted {
        color: var(--fg-dimmer);
      }
      .row .status.muted .dot {
        background: var(--fg-dimmer);
      }
      .row .num {
        font-family: "Fraunces", serif;
        font-size: 15px;
        font-variant-numeric: tabular-nums;
        color: var(--cream);
        text-align: right;
      }
      .row .num.low {
        color: var(--red);
      }
      .row .num.mid {
        color: var(--amber);
      }
      .row .num.dim {
        color: var(--fg-dimmer);
      }
      .row.fail-streak::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 2px;
        background: var(--red);
      }
      .spark {
        display: inline-flex;
        gap: 2px;
        align-items: flex-end;
        height: 14px;
      }
      .spark span {
        width: 3px;
        background: currentColor;
      }
    `,
  ];

  @property({ attribute: false }) jobs: CronJob[] = [];

  private statusClass(j: CronJob): string {
    const s = j.state?.lastStatus;
    if (!s) return "muted";
    if ((j.state?.consecutiveErrors ?? 0) >= 3) return "err";
    if (s === "ok" || s === "succeeded") return "ok";
    if (s === "error" || s === "failed") return "err";
    return "warn";
  }

  private succeedClass(pct?: number): string {
    if (pct == null) return "dim";
    if (pct >= 90) return "";
    if (pct >= 50) return "mid";
    return "low";
  }

  private renderSpark(j: CronJob) {
    const runs = (j.recentRuns ?? []).slice(0, 10).reverse();
    if (!runs.length) return html`<span style="color:var(--fg-dimmer)">—</span>`;
    return html`
      <span class="spark">
        ${runs.map((r) => {
          const ok = r.status === "succeeded";
          const h = ok ? 10 : 14;
          const color = ok ? "var(--green)" : "var(--red)";
          return html`<span style="height:${h}px;background:${color}"></span>`;
        })}
      </span>
    `;
  }

  render() {
    return html`
      <div class="wrap">
        <div class="head">
          <span></span>
          <span>Job Name</span>
          <span>Schedule</span>
          <span>Agent</span>
          <span>Last Run</span>
          <span>Status</span>
          <span>Next</span>
          <span style="text-align:right">24h</span>
          <span style="text-align:right">OK%</span>
        </div>
        ${this.jobs.map(
          (j, i) => html`
            <div
              class="row ${j.enabled ? "" : "disabled"} ${(j.state
                ?.consecutiveErrors ?? 0) >= 3
                ? "fail-streak"
                : ""}"
            >
              <span class="idx">${String(i + 1).padStart(2, "0")}</span>
              <span class="name">${j.name}</span>
              <span class="schedule">
                ${j.schedule.kind === "cron" ? j.schedule.expr : j.schedule.kind}
                ${j.schedule.tz ? html`<span class="tz">${j.schedule.tz}</span>` : ""}
              </span>
              <span class="agent">${j.agentId}</span>
              <span class="ago">
                ${j.state?.lastRunAtMs
                  ? "T−" + fmtAge(j.state.lastRunAtMs)
                  : "—"}
              </span>
              <span class="status ${this.statusClass(j)}">
                <span class="dot"></span>
                ${(j.state?.consecutiveErrors ?? 0) >= 3
                  ? `err ×${j.state?.consecutiveErrors}`
                  : (j.state?.lastStatus ?? "idle")}
              </span>
              <span class="next">${fmtTime(j.state?.nextRunAtMs)}</span>
              <span class="num ${(j.runs24h ?? 0) === 0 ? "dim" : ""}">
                ${j.runs24h ?? 0}
              </span>
              <span class="num ${this.succeedClass(j.successPct24h)}">
                ${j.successPct24h != null ? j.successPct24h : "—"}
              </span>
            </div>
          `,
        )}
      </div>
    `;
  }
}
