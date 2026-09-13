import { LitElement, html, nothing, type TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { DagmarClient } from "./dagmar-client.ts";
import type {
  Attempt,
  DagmarEvent,
  Interaction,
  PingResult,
  RunSummary,
  RunTask,
  RunView,
  WorkflowListResult,
} from "./dagmar-types.ts";
import { formatDuration, formatTime, shortId } from "./format.ts";
import "./graph.ts";
import "./transcript.ts";

// Dagmar is reached through Tailscale Serve on the same tailnet host that serves
// OpsDash. Derive the endpoint from the page hostname.
const DAGMAR_URL = `wss://${location.hostname}:7331`;

type RunFilter = "all" | "active" | "waiting" | "blocked" | "completed" | "cancelled";

const FILTERS: { id: RunFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "waiting", label: "Waiting" },
  { id: "blocked", label: "Blocked" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

@customElement("ops-dash")
export class OpsDash extends LitElement {
  private client!: DagmarClient;
  private ticker?: ReturnType<typeof setInterval>;

  @state() private connected = false;
  @state() private stale = false;
  @state() private connectionError: string | null = null;

  @state() private ping: PingResult | null = null;
  @state() private workflows: WorkflowListResult | null = null;
  @state() private workflowsError: string | null = null;
  @state() private runs: RunSummary[] = [];
  @state() private runsError: string | null = null;
  @state() private interactions: Interaction[] = [];

  @state() private selectedRunId: string | null = null;
  @state() private run: RunView | null = null;
  @state() private runError: string | null = null;
  @state() private selectedTaskId: string | null = null;
  @state() private selectedAttemptId: string | null = null;

  @state() private filter: RunFilter = "all";
  @state() private transcriptTick = 0;
  @state() private reloadToken = 0;

  protected createRenderRoot(): HTMLElement {
    return this;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.client = new DagmarClient(DAGMAR_URL, {
      onOpen: () => this.onOpen(),
      onClose: (error) => this.onClose(error),
      onEvent: (event) => this.onEvent(event),
    });
    this.client.start();
    // Refresh live durations (elapsed, uptime) once a second.
    this.ticker = setInterval(() => this.requestUpdate(), 1000);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.ticker !== undefined) clearInterval(this.ticker);
    this.client.stop();
  }

  // --- connection lifecycle ---

  private onOpen(): void {
    this.connected = true;
    this.stale = false;
    this.connectionError = null;
    this.reloadToken += 1;
    void this.loadAll();
  }

  private onClose(error: string | null): void {
    this.connected = false;
    this.stale = true;
    this.connectionError = error;
  }

  private onEvent(event: DagmarEvent): void {
    switch (event.type) {
      case "workflow.status_changed":
        void this.loadRuns();
        if (event.workflowRunId === this.selectedRunId) void this.loadRun();
        break;
      case "task.status_changed":
        if (event.workflowRunId === this.selectedRunId) void this.loadRun();
        break;
      case "interaction.changed":
        void this.loadInteractions();
        if (event.workflowRunId === this.selectedRunId) void this.loadRun();
        break;
      case "transcript.appended":
        // data carries the new line count; the transcript component re-reads
        // from its own cursor, so a tick bump is all it needs.
        if (event.taskRunId && event.taskRunId === this.selectedAttemptId) this.transcriptTick += 1;
        break;
    }
  }

  // --- loading ---

  private async loadAll(): Promise<void> {
    await Promise.all([this.loadPing(), this.loadWorkflows(), this.loadInteractions(), this.loadRuns()]);
  }

  private async loadPing(): Promise<void> {
    try {
      this.ping = await this.client.request<PingResult>("system.ping");
    } catch {
      this.ping = null;
    }
  }

  private async loadWorkflows(): Promise<void> {
    try {
      this.workflows = await this.client.request<WorkflowListResult>("workflow.list");
      this.workflowsError = null;
    } catch (error) {
      this.workflowsError = error instanceof Error ? error.message : "Failed to load workflows";
    }
  }

  private async loadInteractions(): Promise<void> {
    try {
      this.interactions = await this.client.request<Interaction[]>("interaction.list");
    } catch {
      // Interactions are secondary; leave the last known list in place.
    }
  }

  private async loadRuns(): Promise<void> {
    try {
      const runs = await this.client.request<RunSummary[]>("run.list");
      this.runs = [...runs].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
      this.runsError = null;
      this.reconcileRunSelection();
    } catch (error) {
      this.runsError = error instanceof Error ? error.message : "Failed to load runs";
    }
  }

  private async loadRun(): Promise<void> {
    const runId = this.selectedRunId;
    if (!runId) {
      this.run = null;
      return;
    }
    try {
      const run = await this.client.request<RunView>("run.get", { workflowRunId: runId });
      // Ignore a response for a run the user has since navigated away from.
      if (runId !== this.selectedRunId) return;
      this.run = run;
      this.runError = null;
      this.reconcileTaskSelection();
    } catch (error) {
      if (runId !== this.selectedRunId) return;
      this.runError = error instanceof Error ? error.message : "Failed to load run";
    }
  }

  // --- selection ---

  private reconcileRunSelection(): void {
    if (this.selectedRunId && this.runs.some((r) => r.id === this.selectedRunId)) return;
    const active = this.runs.filter((r) => r.status === "running" || r.status === "waiting");
    const next = (active[0] ?? this.runs[0])?.id ?? null;
    this.selectRun(next);
  }

  private selectRun(runId: string | null): void {
    if (runId === this.selectedRunId) return;
    this.selectedRunId = runId;
    this.selectedTaskId = null;
    this.selectedAttemptId = null;
    this.run = null;
    this.runError = null;
    void this.loadRun();
  }

  private reconcileTaskSelection(): void {
    const tasks = this.run?.tasks ?? {};
    if (this.selectedTaskId && !tasks[this.selectedTaskId]) {
      this.selectedTaskId = null;
      this.selectedAttemptId = null;
      return;
    }
    if (this.selectedTaskId) {
      const attempts = tasks[this.selectedTaskId]!.attempts;
      if (!this.selectedAttemptId || !attempts.some((a) => a.id === this.selectedAttemptId)) {
        this.selectedAttemptId = latestAttempt(attempts)?.id ?? null;
      }
    }
  }

  private selectTask(taskId: string): void {
    this.selectedTaskId = taskId;
    const attempts = this.run?.tasks[taskId]?.attempts ?? [];
    this.selectedAttemptId = latestAttempt(attempts)?.id ?? null;
  }

  private get filteredRuns(): RunSummary[] {
    const match = (r: RunSummary): boolean => {
      switch (this.filter) {
        case "all":
          return true;
        case "active":
          return r.status === "running";
        default:
          return r.status === this.filter;
      }
    };
    return this.runs.filter(match).slice(0, 50);
  }

  // --- render ---

  protected render(): unknown {
    return html`
      ${this.renderHeader()}
      <div class="layout">
        <aside class="col col-runs">${this.renderRunColumn()}</aside>
        <section class="col col-center">${this.renderCenter()}</section>
        <aside class="col col-task">${this.renderTaskColumn()}</aside>
      </div>
    `;
  }

  private renderHeader(): TemplateResult {
    const status = this.connected ? "open" : "reconnecting";
    return html`
      <header class="app-header">
        <div class="app-title">OpsDash</div>
        <div class="app-conn">
          <span class="conn-dot conn-${this.connected ? "open" : "down"}"></span>
          <span>${this.connected ? "connected" : "reconnecting…"}</span>
          <span class="muted mono">${DAGMAR_URL}</span>
          ${this.ping
            ? html`<span class="muted mono">v${this.ping.version}</span>
                <span class="muted mono" title=${this.ping.startedAt}>
                  up ${formatDuration(this.ping.startedAt, null)}
                </span>`
            : nothing}
          ${this.stale ? html`<span class="stale-badge">stale</span>` : nothing}
          ${this.connectionError && !this.connected
            ? html`<span class="conn-error">${this.connectionError}</span>`
            : nothing}
          <span class="muted mono conn-status" hidden>${status}</span>
        </div>
      </header>
    `;
  }

  private renderRunColumn(): TemplateResult {
    return html`
      ${this.workflowsError
        ? html`<p class="panel-error">Workflow discovery failed: ${this.workflowsError}</p>`
        : nothing}
      ${this.workflows && this.workflows.errors.length > 0
        ? html`<div class="workflow-errors">
            <h2 class="col-heading">Workflow errors</h2>
            ${this.workflows.errors.map(
              (e) => html`<div class="workflow-error">
                <div class="mono">${e.code}</div>
                <div>${e.message}</div>
                <div class="muted mono">${e.file}</div>
              </div>`,
            )}
          </div>`
        : nothing}
      <div class="filters">
        ${FILTERS.map(
          (f) => html`<button
            class="filter ${this.filter === f.id ? "is-active" : ""}"
            @click=${() => (this.filter = f.id)}
          >
            ${f.label}
          </button>`,
        )}
      </div>
      <h2 class="col-heading">Recent runs</h2>
      ${this.runsError ? html`<p class="panel-error">${this.runsError}</p>` : nothing}
      <ul class="run-list">
        ${this.filteredRuns.map((r) => this.renderRunRow(r))}
        ${this.filteredRuns.length === 0 && !this.runsError
          ? html`<li class="empty">No runs match this filter.</li>`
          : nothing}
      </ul>
    `;
  }

  private renderRunRow(run: RunSummary): TemplateResult {
    return html`
      <li
        class="run-row ${run.id === this.selectedRunId ? "is-selected" : ""}"
        @click=${() => this.selectRun(run.id)}
        title=${run.id}
      >
        <div class="run-row-top">
          <span class="run-workflow">${run.workflowId}</span>
          <span class="state-badge state-${run.status}">${run.status}</span>
        </div>
        <div class="run-row-meta mono muted">
          <span>${shortId(run.id)}</span>
          <span>${formatDuration(run.startedAt, run.endedAt)}</span>
        </div>
        <div class="run-row-meta mono muted">
          <span>start ${formatTime(run.startedAt)}</span>
        </div>
      </li>
    `;
  }

  private renderCenter(): TemplateResult {
    if (this.runs.length === 0) {
      return this.renderWorkflowCatalog();
    }
    const summary = this.run ?? this.runs.find((r) => r.id === this.selectedRunId) ?? null;
    return html`
      ${summary ? this.renderRunSummary(summary) : nothing}
      ${this.runError ? html`<p class="panel-error">${this.runError}</p>` : nothing}
      <div class="graph-scroll">
        ${this.run
          ? html`<run-graph
              .run=${this.run}
              .selectedTaskId=${this.selectedTaskId}
              @select-task=${(e: CustomEvent<string>) => this.selectTask(e.detail)}
            ></run-graph>`
          : html`<p class="empty">Select a run to view its task graph.</p>`}
      </div>
    `;
  }

  private renderWorkflowCatalog(): TemplateResult {
    const workflows = this.workflows?.workflows ?? [];
    return html`
      <div class="run-summary">
        <div class="run-summary-title">No runs yet</div>
        <div class="muted">Discovered workflows and their task counts:</div>
      </div>
      <div class="workflow-catalog">
        ${workflows.length === 0
          ? html`<p class="empty">No workflows discovered.</p>`
          : workflows.map(
              (w) => html`<div class="workflow-card">
                <div class="workflow-card-id">${w.id}</div>
                <div class="muted">${w.taskCount} task${w.taskCount === 1 ? "" : "s"}</div>
                <div class="muted mono">${w.file}</div>
              </div>`,
            )}
      </div>
    `;
  }

  private renderRunSummary(run: RunSummary | RunView): TemplateResult {
    return html`
      <div class="run-summary">
        <div class="run-summary-title">
          <span>${run.workflowId}</span>
          <span class="state-badge state-${run.status}">${run.status}</span>
        </div>
        <div class="run-summary-meta mono muted">
          <span title=${run.id}>${shortId(run.id)}</span>
          <span>elapsed ${formatDuration(run.startedAt, run.endedAt)}</span>
          <span>start ${formatTime(run.startedAt)}</span>
          <span>update ${formatTime(run.updatedAt)}</span>
          ${run.endedAt ? html`<span>end ${formatTime(run.endedAt)}</span>` : nothing}
        </div>
      </div>
    `;
  }

  private renderTaskColumn(): TemplateResult {
    return html`
      <div class="task-detail">${this.renderTaskInspector()}</div>
      <div class="transcript-panel">
        <h2 class="col-heading">Transcript</h2>
        <div class="transcript-scroll">
          <attempt-transcript
            .client=${this.client}
            .taskRunId=${this.selectedAttemptId}
            .tick=${this.transcriptTick}
            .reloadToken=${this.reloadToken}
          ></attempt-transcript>
        </div>
      </div>
    `;
  }

  private renderTaskInspector(): TemplateResult {
    const taskId = this.selectedTaskId;
    const task = taskId ? this.run?.tasks[taskId] : undefined;
    if (!taskId || !task) {
      return html`<p class="empty">Select a task in the graph.</p>`;
    }
    return html`
      <h2 class="col-heading">Selected task</h2>
      <div class="task-head">
        <div class="task-id mono">${taskId}</div>
        <span class="state-badge state-${task.state}">${task.state}</span>
      </div>
      <div class="task-meta mono muted">
        <div>executor: ${task.executor}</div>
        <div>depends on: ${task.dependsOn.length ? task.dependsOn.join(", ") : "—"}</div>
      </div>
      ${task.attempts.length === 0
        ? html`<p class="empty">${describeState(task)}</p>`
        : this.renderAttempts(task.attempts)}
    `;
  }

  private renderAttempts(attempts: Attempt[]): TemplateResult {
    const selected = attempts.find((a) => a.id === this.selectedAttemptId) ?? null;
    return html`
      <div class="attempt-tabs">
        ${attempts.map(
          (a) => html`<button
            class="attempt-tab ${a.id === this.selectedAttemptId ? "is-active" : ""}"
            @click=${() => (this.selectedAttemptId = a.id)}
            title=${a.id}
          >
            #${a.attempt}
            <span class="state-badge state-${a.status}">${a.status}</span>
          </button>`,
        )}
      </div>
      ${selected ? this.renderAttempt(selected) : nothing}
    `;
  }

  private renderAttempt(attempt: Attempt): TemplateResult {
    const interactions = this.interactions.filter((i) => i.taskRunId === attempt.id);
    return html`
      <div class="attempt-detail">
        <div class="attempt-grid mono muted">
          <span>id</span><span title=${attempt.id}>${shortId(attempt.id)}</span>
          <span>status</span><span><span class="state-badge state-${attempt.status}">${attempt.status}</span></span>
          <span>started</span><span>${formatTime(attempt.startedAt)}</span>
          <span>updated</span><span>${formatTime(attempt.updatedAt)}</span>
          <span>ended</span><span>${attempt.endedAt ? formatTime(attempt.endedAt) : "—"}</span>
          <span>duration</span><span>${formatDuration(attempt.startedAt, attempt.endedAt)}</span>
          <span>ACP session</span><span>${attempt.acpSessionId ?? "—"}</span>
        </div>
        ${attempt.result
          ? html`<div class="attempt-block">
              <h3>Result</h3>
              <div class="mono muted">outcome: ${attempt.result.outcome}</div>
              <div>${attempt.result.message}</div>
              <pre class="mono json">${JSON.stringify(attempt.result.output, null, 2)}</pre>
            </div>`
          : nothing}
        ${attempt.error
          ? html`<div class="attempt-block attempt-error">
              <h3>Error</h3>
              <div class="mono">${attempt.error.code}</div>
              <div>${attempt.error.message}</div>
              ${attempt.error.data !== undefined
                ? html`<pre class="mono json">${JSON.stringify(attempt.error.data, null, 2)}</pre>`
                : nothing}
            </div>`
          : nothing}
        ${interactions.length
          ? html`<div class="attempt-block">
              <h3>Pending interactions</h3>
              ${interactions.map(
                (i) => html`<div class="interaction">
                  <div class="mono">
                    <span class="state-badge">${i.kind}</span> ${i.method}
                  </div>
                  <pre class="mono json">${JSON.stringify(i.request, null, 2)}</pre>
                </div>`,
              )}
            </div>`
          : nothing}
      </div>
    `;
  }
}

function latestAttempt(attempts: Attempt[]): Attempt | undefined {
  return attempts.reduce<Attempt | undefined>(
    (best, a) => (best === undefined || a.attempt > best.attempt ? a : best),
    undefined,
  );
}

// Explain the derived state of a task that has produced no attempts.
function describeState(task: RunTask): string {
  switch (task.state) {
    case "pending":
      return "Pending: not yet evaluated for readiness.";
    case "ready":
      return "Ready: dependencies satisfied, waiting for an executor slot.";
    case "blocked_by_dependency":
      return "Blocked by dependency: an upstream task did not complete.";
    case "blocked":
      return "Blocked: the task cannot proceed.";
    case "cancelled":
      return "Cancelled before any attempt started.";
    default:
      return `State: ${task.state} (no attempts recorded).`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ops-dash": OpsDash;
  }
}
