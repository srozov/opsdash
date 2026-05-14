import { LitElement, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import {
  fetchContent,
  fetchFilesConfig,
  isMarkdown,
  saveContent,
  type FileContent,
  type FilesConfig,
} from "../files/client.ts";
import "../files/file-tree.ts";
import "../files/tab-strip.ts";
import "../files/editor.ts";
import "../files/preview.ts";
import "../files/toolbar.ts";
import "../files/statusbar.ts";
import "../files/navigator.ts";
import "../files/search.ts";
import type { OpsFileTree } from "../files/file-tree.ts";
import type { OpsMonaco } from "../files/editor.ts";

type OpenFile = {
  path: string;
  content: string;        // current buffer
  saved: string;          // last-saved snapshot (for dirty + revert)
  mtime: number;
  size: number;
  language?: string;
  dirty: boolean;
  previewVisible: boolean;
};

const LS_KEY = "opsdash.files";

type Persisted = {
  open: string[];
  active: string | null;
  treeWidth: number;
  previewWidth: number;
  previewVisibleByPath: Record<string, boolean>;
};

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultPersisted();
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      open: Array.isArray(parsed.open) ? parsed.open : [],
      active: parsed.active ?? null,
      treeWidth: typeof parsed.treeWidth === "number" ? parsed.treeWidth : 280,
      previewWidth: typeof parsed.previewWidth === "number" ? parsed.previewWidth : 480,
      previewVisibleByPath: parsed.previewVisibleByPath ?? {},
    };
  } catch {
    return defaultPersisted();
  }
}

function defaultPersisted(): Persisted {
  return { open: [], active: null, treeWidth: 280, previewWidth: 480, previewVisibleByPath: {} };
}

function savePersisted(p: Persisted) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

