import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { statusColors } from "../styles.ts";

type Item = {
  id: string;
  status: string;
};

@customElement("ops-kanban")
export class OpsKanban<T extends Item> extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ attribute: false }) items: T[] = [];
  @property({ attribute: false }) columns: string[] = [];
  @property({ attribute: false }) renderCard: (item: T) => unknown = () => html``;

  render() {
    const grouped = new Map<string, T[]>();
    for (const col of this.columns) grouped.set(col, []);
    for (const item of this.items) {
      const bucket = grouped.get(item.status);
      if (bucket) bucket.push(item);
    }
    return html`
      <div
        class="ops-kanban"
        style="--cols:${this.columns.length}"
      >
        ${this.columns.map(
          (col) => html`
            <div class="ops-col">
              <div class="ops-col-head">
                <span
                  class="ops-col-name"
                  style="color:${statusColors[col] ?? "var(--fg-dim)"}"
                >
                  <span class="ops-col-dot"></span>
                  ${col.replace("_", " ")}
                </span>
                <span class="ops-col-count">
                  ${String(grouped.get(col)?.length ?? 0).padStart(2, "0")}
                </span>
              </div>
              <div class="ops-col-items">
                ${(grouped.get(col) ?? []).length
                  ? (grouped.get(col) ?? []).map((it) => this.renderCard(it))
                  : html`<div class="ops-col-empty">— nil —</div>`}
              </div>
            </div>
          `,
        )}
      </div>
    `;
  }
}
