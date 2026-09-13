# OpsDash v0 Implementation Plan

## Goal

Build OpsDash as a read-only browser interface for Dagmar.

The browser connects to Dagmar's WebSocket JSON-RPC API, queries current state,
subscribes to events, and renders workflows, runs, task attempts, and
transcripts. Dagmar remains the only source of workflow state.

## Constraints

- Use Vite, Lit, and TypeScript.
- Build a static application. OpsDash has no application backend.
- Connect to Dagmar through a tailnet-only WebSocket endpoint.
- Use Dagmar's native API shapes and statuses.
- Store UI selection in browser memory only.
- Keep v0 read-only.

v0 excludes run creation, resume, cancellation, interaction answers, workflow
editing, Kanban, approval gates, OpenClaw views, Files, and Fabro.

## Architecture

```text
Browser
  |-- HTTPS --> Tailscale Serve --> /home/<host>/opsdash/dist/
  `-- WSS ----> Tailscale Serve --> ws://127.0.0.1:7331 --> Dagmar
```

Expose two tailnet-only endpoints on `<host>`:

```text
https://<<host>-tailnet-name>:7890/   OpsDash static files
wss://<<host>-tailnet-name>:7331/     Dagmar JSON-RPC
```

Dagmar keeps its loopback listener. Tailscale Serve terminates TLS and forwards
WebSocket traffic to `127.0.0.1:7331`.

OpsDash derives the Dagmar URL from the page hostname:

```ts
const dagmarUrl = `wss://${location.hostname}:7331`;
```

Tailnet access is the v0 security boundary. Everyone allowed to reach the
Dagmar endpoint can access its full API even though OpsDash calls read methods
only.

## Network preflight

Verify browser access before writing the UI:

1. Expose Dagmar through Tailscale Serve on HTTPS port 7331.
2. Open `wss://<<host>-tailnet-name>:7331/` from a browser on another tailnet
   device.
3. Send a JSON-RPC `system.ping` request.
4. Confirm that Dagmar returns its version, start time, and event sequence.
5. Confirm that the endpoint is unavailable outside the tailnet.

If Tailscale Serve cannot forward the WebSocket upgrade, fix the network proxy.
Do not add an OpsDash data service.

## Repository shape

Use the repository root as the Vite root:

```text
opsdash/
  index.html
  package.json
  bun.lock
  tsconfig.json
  vite.config.ts
  PLAN.md
  src/
    main.ts
    app.ts
    dagmar-client.ts
    dagmar-types.ts
    graph.ts
    transcript.ts
    styles.css
  dist/                         generated, ignored
```

- `app.ts` owns loading, selection, and the main Lit template.
- `dagmar-client.ts` owns WebSocket JSON-RPC and reconnects.
- `dagmar-types.ts` contains the Dagmar wire types used by the UI.
- `graph.ts` lays out and renders task nodes and edges.
- `transcript.ts` loads and renders one attempt transcript.

Keep the run list and task inspector in `app.ts` until that file becomes hard
to navigate.

## Package cleanup

Keep:

- `lit`;
- `vite`;
- `typescript`.

Remove Hono, Monaco, Markdown rendering, DOMPurify, backend types, and editor
types. Remove the server `start` script. Regenerate `bun.lock` with Bun.

Update configuration:

- `tsconfig.json` includes `src/**/*.ts` and no longer includes `server` or
  `web` paths;
- `vite.config.ts` uses the repository root and writes to `dist/`;
- Vite allows the current tailnet hostname during development;
- `.gitignore` ignores `dist/`;
- `opsdash.service` is removed after Tailscale Serve serves `dist/`.

Required scripts:

```text
bun run dev
bun run typecheck
bun run build
```

## Dagmar client

Implement one `DagmarClient` class. It must:

- connect to the configured WebSocket URL;
- assign request IDs and correlate responses;
- reject pending requests when the socket closes;
- time out unanswered requests;
- deliver Dagmar event notifications to `app.ts`;
- reconnect with delays of 1, 2, 5, then 10 seconds;
- create a new event subscription after each connection.

Use a typed request method:

```ts
request<T>(method: string, params?: Record<string, Json>): Promise<T>
```

v0 calls only:

```text
system.ping
workflow.list
run.list
run.get
interaction.list
transcript.read
events.subscribe
```

