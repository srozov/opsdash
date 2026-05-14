import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { findAllFiles, basename, dirname } from "./client.ts";

function scoreMatch(filePath: string, q: string): number {
  const name = basename(filePath).toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 90;
  if (name.includes(q)) return 80;
  return 50;
}

@customElement("ops-file-nav")
export class OpsFileNav extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ attribute: false }) recentPaths: string[] = [];

  @state() private query = "";
  @state() private allFiles: string[] = [];
  @state() private loading = true;
  @state() private selected = 0;

  private get filtered(): string[] {
    if (!this.query.trim()) {
      // Show currently-open files first, then fill with alphabetical
      if (this.recentPaths.length > 0) {
        const recentSet = new Set(this.recentPaths);
        const fill = this.allFiles.filter((f) => !recentSet.has(f)).slice(0, 50 - this.recentPaths.length);
        return [...this.recentPaths, ...fill].slice(0, 50);
      }
      return this.allFiles.slice(0, 50);
    }
    const q = this.query.toLowerCase();
    return this.allFiles
      .filter((f) => f.toLowerCase().includes(q))
      .map((f) => ({ f, score: scoreMatch(f, q) }))
      .sort((a, b) => b.score - a.score || a.f.length - b.f.length)
      .slice(0, 50)
      .map(({ f }) => f);
  }

  async connectedCallback() {
    super.connectedCallback();
    document.addEventListener("keydown", this.onKeyDown);
    try {
      const res = await findAllFiles();
      this.allFiles = res.files;
    } finally {
      this.loading = false;
    }
    await this.updateComplete;
    (this.querySelector(".ops-palette-input") as HTMLInputElement | null)?.focus();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("keydown", this.onKeyDown);
  }

  private onKeyDown = (ev: KeyboardEvent) => {
    const items = this.filtered;
    if (ev.key === "Escape") {
      ev.preventDefault();
      this.close();
    } else if (ev.key === "ArrowDown") {
      ev.preventDefault();
      this.selected = Math.min(this.selected + 1, items.length - 1);
      this.scrollSelected();
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      this.selected = Math.max(this.selected - 1, 0);
      this.scrollSelected();
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      const f = items[this.selected];
      if (f) this.open(f);
    }
  };

  private scrollSelected() {
    this.updateComplete.then(() => {
      this.querySelector(".ops-palette-item.selected")?.scrollIntoView({
        block: "nearest",
      });
    });
  }

  private onInput(ev: Event) {
    this.query = (ev.target as HTMLInputElement).value;
    this.selected = 0;
  }

  private open(path: string) {
    this.dispatchEvent(
      new CustomEvent("file-open", { detail: { path }, bubbles: true, composed: true }),
    );
    this.close();
  }

  private close() {
    this.dispatchEvent(new CustomEvent("nav-close", { bubbles: true, composed: true }));
  }

  render() {
    const items = this.filtered;
    return html`
      <div
        class="ops-overlay-back"
        @click=${(e: Event) => {
          if (e.target === e.currentTarget) this.close();
        }}
      >
        <div class="ops-palette">
          <div class="ops-palette-head">
            <span class="ops-palette-icon">⌘P</span>
            <input
              class="ops-palette-input"
              type="text"
              placeholder="Type a filename or path…"
              .value=${this.query}
              @input=${this.onInput}
              autocomplete="off"
              spellcheck="false"
            />
          </div>
          <div class="ops-palette-results">
            ${this.loading
              ? html`<div class="ops-palette-hint">loading file index…</div>`
              : items.length === 0
                ? html`<div class="ops-palette-hint">no results</div>`
                : items.map(
                    (f, i) => html`
                      <div
                        class="ops-palette-item ${i === this.selected ? "selected" : ""}"
                        @click=${() => this.open(f)}
                        @mouseenter=${() => {
                          this.selected = i;
                        }}
                      >
                        <span class="ops-palette-item-name">${basename(f)}</span>
                        <span class="ops-palette-item-dir">${dirname(f) || "~"}</span>
                      </div>
                    `,
                  )}
          </div>
          ${!this.loading && this.allFiles.length > 0
            ? html`<div class="ops-palette-footer">
                ${this.allFiles.length} files · ↑↓ navigate · ↵ open · esc close
              </div>`
            : null}
        </div>
      </div>
    `;
  }
}
