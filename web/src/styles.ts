import { css } from "lit";

export const baseStyles = css`
  :host {
    display: block;
    font-family: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
    color: var(--fg);
    font-size: 12px;
    line-height: 1.45;
    letter-spacing: 0.01em;
  }
  * {
    box-sizing: border-box;
  }
  a {
    color: var(--accent);
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`;

export const panelStyles = css`
  .panel {
    position: relative;
    border: 1px solid var(--rule);
    background: var(--panel);
    padding: 16px 18px;
  }
  .panel::before,
  .panel::after,
  .panel > .tl,
  .panel > .tr {
    position: absolute;
    width: 10px;
    height: 10px;
    color: var(--fg);
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    line-height: 1;
    opacity: 0.85;
    pointer-events: none;
  }
  .panel::before {
    content: "└";
    left: -1px;
    bottom: -6px;
  }
  .panel::after {
    content: "┘";
    right: -1px;
    bottom: -6px;
  }
  .panel > .tl {
    content: "";
  }
  .panel-label {
    position: absolute;
    top: -7px;
    left: 14px;
    background: var(--bg);
    padding: 0 8px;
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--fg-dim);
  }
`;

export const bracketStyles = css`
  .brk {
    position: relative;
    padding: 10px 12px;
  }
  .brk::before,
  .brk::after {
    position: absolute;
    font-family: "JetBrains Mono", monospace;
    color: var(--fg-dim);
    font-size: 14px;
    line-height: 1;
    pointer-events: none;
  }
  .brk::before {
    content: "⌐";
    top: 2px;
    left: 2px;
  }
  .brk::after {
    content: "¬";
    top: 2px;
    right: 2px;
  }
`;

export const statusColors: Record<string, string> = {
  queued: "var(--fg-dim)",
  running: "var(--amber)",
  waiting: "var(--violet)",
  blocked: "var(--red)",
  succeeded: "var(--green)",
  failed: "var(--red)",
  timed_out: "var(--red)",
  cancelled: "var(--fg-dimmer)",
  lost: "var(--fg-dimmer)",
  error: "var(--red)",
  ok: "var(--green)",
};
