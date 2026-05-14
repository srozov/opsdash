import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  fetchTree,
  joinPath,
  dirname,
  saveContent,
  rename,
  deletePath,
  mkdir,
  type DirEntry,
  type DirListing,
} from "./client.ts";

type Node = {
  path: string;
  name: string;
  kind: "dir" | "file";
  binary?: boolean;
  size?: number;
  mtime?: number;
  hidden: boolean;
  loaded: boolean;
  loading: boolean;
  expanded: boolean;
  children: Node[];
};

function rootNode(): Node {
  return {
    path: "",
    name: "/",
    kind: "dir",
    hidden: false,
    loaded: false,
    loading: false,
    expanded: true,
    children: [],
  };
}

function entryToNode(parent: string, e: DirEntry): Node {
  return {
    path: joinPath(parent, e.name),
    name: e.name,
    kind: e.kind,
    binary: e.binary,
    size: e.size,
    mtime: e.mtime,
    hidden: e.hidden,
    loaded: false,
    loading: false,
    expanded: false,
    children: [],
  };
}

@customElement("ops-file-tree")
export class OpsFileTree extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: String }) activePath: string | null = null;
  @property({ type: Boolean }) showHidden = false;

  @state() private root: Node = rootNode();
  @state() private error: string | null = null;
  @state() private ctxMenu: { x: number; y: number; node: Node } | null = null;

  async connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this.closeCtx);
    document.addEventListener("keydown", this.onCtxKey);
    await this.loadDir(this.root);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this.closeCtx);
    document.removeEventListener("keydown", this.onCtxKey);
  }

  private closeCtx = () => {
    if (this.ctxMenu) this.ctxMenu = null;
  };

  private onCtxKey = (ev: KeyboardEvent) => {
    if (ev.key === "Escape" && this.ctxMenu) this.ctxMenu = null;
  };

  private openCtx(ev: MouseEvent, node: Node) {
    ev.preventDefault();
    ev.stopPropagation();
    this.ctxMenu = { x: ev.clientX, y: ev.clientY, node };
  }

  private async ctxNewFile(parentNode: Node) {
    this.ctxMenu = null;
    const name = prompt("New file name:");
    if (!name?.trim()) return;
    const newPath = parentNode.path ? `${parentNode.path}/${name.trim()}` : name.trim();
    try {
      await saveContent(newPath, "");
      await this.refresh();
      this.dispatchEvent(
        new CustomEvent("file-open", { detail: { path: newPath }, bubbles: true, composed: true }),
      );
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    }
  }

  private async ctxNewFolder(parentNode: Node) {
    this.ctxMenu = null;
    const name = prompt("New folder name:");
    if (!name?.trim()) return;
    const newPath = parentNode.path ? `${parentNode.path}/${name.trim()}` : name.trim();
    try {
      await mkdir(newPath);
      await this.refresh();
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    }
  }

  private async ctxRename(node: Node) {
    this.ctxMenu = null;
    const newName = prompt("New name:", node.name);
    if (!newName?.trim() || newName.trim() === node.name) return;
    const parent = dirname(node.path);
    const newPath = parent ? `${parent}/${newName.trim()}` : newName.trim();
    try {
      await rename(node.path, newPath);
      await this.refresh();
      this.dispatchEvent(
        new CustomEvent("file-renamed", {
          detail: { oldPath: node.path, newPath },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    }
  }

  private async ctxDelete(node: Node) {
    this.ctxMenu = null;
    const msg =
      node.kind === "dir"
        ? `Delete folder "${node.name}" and all its contents?`
        : `Delete "${node.name}"?`;
    if (!confirm(msg)) return;
    try {
      await deletePath(node.path);
      await this.refresh();
      this.dispatchEvent(
        new CustomEvent("file-deleted", {
          detail: { path: node.path, kind: node.kind },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    }
  }

  async refresh() {
    this.error = null;
    const expanded = collectExpanded(this.root);
    this.root = rootNode();
    await this.loadDir(this.root);
    for (const p of expanded) await this.expandPath(p);
    this.requestUpdate();
  }

  private async loadDir(node: Node) {
    if (node.loading) return;
    node.loading = true;
    this.requestUpdate();
    try {
      const listing: DirListing = await fetchTree(node.path, this.showHidden);
      node.children = listing.entries.map((e) => entryToNode(node.path, e));
      node.loaded = true;
      node.expanded = true;
    } catch (err) {
      this.error = (err as Error).message;
    } finally {
      node.loading = false;
      this.requestUpdate();
    }
  }

  private async toggle(node: Node, ev?: Event) {
    ev?.stopPropagation();
    if (node.kind !== "dir") return;
    if (!node.loaded) {
      await this.loadDir(node);
    } else {
      node.expanded = !node.expanded;
      this.requestUpdate();
    }
  }

  private async expandPath(targetPath: string) {
    if (!targetPath) return;
    const segs = targetPath.split("/").filter(Boolean);
    let cursor: Node = this.root;
    let cur = "";
    for (const seg of segs) {
      cur = cur ? `${cur}/${seg}` : seg;
      if (!cursor.loaded) await this.loadDir(cursor);
      const next = cursor.children.find((n) => n.name === seg && n.kind === "dir");
      if (!next) return;
      next.expanded = true;
      cursor = next;
    }
    this.requestUpdate();
  }

  async revealPath(targetPath: string) {
    if (!targetPath) return;
    const parent = targetPath.includes("/") ? targetPath.slice(0, targetPath.lastIndexOf("/")) : "";
    await this.expandPath(parent);
  }

  private clickFile(node: Node, ev: Event) {
    ev.stopPropagation();
    if (node.kind === "dir") {
      void this.toggle(node);
      return;
    }
    this.dispatchEvent(
      new CustomEvent("file-open", {
        detail: { path: node.path, binary: node.binary, name: node.name },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private renderNode(node: Node, depth: number): unknown {
    const isActive = node.kind === "file" && node.path === this.activePath;
    const indent = depth * 14;
    const chev = node.kind === "dir" ? (node.expanded ? "▾" : "▸") : "·";
    const cls = [
      "row",
      node.kind === "dir" ? "row-dir" : "row-file",
      isActive ? "row-active" : "",
      node.binary ? "row-binary" : "",
      node.hidden ? "row-hidden" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const ext = node.kind === "file" ? extOf(node.name) : "";
    return html`
      <div
        class=${cls}
        style="padding-left:${indent + 8}px"
        @click=${(e: Event) => this.clickFile(node, e)}
        @contextmenu=${(e: MouseEvent) => this.openCtx(e, node)}
      >
        <span class="chev">${chev}</span>
        <span class="name">${node.name}</span>
        ${ext ? html`<span class="ext">${ext}</span>` : null}
      </div>
      ${node.kind === "dir" && node.expanded
        ? node.loading && node.children.length === 0
          ? html`<div class="row row-hint" style="padding-left:${indent + 22}px">…loading</div>`
          : node.children.length === 0 && node.loaded
            ? html`<div class="row row-hint" style="padding-left:${indent + 22}px">— empty —</div>`
            : node.children.map((c) => this.renderNode(c, depth + 1))
        : null}
    `;
  }

  render() {
    return html`
      <div class="ops-tree">
        <div class="ops-tree-head">
          <span class="kicker">├ FILES</span>
          <button class="ops-tree-btn" title="Refresh" @click=${() => this.refresh()}>↻</button>
          <button
            class="ops-tree-btn ${this.showHidden ? "on" : ""}"
            title="${this.showHidden ? "Hide" : "Show"} hidden files"
            @click=${() => {
              this.showHidden = !this.showHidden;
              void this.refresh();
            }}
          >
            ${this.showHidden ? "•" : "·"}
          </button>
        </div>
        ${this.error ? html`<div class="ops-tree-err">${this.error}</div>` : null}
        <div class="ops-tree-body">
          ${this.root.loaded
            ? this.root.children.map((c) => this.renderNode(c, 0))
            : html`<div class="row row-hint" style="padding-left:22px">…loading</div>`}
        </div>
      </div>
      ${this.ctxMenu
        ? html`
            <div
              class="ops-ctx-menu"
              style="left:${this.ctxMenu.x}px;top:${this.ctxMenu.y}px"
              @click=${(e: Event) => e.stopPropagation()}
            >
              ${this.ctxMenu.node.kind === "dir"
                ? html`
                    <div class="ops-ctx-item" @click=${() => this.ctxNewFile(this.ctxMenu!.node)}>
                      New File
                    </div>
                    <div class="ops-ctx-item" @click=${() => this.ctxNewFolder(this.ctxMenu!.node)}>
                      New Folder
                    </div>
                    <div class="ops-ctx-sep"></div>
                  `
                : null}
              <div class="ops-ctx-item" @click=${() => this.ctxRename(this.ctxMenu!.node)}>
                Rename
              </div>
              <div class="ops-ctx-item danger" @click=${() => this.ctxDelete(this.ctxMenu!.node)}>
                Delete
              </div>
            </div>
          `
        : null}
    `;
  }
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  if (i === -1 || i === 0) return "";
  return name.slice(i + 1).toUpperCase();
}

function collectExpanded(root: Node): string[] {
  const out: string[] = [];
  const walk = (n: Node) => {
    if (n.expanded && n.kind === "dir" && n.path) out.push(n.path);
    for (const c of n.children) walk(c);
  };
  walk(root);
  return out;
}
