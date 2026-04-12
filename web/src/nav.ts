import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { baseStyles } from "./styles.ts";
import type { Mode, LiveTab } from "./state.ts";

@customElement("ops-nav")
export class OpsNav extends LitElement {
  static styles = [
    baseStyles,
    css`
      :host {
        display: block;
      }
      .strip {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        padding: 18px 24px 14px;
        border-bottom: 1px solid var(--rule);
        gap: 32px;
        background:
          linear-gradient(180deg, rgba(255, 140, 26, 0.02) 0%, transparent 100%),
          var(--bg);
      }
      .brand {
        display: flex;
        align-items: baseline;
        gap: 14px;
      }
      .brand-mark {
        font-family: "Fraunces", serif;
        font-weight: 600;
        font-size: 28px;
        letter-spacing: -0.02em;
        color: var(--cream);
        font-variation-settings: "opsz" 144;
      }
      .brand-sub {
        font-size: 10px;
        letter-spacing: 0.22em;
        color: var(--fg-dim);
        text-transform: uppercase;
      }
      .brand-sub span.sep {
        color: var(--fg-dimmer);
        margin: 0 6px;
      }
      .clock {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 11px;
        letter-spacing: 0.08em;
        color: var(--fg-dim);
        justify-self: center;
      }
      .live-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--green);
        box-shadow: 0 0 8px rgba(142, 192, 124, 0.6);
        animation: pulse 1.8s ease-in-out infinite;
      }
      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.45;
          transform: scale(0.85);
        }
      }
      .clock .ts {
        color: var(--cream);
        font-variant-numeric: tabular-nums;
      }
      .modes {
        justify-self: end;
        display: flex;
        gap: 0;
        border: 1px solid var(--rule-strong);
      }
      .modes button {
        background: transparent;
        color: var(--fg-dim);
        border: 0;
        padding: 6px 14px;
        font: inherit;
        font-size: 10px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        cursor: pointer;
        border-right: 1px solid var(--rule-strong);
      }
      .modes button:last-child {
        border-right: 0;
      }
      .modes button.active {
        background: var(--fg);
        color: var(--bg);
      }
      .tabs {
        display: flex;
        padding: 0 24px;
        gap: 0;
        border-bottom: 1px solid var(--rule);
        background: var(--bg);
      }
      .tabs button {
        background: transparent;
        color: var(--fg-dim);
        border: 0;
        padding: 14px 22px 12px;
        font: inherit;
        font-size: 10px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        cursor: pointer;
        position: relative;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
      }
      .tabs button:hover {
        color: var(--fg);
      }
      .tabs button.active {
        color: var(--cream);
        border-bottom-color: var(--amber);
      }
      .tabs button .num {
        color: var(--fg-dimmer);
        margin-right: 8px;
        font-size: 9px;
      }
      .tabs button.active .num {
        color: var(--amber);
      }
    `,
  ];

  @property() mode: Mode = "live";
  @property() liveTab: LiveTab = "tasks";
  @state() private now = new Date();
  private timer?: ReturnType<typeof setInterval>;

  connectedCallback() {
    super.connectedCallback();
    this.timer = setInterval(() => (this.now = new Date()), 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.timer) clearInterval(this.timer);
  }

  private emit(name: string, detail: unknown) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  private tab(id: LiveTab, num: string, label: string) {
    return html`
      <button
        class=${this.liveTab === id ? "active" : ""}
        @click=${() => this.emit("live-tab", id)}
      >
        <span class="num">${num}</span>${label}
      </button>
    `;
  }

  private fmtTs() {
    const d = this.now;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
  }

  render() {
    return html`
      <div class="strip">
        <div class="brand">
          <span class="brand-mark">OpsDash</span>
        </div>
        <div class="clock">
          <span class="live-dot"></span>
          <span>LIVE</span>
          <span class="ts">${this.fmtTs()}</span>
        </div>
        <div class="modes">
          <button
            class=${this.mode === "live" ? "active" : ""}
            @click=${() => this.emit("mode", "live")}
          >
            Live
          </button>
          <button
            class=${this.mode === "config" ? "active" : ""}
            @click=${() => this.emit("mode", "config")}
          >
            Config
          </button>
        </div>
      </div>
      <div class="tabs">
        ${this.tab("tasks", "01", "Tasks")}
        ${this.tab("taskflows", "02", "TaskFlows")}
        ${this.tab("cron-jobs", "03", "Cron Jobs")}
        ${this.tab("heartbeat", "04", "Heartbeat")}
      </div>
    `;
  }
}
