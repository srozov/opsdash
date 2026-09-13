import { LitElement, html, svg, nothing, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { RunTask, RunView } from "./dagmar-types.ts";
import { formatDuration } from "./format.ts";

const NODE_WIDTH = 190;
const NODE_HEIGHT = 68;
const GAP_X = 64;
const GAP_Y = 18;
const PAD = 20;

interface Placed {
  id: string;
  task: RunTask;
  x: number;
  y: number;
}

// Renders the run's task graph. Each task key is one node; each dependsOn entry
// is one edge. A small deterministic layout groups tasks by dependency depth and
// lays depth groups out left to right. Clicking a node selects the task.
@customElement("run-graph")
export class RunGraph extends LitElement {
  @property({ attribute: false }) run: RunView | null = null;
  @property({ attribute: false }) selectedTaskId: string | null = null;

  // Render into light DOM so the global stylesheet applies.
  protected createRenderRoot(): HTMLElement {
    return this;
  }

  private depths(tasks: Record<string, RunTask>): Map<string, number> {
    const depth = new Map<string, number>();
    const visiting = new Set<string>();
    const compute = (id: string): number => {
      const cached = depth.get(id);
      if (cached !== undefined) return cached;
      const task = tasks[id];
      // Guard against a missing dependency or an unexpected cycle: fall back to
      // depth 0 rather than recursing forever.
      if (!task || visiting.has(id)) return 0;
      visiting.add(id);
      let max = 0;
      for (const dep of task.dependsOn) {
        if (tasks[dep]) max = Math.max(max, compute(dep) + 1);
      }
      visiting.delete(id);
      depth.set(id, max);
      return max;
    };
    for (const id of Object.keys(tasks)) compute(id);
    return depth;
  }

  private layout(tasks: Record<string, RunTask>): { placed: Placed[]; width: number; height: number } {
    const depth = this.depths(tasks);
    const groups = new Map<number, string[]>();
    for (const id of Object.keys(tasks)) {
      const d = depth.get(id) ?? 0;
      (groups.get(d) ?? groups.set(d, []).get(d)!).push(id);
    }
    const placed: Placed[] = [];
    let maxRows = 0;
    for (const [d, ids] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
      ids.sort();
      maxRows = Math.max(maxRows, ids.length);
      ids.forEach((id, row) => {
        placed.push({
          id,
          task: tasks[id]!,
          x: PAD + d * (NODE_WIDTH + GAP_X),
          y: PAD + row * (NODE_HEIGHT + GAP_Y),
        });
      });
    }
    const depthCount = groups.size;
    return {
      placed,
      width: PAD * 2 + Math.max(1, depthCount) * NODE_WIDTH + Math.max(0, depthCount - 1) * GAP_X,
      height: PAD * 2 + Math.max(1, maxRows) * NODE_HEIGHT + Math.max(0, maxRows - 1) * GAP_Y,
    };
  }

  private edges(placed: Placed[]): TemplateResult[] {
    const byId = new Map(placed.map((p) => [p.id, p]));
    const paths: TemplateResult[] = [];
    for (const node of placed) {
      for (const dep of node.task.dependsOn) {
        const from = byId.get(dep);
        if (!from) continue;
        const x1 = from.x + NODE_WIDTH;
        const y1 = from.y + NODE_HEIGHT / 2;
        const x2 = node.x;
        const y2 = node.y + NODE_HEIGHT / 2;
        const mid = (x1 + x2) / 2;
        paths.push(
          svg`<path class="graph-edge" d="M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}" />`,
        );
      }
    }
    return paths;
  }

  private select(id: string): void {
    this.dispatchEvent(new CustomEvent("select-task", { detail: id, bubbles: true, composed: true }));
  }

  private renderNode(node: Placed): TemplateResult {
    const latest = node.task.attempts[node.task.attempts.length - 1];
    const selected = node.id === this.selectedTaskId;
    return html`
      <button
        class="graph-node ${selected ? "is-selected" : ""}"
        style="left:${node.x}px;top:${node.y}px;width:${NODE_WIDTH}px;height:${NODE_HEIGHT}px"
        @click=${() => this.select(node.id)}
        title=${node.id}
      >
        <div class="graph-node-id">${node.id}</div>
        <div class="graph-node-meta">
          <span class="state-badge state-${node.task.state}">${node.task.state}</span>
          <span class="mono muted">${node.task.executor}</span>
        </div>
        ${latest
          ? html`<div class="graph-node-attempt mono muted">
              #${latest.attempt} · ${formatDuration(latest.startedAt, latest.endedAt)}
            </div>`
          : nothing}
      </button>
    `;
  }

  protected render(): unknown {
    if (!this.run) return nothing;
    const tasks = this.run.tasks;
    if (Object.keys(tasks).length === 0) {
      return html`<p class="empty">This run has no tasks.</p>`;
    }
    const { placed, width, height } = this.layout(tasks);
    return html`
      <div class="graph" style="width:${width}px;height:${height}px">
        <svg class="graph-edges" width=${width} height=${height}>${this.edges(placed)}</svg>
        ${placed.map((node) => this.renderNode(node))}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "run-graph": RunGraph;
  }
}
