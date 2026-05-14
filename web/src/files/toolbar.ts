import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("ops-file-toolbar")
export class OpsFileToolbar extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: Boolean }) dirty = false;
  @property({ type: Boolean }) hasFile = false;
  @property({ type: Boolean }) previewVisible = false;
  @property({ type: Boolean }) canPreview = false;
  @property({ type: String }) saveStatus: "idle" | "saving" | "saved" | "error" = "idle";
  @property({ type: String }) saveError: string | null = null;

  private emit(name: string) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="ops-file-toolbar brk">
        <div class="left">
          <button
            class="btn ${this.dirty ? "dirty" : ""}"
            ?disabled=${!this.hasFile || !this.dirty}
            @click=${() => this.emit("save")}
            title="Save (⌘/Ctrl+S)"
          >
            ${this.dirty ? html`<span class="dirty-dot"></span>` : null}
            <span>SAVE</span>
          </button>
          <button
            class="btn"
            ?disabled=${!this.hasFile || !this.dirty}
            @click=${() => this.emit("revert")}
            title="Discard unsaved changes"
          >
            <span>REVERT</span>
          </button>
        </div>
        <div class="right">
          ${this.saveStatus === "saving"
            ? html`<span class="status status-saving">·· saving</span>`
            : this.saveStatus === "saved"
              ? html`<span class="status status-saved">✓ saved</span>`
              : this.saveStatus === "error"
                ? html`<span class="status status-error">⊘ ${this.saveError ?? "save failed"}</span>`
                : null}
          <span class="preview-label">PREVIEW</span>
          <button
            class="seg ${this.previewVisible ? "on" : ""}"
            ?disabled=${!this.canPreview}
            @click=${() => this.emit("preview-toggle")}
            title=${this.canPreview ? "Toggle markdown preview" : "Preview only available for Markdown files"}
          >
            ${this.previewVisible ? "ON" : "OFF"}
          </button>
        </div>
      </div>
    `;
  }
}
