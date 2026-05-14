import { LitElement, html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { customElement, property } from "lit/decorators.js";
import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  typographer: true,
});

@customElement("ops-md-preview")
export class OpsMdPreview extends LitElement {
  protected createRenderRoot() {
    return this;
  }

  @property({ type: String }) content = "";

  render() {
    const rendered = md.render(this.content || "");
    const safe = DOMPurify.sanitize(rendered, {
      ALLOWED_ATTR: ["href", "title", "alt", "src", "name", "id", "class", "target", "rel"],
      ADD_ATTR: ["target", "rel"],
    });
    return html`
      <article class="ops-md">
        <div class="ops-md-inner">${unsafeHTML(safe)}</div>
      </article>
    `;
  }
}
