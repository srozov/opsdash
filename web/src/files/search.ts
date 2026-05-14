import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { searchContent, basename, type SearchResult } from "./client.ts";

@customElement("ops-file-search")
export class OpsFileSearch extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @state() private query = "";
  @state() private results: SearchResult[] = [];
  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private selected = 0;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async connectedCallback() {
    super.connectedCallback();
    document.addEventListener("keydown", this.onKeyDown);
    await this.updateComplete;
    (this.querySelector(".ops-palette-input") as HTMLInputElement | null)?.focus();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("keydown", this.onKeyDown);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  private onKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      this.close();
    } else if (ev.key === "ArrowDown") {
      ev.preventDefault();
      this.selected = Math.min(this.selected + 1, this.results.length - 1);
      this.scrollSelected();
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      this.selected = Math.max(this.selected - 1, 0);
      this.scrollSelected();
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      const r = this.results[this.selected];
      if (r) this.openAt(r.path, r.line);
    }
  };

  private scrollSelected() {
    this.updateComplete.then(() => {
      this.querySelector(".ops-palette-item.selected")?.scrollIntoView({ block: "nearest" });
    });
  }

  private onInput(ev: Event) {
    this.query = (ev.target as HTMLInputElement).value;
    this.selected = 0;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (!this.query.trim()) {
      this.results = [];
      return;
    }
    this.debounceTimer = setTimeout(() => void this.runSearch(), 350);
  }

  private async runSearch() {
    this.loading = true;
    this.error = null;
    try {
      const res = await searchContent(this.query);
      this.results = res.results;
      this.selected = 0;
    } catch (err) {
      this.error = (err as Error).message;
    } finally {
      this.loading = false;
    }
  }

  private openAt(path: string, line: number) {
    this.dispatchEvent(
      new CustomEvent("file-open-at", { detail: { path, line }, bubbles: true, composed: true }),
    );
    this.close();
  }

  private close() {
    this.dispatchEvent(new CustomEvent("search-close", { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div
        class="ops-overlay-back"
        @click=${(e: Event) => {
          if (e.target === e.currentTarget) this.close();
        }}
      >
        <div class="ops-palette ops-palette-search">
          <div class="ops-palette-head">
            <span class="ops-palette-icon">⌘⇧F</span>
            <input
              class="ops-palette-input"
              type="text"
              placeholder="Search in files…"
              .value=${this.query}
              @input=${this.onInput}
              autocomplete="off"
              spellcheck="false"
            />
            ${this.loading ? html`<span class="ops-palette-spinner">…</span>` : null}
          </div>
          <div class="ops-palette-results">
            ${this.error
              ? html`<div class="ops-palette-hint">⊘ ${this.error}</div>`
              : this.results.length === 0 && !this.loading && this.query.trim()
                ? html`<div class="ops-palette-hint">no results</div>`
                : this.results.map(
                    (r, i) => html`
                      <div
                        class="ops-palette-item ops-palette-item-search ${i === this.selected ? "selected" : ""}"
                        @click=${() => this.openAt(r.path, r.line)}
                        @mouseenter=${() => {
                          this.selected = i;
                        }}
                      >
                        <div class="ops-palette-item-header">
                          <span class="ops-palette-item-name">${basename(r.path)}</span>
                          <span class="ops-palette-item-line">:${r.line}</span>
                          <span class="ops-palette-item-dir">${r.path}</span>
                        </div>
                        <div class="ops-palette-item-snippet">${r.snippet}</div>
                      </div>
                    `,
                  )}
          </div>
          ${this.results.length > 0
            ? html`<div class="ops-palette-footer">
                ${this.results.length} results · ↑↓ navigate · ↵ open · esc close
              </div>`
            : null}
        </div>
      </div>
    `;
  }
}