The client holds protocol state only. `app.ts` holds the returned workflow and
run data.

Copy the consumed public wire shapes from Dagmar into `dagmar-types.ts` (source:
`/home/<host>/dagmar/src/types.ts` — `RunView`, `AttemptRow`, `Interaction`,
`TranscriptRecord`, `DagmarEvent`, `WorkflowErrorView`, and the `RunStatus` /
`AttemptStatus` / `TaskState` unions). Keep field names and status strings
unchanged. Do not import Dagmar source files.

Dagmar delivers events as a single JSON-RPC notification `{ method: "event",
params: <DagmarEvent> }`, not as one method per event type. The client
dispatches on `event.type`. Every event carries `workflowRunId`, and
task/interaction/transcript events also carry `taskRunId`, so the client can
match an event to the selected run or attempt.

## Initial load

After connecting:

1. Subscribe to all events.
2. Request `system.ping`, `workflow.list`, `run.list`, and `interaction.list`.
3. Select the newest `running` or `waiting` run.
4. If no run is active, select the newest run.
5. Request `run.get` for the selected run.

Preserve the selected run, task, and attempt while refreshed data still
contains them. Select the newest attempt by default.

## Screen

Use one desktop-first screen. The DAG is the dominant center workspace. Recent
runs stay on the left. The selected task, its attempts, and its transcript stay
on the right.

```text
+----------------------------------------------------------------------------------+
| OpsDash                              Dagmar connection · version · uptime          |
+--------------------+---------------------------------------+-----------------------+
| Recent runs        | Selected run                          | Selected task         |
| filters            | workflow · status · elapsed           | state · executor      |
| workflow errors    +---------------------------------------+ attempts              |
|                    |                                       |                       |
| workflow           | DAG canvas                            +-----------------------+
| status             |                                       | Transcript            |
| start/update time  |                                       |                       |
+--------------------+---------------------------------------+-----------------------+
```

Use this desktop grid:

```css
grid-template-columns: 260px minmax(600px, 1fr) 420px;
```

- Keep the application header fixed across all three columns.
- Give each column its own overflow boundary.
- Keep the run summary attached to the top of the center column.
- Split the right column vertically between task details and transcript.
- Let the transcript use the remaining height and scroll independently.
- Keep the center column wider than either side column at the target viewport.

v0 targets desktop screens at least 1280 pixels wide. Smaller screens may
scroll horizontally. Do not add a mobile layout, router, application modes,
resizable panels, or a configurable dashboard system.

## Archon visual direction

Use Archon's workflow interface as the visual and interaction reference:

- a full-height dark charcoal application shell;
- thin borders between working areas instead of floating dashboard cards;
- compact headers, controls, badges, and metadata;
- muted secondary text with high-contrast operational state;
- a distinct color for each state the UI renders. Run status is one of
  `running`, `waiting`, `completed`, `blocked`, `cancelled` (there is no
  run-level `failed`). Task state adds `pending`, `ready`, `awaiting_permission`,
  `awaiting_input`, `failed`, and `blocked_by_dependency`; give
  `awaiting_permission` and `awaiting_input` a visible treatment because they
  mark pending interactions on the graph;
- a bright accent for the selected run, selected task, and keyboard focus;
- sans-serif text for labels and monospace text for IDs, timestamps, JSON, and
  transcript records;
- small corner radii, restrained shadows, and dense spacing.

Keep the DAG readable and quiet. Status and selection carry color; backgrounds
stay neutral. Do not place decorative gradients behind the graph or transcript.

Use Archon as a design reference, not as a source dependency. OpsDash does not
need Archon's React components, Tailwind setup, routing, product model, or
backend to reproduce this layout.

Show workflow validation errors above the run list. When no runs exist, show
the discovered workflows and their task counts in the main area.

## Run list

Sort runs by `startedAt` descending and render the newest 50. Show:

- workflow ID;
- abbreviated run ID;
- native status;
- start time;
- update time;
- end time or elapsed duration.

Provide browser-side filters for active, waiting, blocked, completed, and
cancelled runs. The "active" filter matches the native `running` status.
`run.list` omits each run's `input`; the full input is only in the `RunView`
returned by `run.get`.

## Run graph

