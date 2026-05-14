import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("ops-file-statusbar")
export class OpsFileStatusbar extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: String }) path: string | null = null;
  @property({ type: String }) language: string | null = null;
  @property({ type: Number }) line = 1;
  @property({ type: Number }) column = 1;
  @property({ type: Boolean }) dirty = false;
  @property({ type: Number }) size = 0;

  private fmtSize(n: number): string {
    if (!n) return "0 B";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }

  render() {
    if (!this.path) {
      return html`
        <div class="ops-file-statusbar">
          <span class="seg dim">/</span>
          <span class="spacer"></span>
          <span class="seg dim">— NO FILE —</span>
        </div>
      `;
    }
    return html`
      <div class="ops-file-statusbar">
        <span class="seg path">~/${this.path}</span>
        ${this.dirty ? html`<span class="seg dirty">●</span>` : null}
        <span class="spacer"></span>
        <span class="seg dim">L${this.line}:C${this.column}</span>
        <span class="seg dim">UTF-8</span>
        <span class="seg lang">${(this.language ?? "PLAINTEXT").toUpperCase()}</span>
        <span class="seg dim">${this.fmtSize(this.size)}</span>
      </div>
    `;
  }
}
