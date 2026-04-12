import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { baseStyles } from "./styles.ts";
import type { Snapshot } from "./client.ts";

const WAITING_OLDER_THAN_MS = 4 * 60 * 60 * 1000;

@customElement("ops-pull-me")
export class OpsPullMe extends LitElement {
  static styles = [
    baseStyles,
    css`
      .strip {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        border-bottom: 1px solid var(--rule);
        background: var(--bg);
      }
      .cell {
        padding: 10px 20px;
        border-right: 1px solid var(--rule);
        display: flex;
        flex-direction: column;
        gap: 2px;
        position: relative;
      }
      .cell:last-child {
        border-right: 0;
      }
      .cell .k {
        font-size: 9px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--fg-dim);
      }
      .cell .v {
        display: flex;
        align-items: baseline;
        gap: 8px;
        font-variant-numeric: tabular-nums;
      }
      .cell .num {
        font-family: "Fraunces", serif;
        font-size: 28px;
        font-weight: 600;
        line-height: 1;
        color: var(--fg-dimmer);
      }
      .cell .unit {
        font-size: 10px;
        color: var(--fg-dim);
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .cell.hot .num {
        color: var(--red);
      }
      .cell.hot {
        background: linear-gradient(
          180deg,
          rgba(224, 108, 94, 0.08) 0%,
          transparent 100%
        );
      }
      .cell.hot::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 2px;
        background: var(--red);
        animation: hot-pulse 1.2s ease-in-out infinite;
      }
      .cell.warn .num {
        color: var(--amber);
      }
      @keyframes hot-pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.35;
        }
      }
    `,
  ];

  @property({ attribute: false }) snapshot: Snapshot = {
    tasks: [],
    flows: [],
    cronJobs: [],
    generatedAt: 0,
  };

  private counts() {
    const blocked = this.snapshot.flows.filter((f) => f.status === "blocked").length;
    const failed = this.snapshot.tasks.filter((t) =>
      ["failed", "timed_out", "lost"].includes(t.status),
    ).length;
    const now = Date.now();
    const stuckWaiting = this.snapshot.flows.filter(
      (f) => f.status === "waiting" && now - f.updatedAt > WAITING_OLDER_THAN_MS,
    ).length;
    const cronFailing = this.snapshot.cronJobs.filter(
      (j) => (j.state?.consecutiveErrors ?? 0) >= 3,
    ).length;
    return { blocked, failed, stuckWaiting, cronFailing };
  }

  private cell(label: string, n: number, unit: string, tone: "hot" | "warn" | "") {
    const klass = n > 0 ? tone : "";
    return html`
      <div class="cell ${klass}">
        <span class="k">${label}</span>
        <span class="v">
          <span class="num">${String(n).padStart(2, "0")}</span>
          <span class="unit">${unit}</span>
        </span>
      </div>
    `;
  }

  render() {
    const { blocked, failed, stuckWaiting, cronFailing } = this.counts();
    return html`
      <div class="strip">
        ${this.cell("flows blocked", blocked, "flows", "hot")}
        ${this.cell("tasks failed", failed, "runs", "hot")}
        ${this.cell("waiting stuck", stuckWaiting, ">4h", "warn")}
        ${this.cell("cron ≥3 fails", cronFailing, "jobs", "hot")}
      </div>
    `;
  }
}