@customElement("ops-files")
export class OpsFiles extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @state() private cfg: FilesConfig | null = null;
  @state() private files: OpenFile[] = [];
  @state() private activePath: string | null = null;
  @state() private cursor = { line: 1, column: 1 };
  @state() private treeWidth: number;
  @state() private previewWidth: number;
  @state() private saveStatus: "idle" | "saving" | "saved" | "error" = "idle";
  @state() private saveError: string | null = null;
  @state() private rootLoadError: string | null = null;
  @state() private showNav = false;
  @state() private showSearch = false;

  private previewVisibleByPath: Record<string, boolean>;
  private dragMode: "tree" | "preview" | null = null;

  @query("ops-file-tree") private tree?: OpsFileTree;
  @query("ops-monaco") private editor?: OpsMonaco;

  constructor() {
    super();
    const p = loadPersisted();
    this.treeWidth = p.treeWidth;
    this.previewWidth = p.previewWidth;
    this.previewVisibleByPath = p.previewVisibleByPath ?? {};
  }

  async connectedCallback() {
    super.connectedCallback();
    document.addEventListener("pointermove", this.onPointerMove);
    document.addEventListener("pointerup", this.onPointerUp);
    // capture phase so we intercept Cmd-P/Cmd-Shift-F before Monaco handles them
    document.addEventListener("keydown", this.onKeyDown, true);
    try {
      this.cfg = await fetchFilesConfig();
    } catch (err) {
      this.rootLoadError = (err as Error).message;
      return;
    }
    const persisted = loadPersisted();
    // Restore opened files lazily after editor mounts (firstUpdated)
    queueMicrotask(() => this.restorePersisted(persisted));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("pointerup", this.onPointerUp);
    document.removeEventListener("keydown", this.onKeyDown, true);
  }

  private onKeyDown = (ev: KeyboardEvent) => {
    const cmd = ev.ctrlKey || ev.metaKey;
    if (cmd && (ev.key === "s" || ev.key === "S")) {
      ev.preventDefault();
      void this.onSave();
    } else if (cmd && !ev.shiftKey && (ev.key === "p" || ev.key === "P")) {
      ev.preventDefault();
      ev.stopPropagation();
      if (!this.showSearch) this.showNav = true;
    } else if (cmd && ev.shiftKey && (ev.key === "f" || ev.key === "F")) {
      ev.preventDefault();
      ev.stopPropagation();
      if (!this.showNav) this.showSearch = true;
    }
  };

  private async restorePersisted(p: Persisted) {
    for (const path of p.open) {
      try {
        await this.openFile(path, /*activate*/ false);
      } catch {
        // skip files that no longer exist
      }
    }
    if (p.active && this.files.find((f) => f.path === p.active)) {
      this.activate(p.active);
    } else if (this.files[0]) {
      this.activate(this.files[0].path);
    }
  }

  private persist() {
    savePersisted({
      open: this.files.map((f) => f.path),
      active: this.activePath,
      treeWidth: this.treeWidth,
      previewWidth: this.previewWidth,
      previewVisibleByPath: this.previewVisibleByPath,
    });
  }

  private async openFile(path: string, activate = true) {
    const existing = this.files.find((f) => f.path === path);
    if (existing) {
      if (activate) this.activate(path);
      return;
    }
    let result: FileContent;
    try {
      result = await fetchContent(path);
    } catch (err) {
      this.saveStatus = "error";
      this.saveError = (err as Error).message;
      return;
    }
    if ("error" in result) {
      this.saveStatus = "error";
      this.saveError =
        result.error === "binary"
          ? `Cannot open binary file (${formatBytes(result.size)})`
          : `File too large (${formatBytes(result.size)})`;
      // briefly show error then clear
      window.setTimeout(() => {
        if (this.saveStatus === "error") this.saveStatus = "idle";
      }, 4000);
      return;
    }
    const previewVisible =
      this.previewVisibleByPath[path] ?? (isMarkdown(path) ? true : false);
    const open: OpenFile = {
      path,
      content: result.content,
      saved: result.content,
      mtime: result.mtime,
      size: result.size,
      language: result.language,
      dirty: false,
      previewVisible,
    };
    this.files = [...this.files, open];
    if (activate) this.activate(path);
    this.persist();
  }

  private activate(path: string) {
    const file = this.files.find((f) => f.path === path);
    if (!file) return;
    this.activePath = path;
    if (this.editor) {
      this.editor.openFile(path, file.content, file.language);
    }
    this.persist();
  }

  private closeFile(path: string) {
    const idx = this.files.findIndex((f) => f.path === path);
    if (idx === -1) return;
    const closing = this.files[idx];
    if (!closing) return;
    if (closing.dirty) {
      const ok = window.confirm(`"${path}" has unsaved changes. Close anyway?`);
      if (!ok) return;
    }
    const remaining = this.files.filter((f) => f.path !== path);
    this.files = remaining;
    this.editor?.closeFile(path);
    if (this.activePath === path) {
      const next = remaining[Math.max(0, idx - 1)] ?? null;
      this.activePath = next?.path ?? null;
      if (next) this.editor?.openFile(next.path, next.content, next.language);
    }
    this.persist();
  }

  private onFileRenamed = (ev: CustomEvent<{ oldPath: string; newPath: string }>) => {
    const { oldPath } = ev.detail;
    // Close the old tab; user can reopen the renamed file from the tree
    const remaining = this.files.filter((f) => f.path !== oldPath);
    this.files = remaining;
    this.editor?.closeFile(oldPath);
    if (this.activePath === oldPath) {
      const next = remaining[0] ?? null;
      this.activePath = next?.path ?? null;
      if (next) this.editor?.openFile(next.path, next.content, next.language);
    }
    this.persist();
  };

  private onFileDeleted = (ev: CustomEvent<{ path: string; kind: string }>) => {
    const { path, kind } = ev.detail;
    if (kind === "file") {
      const remaining = this.files.filter((f) => f.path !== path);
      this.files = remaining;
      this.editor?.closeFile(path);
      if (this.activePath === path) {
        const next = remaining[0] ?? null;
        this.activePath = next?.path ?? null;
        if (next) this.editor?.openFile(next.path, next.content, next.language);
      }
    } else {
      // dir deleted — close any open files under that dir
      const prefix = path + "/";
      const remaining = this.files.filter((f) => f.path !== path && !f.path.startsWith(prefix));
      const closed = this.files.filter((f) => f.path === path || f.path.startsWith(prefix));
      for (const f of closed) this.editor?.closeFile(f.path);
      this.files = remaining;
      if (this.activePath && (this.activePath === path || this.activePath.startsWith(prefix))) {
        const next = remaining[0] ?? null;
        this.activePath = next?.path ?? null;
        if (next) this.editor?.openFile(next.path, next.content, next.language);
      }
    }
    this.persist();
  };

  private onFileOpenAt = async (ev: CustomEvent<{ path: string; line: number }>) => {
    const { path, line } = ev.detail;
    await this.openFile(path);
    requestAnimationFrame(() => this.editor?.revealLine(line));
  };

  private onEditorChange = (ev: CustomEvent<{ path: string; content: string; dirty: boolean }>) => {
    const f = this.files.find((x) => x.path === ev.detail.path);
    if (!f) return;
    f.content = ev.detail.content;
    f.dirty = ev.detail.dirty;
    this.requestUpdate();
  };

  private onCursor = (ev: CustomEvent<{ line: number; column: number }>) => {
    this.cursor = { line: ev.detail.line, column: ev.detail.column };
  };

  private onSave = async () => {
    if (!this.activePath) return;
    const f = this.files.find((x) => x.path === this.activePath);
    if (!f || !f.dirty) return;
    this.saveStatus = "saving";
    this.saveError = null;
    try {
      const res = await saveContent(f.path, f.content, f.mtime);
      f.mtime = res.mtime;
      f.size = res.size;
      f.saved = f.content;
      f.dirty = false;
      this.editor?.markSaved(f.path);
      this.saveStatus = "saved";
      window.setTimeout(() => {
        if (this.saveStatus === "saved") this.saveStatus = "idle";
      }, 2000);
      this.requestUpdate();
    } catch (err) {
      const msg = (err as Error).message;
      this.saveStatus = "error";
      if (msg.includes("409")) {
        this.saveError = "File changed on disk — reload before saving";
      } else {
        this.saveError = msg;
      }
    }
  };

  private onRevert = () => {
    if (!this.activePath) return;
    const f = this.files.find((x) => x.path === this.activePath);
    if (!f) return;
    f.content = f.saved;
    f.dirty = false;
    this.editor?.revertActive();
    this.requestUpdate();
  };

  private togglePreview() {
    if (!this.activePath) return;
    const f = this.files.find((x) => x.path === this.activePath);
    if (!f) return;
    f.previewVisible = !f.previewVisible;
    this.previewVisibleByPath[f.path] = f.previewVisible;
    this.persist();
    this.requestUpdate();
    queueMicrotask(() => this.editor?.layout());
  }

  private startDrag(mode: "tree" | "preview", ev: PointerEvent) {
    ev.preventDefault();
    this.dragMode = mode;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  private onPointerMove = (ev: PointerEvent) => {
    if (!this.dragMode) return;
    const host = this.renderRoot.querySelector(".ops-files-row") as HTMLElement | null;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    if (this.dragMode === "tree") {
      const w = clamp(ev.clientX - rect.left, 160, rect.width - 320);
      this.treeWidth = w;
    } else {
      const w = clamp(rect.right - ev.clientX, 240, rect.width - 320);
      this.previewWidth = w;
    }
    this.editor?.layout();
  };

  private onPointerUp = () => {
    if (!this.dragMode) return;
    this.dragMode = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    this.persist();
  };

  render() {
    if (this.rootLoadError) {
      return html`<div class="ops-error">⊘ files unavailable: ${this.rootLoadError}</div>`;
    }
    const active = this.activePath ? this.files.find((f) => f.path === this.activePath) : null;
    const previewVisible = active?.previewVisible ?? false;
    const previewW = previewVisible ? `${this.previewWidth}px` : "0px";
    const splitterW = previewVisible ? "5px" : "0px";

    return html`
      <div class="ops-files-shell">
        <ops-file-toolbar
          .dirty=${active?.dirty ?? false}
          .hasFile=${!!active}
          .previewVisible=${previewVisible}
          .canPreview=${active ? isMarkdown(active.path) : false}
          .saveStatus=${this.saveStatus}
          .saveError=${this.saveError}
          @save=${this.onSave}
          @revert=${this.onRevert}
          @preview-toggle=${() => this.togglePreview()}
        ></ops-file-toolbar>
        <ops-file-tabs
          .tabs=${this.files.map((f) => ({ path: f.path, dirty: f.dirty }))}
          .activePath=${this.activePath}
          @tab-select=${(e: CustomEvent) => this.activate(e.detail.path)}
          @tab-close=${(e: CustomEvent) => this.closeFile(e.detail.path)}
        ></ops-file-tabs>
        <div
          class="ops-files-row"
          style="grid-template-columns: ${this.treeWidth}px 5px minmax(0,1fr) ${splitterW} ${previewW}"
        >
          <div class="ops-files-pane ops-files-pane-tree">
            <ops-file-tree
              .activePath=${this.activePath}
              @file-open=${(e: CustomEvent) => this.openFile(e.detail.path)}
              @file-renamed=${this.onFileRenamed}
              @file-deleted=${this.onFileDeleted}
            ></ops-file-tree>
          </div>
          <div
            class="ops-splitter"
            @pointerdown=${(e: PointerEvent) => this.startDrag("tree", e)}
          ></div>
          <div class="ops-files-pane ops-files-pane-editor">
            <ops-monaco
              @editor-change=${this.onEditorChange}
              @editor-cursor=${this.onCursor}
              @editor-save=${this.onSave}
            ></ops-monaco>
            ${active
              ? null
              : html`
                  <div class="ops-files-empty">
                    <div class="kicker">~/ ROOT</div>
                    <div class="head">${this.cfg?.root ?? "—"}</div>
                    <div class="sub">Choose a file from the tree to begin.</div>
                  </div>
                `}
          </div>
          <div
            class="ops-splitter ${previewVisible ? "" : "hidden"}"
            @pointerdown=${(e: PointerEvent) => this.startDrag("preview", e)}
          ></div>
          <div class="ops-files-pane ops-files-pane-preview ${previewVisible ? "" : "hidden"}">
            ${active && previewVisible
              ? html`<ops-md-preview .content=${active.content}></ops-md-preview>`
              : null}
          </div>
        </div>
        ${this.showNav
          ? html`<ops-file-nav
              .recentPaths=${this.files.map((f) => f.path)}
              @file-open=${(e: CustomEvent) => {
                this.showNav = false;
                void this.openFile(e.detail.path);
              }}
              @nav-close=${() => {
                this.showNav = false;
              }}
            ></ops-file-nav>`
          : null}
        ${this.showSearch
          ? html`<ops-file-search
              @file-open-at=${(e: CustomEvent) => {
                this.showSearch = false;
                void this.onFileOpenAt(e as CustomEvent<{ path: string; line: number }>);
              }}
              @search-close=${() => {
                this.showSearch = false;
              }}
            ></ops-file-search>`
          : null}
        <ops-file-statusbar
          .path=${active?.path ?? null}
          .language=${active?.language ?? null}
          .line=${this.cursor.line}
          .column=${this.cursor.column}
          .dirty=${active?.dirty ?? false}
          .size=${active?.size ?? 0}
        ></ops-file-statusbar>
      </div>
    `;
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function formatBytes(n: number): string {
  if (!n) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