Use `RunView.tasks` directly:

- each task key creates one node;
- each `dependsOn` entry creates an edge;
- the task state controls its style;
- clicking a node selects the task.

Implement a small deterministic layout:

1. Calculate dependency depth for each task.
2. Group tasks by depth.
3. Sort task IDs within each group.
4. Render groups from left to right.
5. Draw SVG edges behind the nodes.

Allow horizontal scrolling. Do not add a graph library, manual positioning,
zoom, or editing.

Each node shows the task ID, state, executor, latest attempt number, and latest
attempt duration.

## Task inspector

For the selected task, show:

- task ID, state, executor, and dependencies;
- all attempts in attempt-number order;
- attempt ID, status, timestamps, duration, and ACP session ID;
- result outcome, message, and formatted JSON output;
- error code, message, and structured data.

For a task without attempts, explain its current derived state.

Match `interaction.list` results to the selected attempt. Show pending
permission or input requests as structured read-only data. Do not show an
answer control.

## Transcript

When an attempt is selected:

1. Call `transcript.read` with `afterLine: 0`.
2. Render the returned records and store `nextLine`.
3. On a matching `transcript.appended` event, request records after `nextLine`.
4. Append the returned records in order.

Records have one of three types: `lifecycle`, `stdio`, and `acp`. Render
`lifecycle` records as rows and `stdio` records as log blocks. For `acp` records,
inspect the `message` payload and render ACP agent messages as text, thoughts in
a collapsed disclosure, and tool calls as tool blocks. Render unknown records or
unrecognized `acp` message shapes as formatted JSON.

Provide raw JSON for every record. Bind text through Lit and do not inject
transcript HTML.

## Live updates

Handle Dagmar events as follows:

- `workflow.status_changed`: reload the run list and the selected matching run;
- `task.status_changed`: reload the selected matching run;
- `interaction.changed`: reload interactions and the selected matching run;
- `transcript.appended`: fetch new lines for the selected matching attempt.

After a reconnect, resubscribe and reload all current state. Ignore the event
sequence from the previous connection because Dagmar resets it after a restart.

## Failure behavior

- Keep the page usable when Dagmar is offline and show the last connection
  error.
- Keep loaded data visible but mark it stale during reconnects.
- Show request errors beside the affected panel.
- Show workflow discovery errors instead of empty healthy rows.
- Keep a run summary visible when its workflow definition is unavailable.
- Render malformed or unknown transcript records as raw JSON.
- Select another run if the selected run disappears.

## Implementation order

1. Update package and build configuration.
2. Complete the browser-to-Dagmar network preflight.
3. Implement Dagmar types and the JSON-RPC client.
4. Render connection state, workflow errors, and recent runs.
5. Load the selected `RunView`.
6. Add the graph and task selection.
7. Add attempt and interaction detail.
8. Add transcript loading and incremental updates.
9. Add reconnect behavior.
10. Build and serve `dist/` through Tailscale Serve.
11. Remove the obsolete OpsDash systemd service.

## Verification

Run on `<host>`:

```text
bun install
bun run typecheck
bun run build
```

Verify from another tailnet device:

1. The application loads over HTTPS and connects to Dagmar over WSS.
2. Workflow errors and run summaries match the Dagmar CLI.
3. A selected run shows the correct tasks and dependency edges.
4. Task states update without a page reload.
5. Attempt results, errors, and transcripts match the Dagmar CLI.
6. Transcript updates append without duplicating earlier records.
7. Pending interactions appear without write controls.
8. Restarting Dagmar disconnects and reconnects the UI without losing the
   current view.
9. Neither endpoint is reachable outside the tailnet.

Use an existing run or a harmless process workflow. Do not start a paid agent
workflow for UI verification.

## Definition of done

A browser on the tailnet can load the static application, connect to Dagmar,
inspect workflows and runs, follow a live task graph, inspect attempts and
transcripts, and recover after a Dagmar restart.

The repository contains no OpsDash application backend, copy of Dagmar state,
or write path.

## Later work

Dagmar already exposes methods for run start, resume, cancellation, and
interaction answers. A later OpsDash version can call those methods through the
same browser client.

Kanban needs an agreed durable work-item model. Approval gates need native
Dagmar approval semantics. Design each feature when its data model exists.
