import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import * as monaco from "monaco-editor";

import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import CssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

let envInited = false;
let themeInited = false;

function initMonacoEnv() {
  if (envInited) return;
  envInited = true;
  (self as unknown as { MonacoEnvironment: { getWorker: (_: string, label: string) => Worker } }).MonacoEnvironment = {
    getWorker(_: string, label: string) {
      switch (label) {
        case "json":
          return new JsonWorker();
        case "css":
        case "scss":
        case "less":
          return new CssWorker();
        case "html":
        case "handlebars":
        case "razor":
          return new HtmlWorker();
        case "typescript":
        case "javascript":
          return new TsWorker();
        default:
          return new EditorWorker();
      }
    },
  };
}

function initOpsTheme() {
  if (themeInited) return;
  themeInited = true;
  monaco.editor.defineTheme("opsdash-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "e8e6df", background: "0a0a0b" },
      { token: "comment", foreground: "4a4945", fontStyle: "italic" },
      { token: "keyword", foreground: "ff8c1a" },
      { token: "number", foreground: "b48ead" },
      { token: "string", foreground: "8ec07c" },
      { token: "type", foreground: "f5f1e6" },
      { token: "delimiter", foreground: "8a887f" },
      { token: "tag", foreground: "ff8c1a" },
      { token: "attribute.name", foreground: "b48ead" },
      { token: "attribute.value", foreground: "8ec07c" },
    ],
    colors: {
      "editor.background": "#0a0a0b",
      "editor.foreground": "#e8e6df",
      "editorLineNumber.foreground": "#4a4945",
      "editorLineNumber.activeForeground": "#ff8c1a",
      "editorCursor.foreground": "#ff8c1a",
      "editor.selectionBackground": "#ff8c1a40",
      "editor.inactiveSelectionBackground": "#ff8c1a20",
      "editor.lineHighlightBackground": "#0d0d0f",
      "editor.lineHighlightBorder": "#0a0a0b",
      "editorIndentGuide.background": "#1a1a1d",
      "editorIndentGuide.activeBackground": "#3a3a40",
      "editorWidget.background": "#0d0d0f",
      "editorWidget.border": "#3a3a40",
      "editorSuggestWidget.background": "#0d0d0f",
      "editorSuggestWidget.border": "#3a3a40",
      "editorSuggestWidget.selectedBackground": "#ff8c1a30",
      "editorBracketMatch.background": "#3a3a4080",
      "editorBracketMatch.border": "#ff8c1a",
      "editorGutter.background": "#0a0a0b",
      "scrollbarSlider.background": "#3a3a4080",
      "scrollbarSlider.hoverBackground": "#8a887f80",
      "scrollbarSlider.activeBackground": "#ff8c1a80",
      "minimap.background": "#0a0a0b",
    },
  });
}

type ModelEntry = {
  model: monaco.editor.ITextModel;
  viewState: monaco.editor.ICodeEditorViewState | null;
  initialContent: string;
};

