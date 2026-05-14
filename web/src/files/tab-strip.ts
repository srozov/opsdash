import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { basename } from "./client.ts";

export type OpenTab = {
  path: string;
  dirty: boolean;
};

@customElement("ops-file-tabs")
export class OpsFileTabs extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: Array }) tabs: OpenTab[] = [];
  @property({ type: String }) activePath: string | null = null;

  private select(path: string) {
    this.dispatchEvent(
      new CustomEvent("tab-select", { detail: { path }, bubbles: true, composed: true }),
    );
  }

  private close(path: string, ev: Event) {
    ev.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("tab-close", { detail: { path }, bubbles: true, composed: true }),
    );
  }

  render() {
    if (this.tabs.length === 0) {
      return html`
        <div class="ops-file-tabs ops-file-tabs-empty">
          <span class="kicker">└ NO FILES OPEN</span>
        </div>
      `;
    }
    return html`
      <div class="ops-file-tabs">
        ${this.tabs.map((t) => {
          const active = t.path === this.activePath;
          return html`
            <button
              class="ops-tab ${active ? "active" : ""} ${t.dirty ? "dirty" : ""}"
              title=${t.path}
              @click=${() => this.select(t.path)}
            >
              ${t.dirty ? html`<span class="dot">●</span>` : null}
              <span class="name">${basename(t.path)}</span>
              <span class="x" @click=${(e: Event) => this.close(t.path, e)}>×</span>
            </button>
          `;
        })}
      </div>
    `;
  }
}