@customElement("ops-monaco")
export class OpsMonaco extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: String }) activePath: string | null = null;

  private editor?: monaco.editor.IStandaloneCodeEditor;
  private models = new Map<string, ModelEntry>();
  private container?: HTMLDivElement;
  private resizeObserver?: ResizeObserver;
  private suppressChange = false;

  connectedCallback() {
    super.connectedCallback();
    initMonacoEnv();
  }

  firstUpdated() {
    this.container = this.renderRoot.querySelector(".ops-monaco-mount") as HTMLDivElement;
    if (!this.container) return;
    initOpsTheme();
    this.editor = monaco.editor.create(this.container, {
      value: "",
      language: "plaintext",
      theme: "opsdash-dark",
      fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
      fontSize: 13,
      lineHeight: 20,
      letterSpacing: 0.2,
      minimap: { enabled: false },
      automaticLayout: false,
      smoothScrolling: true,
      cursorSmoothCaretAnimation: "on",
      cursorBlinking: "smooth",
      renderLineHighlight: "all",
      scrollBeyondLastLine: false,
      padding: { top: 16, bottom: 24 },
      fontLigatures: true,
      bracketPairColorization: { enabled: true },
      guides: {
        indentation: true,
        bracketPairs: true,
      },
      tabSize: 2,
      wordWrap: "off",
      contextmenu: true,
      readOnly: false,
    });

    this.editor.onDidChangeModelContent(() => {
      if (this.suppressChange) return;
      if (!this.activePath) return;
      const entry = this.models.get(this.activePath);
      if (!entry) return;
      const content = entry.model.getValue();
      const dirty = content !== entry.initialContent;
      this.dispatchEvent(
        new CustomEvent("editor-change", {
          detail: { path: this.activePath, content, dirty },
          bubbles: true,
          composed: true,
        }),
      );
    });

    this.editor.onDidChangeCursorPosition((e) => {
      this.dispatchEvent(
        new CustomEvent("editor-cursor", {
          detail: { line: e.position.lineNumber, column: e.position.column },
          bubbles: true,
          composed: true,
        }),
      );
    });

    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      this.dispatchEvent(new CustomEvent("editor-save", { bubbles: true, composed: true }));
    });

    this.resizeObserver = new ResizeObserver(() => {
      this.editor?.layout();
    });
    this.resizeObserver.observe(this.container);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
    for (const [, entry] of this.models) entry.model.dispose();
    this.models.clear();
    this.editor?.dispose();
  }

  /** Open or focus a file in the editor. */
  openFile(path: string, content: string, language?: string) {
    if (!this.editor) return;

    let entry = this.models.get(path);
    if (!entry) {
      const uri = monaco.Uri.parse(`file:///${path}`);
      const model =
        monaco.editor.getModel(uri) ??
        monaco.editor.createModel(content, language ?? "plaintext", uri);
      entry = { model, viewState: null, initialContent: content };
      this.models.set(path, entry);
    } else if (entry.model.getValue() !== content) {
      // file changed on disk while we had it open and we explicitly reload
      this.suppressChange = true;
      entry.model.setValue(content);
      entry.initialContent = content;
      this.suppressChange = false;
    }

    // save current view state for the previously-active model
    if (this.activePath && this.activePath !== path) {
      const prev = this.models.get(this.activePath);
      if (prev) prev.viewState = this.editor.saveViewState();
    }

    this.editor.setModel(entry.model);
    if (entry.viewState) this.editor.restoreViewState(entry.viewState);
    this.editor.focus();
    this.activePath = path;
  }

  closeFile(path: string) {
    const entry = this.models.get(path);
    if (!entry) return;
    entry.model.dispose();
    this.models.delete(path);
    if (this.activePath === path) {
      this.editor?.setModel(null);
      this.activePath = null;
    }
  }

  /** Update the cached "saved" content so dirty tracking resets. */
  markSaved(path: string) {
    const entry = this.models.get(path);
    if (!entry) return;
    entry.initialContent = entry.model.getValue();
  }

  /** Revert the active model to its last-saved content. */
  revertActive() {
    if (!this.activePath) return;
    const entry = this.models.get(this.activePath);
    if (!entry) return;
    this.suppressChange = true;
    entry.model.setValue(entry.initialContent);
    this.suppressChange = false;
    this.dispatchEvent(
      new CustomEvent("editor-change", {
        detail: { path: this.activePath, content: entry.initialContent, dirty: false },
        bubbles: true,
        composed: true,
      }),
    );
  }

  getActiveContent(): string | null {
    if (!this.activePath) return null;
    const entry = this.models.get(this.activePath);
    return entry ? entry.model.getValue() : null;
  }

  layout() {
    this.editor?.layout();
  }

  revealLine(lineNumber: number) {
    if (!this.editor) return;
    this.editor.revealLineInCenter(lineNumber);
    this.editor.setPosition({ lineNumber, column: 1 });
    this.editor.focus();
  }

  render() {
    return html`<div class="ops-monaco-mount" style="width:100%;height:100%"></div>`;
  }
}
