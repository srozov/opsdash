# OpsDash OpenClaw Control Plane: Paperclip Primitives To Borrow

Date: 2026-05-14

## Position

OpsDash should not become a smaller, weaker copy of Paperclip.

The useful direction is:

> OpsDash is an OpenClaw-native work and control surface that borrows a small set of proven Paperclip control-plane primitives.

OpenClaw remains the runtime system of record. OpsDash adds operator-level work state, review state, evidence, dependency visibility, and links back to native OpenClaw objects.

## Boundary

### OpenClaw Owns

- Agent execution
- Sessions
- MCP/tool use
- Tasks
- Taskflows
- Cron jobs
- Gateway delivery
- Agent identity/runtime configuration
- Runtime lifecycle and logs

### OpsDash Owns

- Canonical work items
- Work board / Kanban state
- Work-to-OpenClaw runtime links
- Review and approval queue
- Evidence / work products
- Blocker and parent relations
- Agent directory view loaded from OpenClaw
- Operator UI around tasks, taskflows, cron, and work

## What To Steal From Paperclip

### 1. Canonical Work Item Above Runtime Runs

Paperclip uses durable issues as the canonical unit of work while runtime runs sit underneath.

OpsDash should add a minimal `work_items` model, but keep OpenClaw Tasks, Taskflows, Cron jobs, and sessions as the native execution truth.

Do not copy Paperclip's full issue system. Copy the separation between "work to be done" and "runtime execution attempt."

### 2. Paperclip-Style Work Statuses

Paperclip's issue statuses are:

```ts
backlog
todo
in_progress
in_review
done
blocked
cancelled
```

OpsDash should use compatible internal statuses, with operator-friendly labels:

| Internal status | UI label |
| --- | --- |
| `backlog` | Backlog |
| `todo` | Ready |
| `in_progress` | Running |
| `blocked` | Blocked |
| `in_review` | Review |
| `done` | Done |
| `cancelled` | Cancelled |

These statuses are separate from OpenClaw runtime statuses like `queued`, `running`, `succeeded`, `failed`, `waiting`, or `lost`.

### 3. Guarded Review And Done Transitions

Paperclip does not let agents casually move work into review unless there is a real review path.

OpsDash should steal this guard:

- An agent may propose `in_review`.
- Deterministic code checks whether review is configured.
- `in_review` requires a reviewer, approval policy, pending interaction, or explicit manual override.
- `done` requires evidence and either a passed deterministic check, required review decision, or manual override.
- Agents should not self-certify `done` unless policy explicitly allows it.

This is the core defense against LLM self-grading failure.

### 4. Work Products / Evidence

Paperclip stores issue work products as first-class records.

OpsDash should add `work_products`:

```ts
work_products {
  id
  work_item_id
  type              // pr | file | url | log | artifact | note
  provider
  external_id
  title
  url
  status
  review_state
  created_by_run_id
  metadata
  created_at
}
```

The purpose is to give reviewers and operators concrete evidence instead of relying on transcript claims.

### 5. Review / Approval Decisions As Records

Paperclip persists execution decisions separately from issue comments and transcripts.

OpsDash should add `review_decisions`:

```ts
review_decisions {
  id
  work_item_id
  stage_id
  reviewer_agent_id
  reviewer_user_id
  outcome           // approved | changes_requested | rejected | waived
  body
  created_by_run_id
  created_at
}
```

The important rule: a review decision is structured state, not just a message in an agent transcript.

### 6. Minimal Execution / Review Policy

Paperclip has a richer execution policy and stage system. OpsDash should borrow a much smaller version.

Initial shape:

```ts
review_policy {
  required: boolean
  reviewers: string[]        // OpenClaw agent ids or user ids
  approvals_required: number
  allow_self_approval: false
}
```

Later, support multi-stage review:

```ts
stages: [
  {
    id: "security",
    label: "Security",
    reviewers: ["security-officer"],
    approvals_required: 1
  },
  {
    id: "product",
    label: "Product",
    reviewers: ["product-owner"],
    approvals_required: 1
  }
]
```

OpsDash decides deterministically whether the policy is satisfied. Agents may write reviews, but they do not decide whether the policy has passed.

### 7. Blocker And Parent Relations

Paperclip models issue relations such as `blocks`.

OpsDash should add a minimal relation table:

```ts
work_relations {
  id
  source_work_item_id
  target_work_item_id
  type              // blocks | parent_of
  created_at
}
```

This is enough for:

- Dependency DAG visualization
- "Blocked by" indicators
- Parent/child task breakdowns

Do not import Paperclip's full hierarchy or organization semantics.

### 8. Runtime Links To OpenClaw

Paperclip links issues to execution runs, workspaces, and artifacts.

OpsDash should make this OpenClaw-specific:

```ts
work_run_links {
  id
  work_item_id
  openclaw_run_id
  openclaw_task_id
  openclaw_flow_id
  openclaw_cron_job_id
  session_key
  agent_id
  link_source       // opsdash_started | manual | heuristic
  created_at
}
```

Mapping rules:

- When OpsDash starts a run via the OpenClaw gateway, store the accepted `runId` as `openclaw_run_id`.
- When reading OpenClaw task rows, match `task_runs.run_id` to `openclaw_run_id`.
- If a matched task has `parent_flow_id`, backfill `openclaw_flow_id`.
- If a run id uses the existing cron prefix convention, link to the corresponding cron job.
- Historical OpenClaw runs should be manually linked unless there is a reliable identifier.

The primary join for OpsDash-started work should be `openclaw_run_id`.

### 9. Agent Execution Contract

Paperclip's agent prompt makes a useful distinction: comments, docs, screenshots, and work products are evidence, not completion by themselves.

OpsDash should use a lightweight OpenClaw prompt convention:

- Produce or link concrete work products.
- Explain completion evidence.
- Mark blockers explicitly.
- Request review when policy requires it.
- Do not self-approve unless policy allows it.
- Include the OpsDash work item id in final status messages and artifact metadata where possible.

This is a convention around OpenClaw execution, not a new runtime.

### 10. Delegated Judgment

Paperclip supports review and approval participants.

OpsDash should use this for delegated review:

```text
SWE agent completes implementation
Security Officer agent reviews security-sensitive changes
Product Owner agent reviews behavior/scope
OpsDash records both decisions
Done becomes available only after required stages pass
```

The key rule:

> Agents can provide judgments, but OpsDash deterministically evaluates whether enough valid judgments exist.

## What Not To Steal

OpsDash should not copy:

- Paperclip's adapter framework
- Multi-runtime abstraction
- Agent company packages
- Adapter plugin manager
- Runtime lifecycle ownership
- Checkout / heartbeat machinery
- Budget governance
- Generic gateway abstraction
- Full execution policy engine
- Full hierarchy / organization model
- Paperclip's full prompt and liveness contract

These are unnecessary if OpenClaw is the only runtime.

## Why This Is Lighter Than Paperclip

Paperclip is designed to be a broad control plane for agent companies and multiple runtimes.

OpsDash should be narrower:

> OpenClaw already runs the agents. OpsDash only adds the missing operator control layer.

This avoids duplicating:

- OpenClaw task execution
- OpenClaw taskflows
- OpenClaw cron
- OpenClaw sessions
- OpenClaw gateway delivery
- OpenClaw agent runtime configuration

The result is not "minimal Paperclip." It is an OpenClaw-native control plane with selected Paperclip-inspired safeguards.

## What The Orchestrator Is

Leaving out Paperclip's runtime machinery does not mean there is no orchestrator.

It means OpsDash should not create a second agent execution runtime.

The OpsDash orchestrator is deterministic server-side control logic that owns work state and calls OpenClaw when execution is needed.

It is not:

- A new LLM agent
- A new coding-agent runtime
- A replacement for OpenClaw tasks
- A replacement for OpenClaw taskflows
- A replacement for OpenClaw cron
- A generic runtime adapter framework

It is:

- API handlers that mutate canonical work state
- Transition guards for `todo`, `in_progress`, `in_review`, `done`, `blocked`, and `cancelled`
- A small scheduler/tick loop for due work, stale work, review reminders, and reconciliation
- Gateway calls to OpenClaw `agent`, `agent.wait`, `cron.list`, `cron.run`, and related methods
- Link maintenance between work items and OpenClaw run/task/flow/cron ids
- Deterministic policy checks for review and done transitions

In other words:

```text
OpsDash orchestrator decides what should happen next.
OpenClaw executes agent work.
Agents produce output and review opinions.
OpsDash deterministically records whether policy is satisfied.
```

### Where The Orchestrator Runs

The orchestrator runs in the OpsDash server process.

The existing OpsDash server already has a polling event loop for snapshots:

```text
startEventLoop()
  -> poll OpenClaw tasks
  -> poll OpenClaw taskflows
  -> poll OpenClaw cron jobs
  -> publish SSE snapshots
```

The work orchestrator can be another server-side loop beside that, for example:

```text
workOrchestratorTick()
  -> find work items whose next action is due
  -> enforce deterministic transition rules
  -> dispatch OpenClaw agent runs when needed
  -> reconcile OpenClaw run status back to work items
  -> create review requests when policy requires them
  -> escalate stale or blocked work
```

This loop can start as a simple `setInterval` inside the OpsDash server. If it later needs persistence, locking, or distributed execution, it can be promoted to a durable job table.

### Main Loop vs Cron vs Agent

The orchestrator should not be an agent.

Use this split:

| Need | Owner |
| --- | --- |
| Human clicks "start work" | OpsDash API handler |
| Work item should auto-start when ready | OpsDash deterministic tick |
| Recurring external schedule | OpenClaw Cron |
| Agent implementation/review work | OpenClaw `agent` run |
| Wait for run completion | OpenClaw `agent.wait` or OpsDash reconciliation |
| Decide whether review policy passed | OpsDash deterministic code |
| Decide whether output semantically satisfies goal | Human, reviewer agent, or deterministic check recorded as evidence |

OpenClaw Cron should be used for recurring runtime schedules. OpsDash's internal tick should be used for work-state reconciliation and policy enforcement.

### Benefit Of Leaving Paperclip Runtime Machinery Out

The benefit is not that orchestration becomes free. It does not.

The benefit is that orchestration becomes smaller and has one runtime boundary:

```text
OpsDash work state -> OpenClaw gateway -> OpenClaw native run/task/session
```

Instead of Paperclip's broader boundary:

```text
Paperclip issue -> adapter -> runtime-specific execution -> heartbeat/run state -> policy engine -> recovery/watchdog
```

That means OpsDash avoids:

- Owning process execution for agents
- Owning adapter lifecycle
- Normalizing multiple runtime transcript formats
- Building generic runtime liveness machinery
- Re-implementing taskflows
- Re-implementing cron
- Re-implementing session storage
- Re-implementing agent discovery/configuration
- Building a generalized company/package/plugin system

The remaining complexity is the part OpsDash actually needs:

- Work state
- Review state
- Evidence
- Dependencies
- Links to OpenClaw runtime objects
- Deterministic transition policy

## Frontend Implications

OpsDash should add UI around the new control-plane layer without replacing the existing OpenClaw runtime views.

Required views:

- Work Kanban using canonical work statuses
- Work detail page with linked OpenClaw runs, tasks, flows, cron jobs, and sessions
- Review queue
- Work products / evidence panel
- Dependency DAG or blockers view
- Agent directory / organization view loaded from OpenClaw plus local metadata

Existing views should remain:

- OpenClaw Tasks
- OpenClaw Taskflows
- OpenClaw Cron
- Runtime logs / events

## Agent Directory

The agent directory should not be hardcoded.

Primary source:

- OpenClaw gateway `agents.list`

Local overlay:

```ts
agent_overrides {
  agent_id
  display_name
  role
  team
  reports_to_agent_id
  reviewer_kinds
  capabilities
  enabled
}
```

Suggested config:

```env
OPSDASH_OPENCLAW_GATEWAY_URL=
OPSDASH_OPENCLAW_GATEWAY_TOKEN=
OPSDASH_AGENT_DIRECTORY_MODE=gateway|manual|mixed
```

Remote gateway access is not needed to design this, but it is needed before implementation to validate the exact `agents.list`, `agent`, `agent.wait`, and `cron.list` response shapes.

## Minimal Implementation Sequence

### Phase 1: Work Layer

- Add `work_items`
- Add canonical statuses
- Add Work Kanban
- Link work items to OpenClaw agents by `agent_id`
- Keep existing OpenClaw Tasks/Taskflows/Cron tabs unchanged

### Phase 2: Runtime Linking

- Add `work_run_links`
- Start OpenClaw runs from work items through the gateway
- Link accepted `runId` back to work item
- Enrich native task rows with linked work item badges
- Show runtime history on work detail pages

### Phase 3: Evidence And Review

- Add `work_products`
- Add `review_decisions`
- Add minimal `review_policy`
- Add guarded transitions into `in_review` and `done`
- Add review queue

### Phase 4: Dependencies And Agent Directory

- Add `work_relations`
- Add blocker/parent visualization
- Load agents from OpenClaw gateway
- Add local metadata overlay for roles, teams, capabilities, and reviewer types

## Core Principle

Steal Paperclip's control-plane primitives:

- canonical work
- guarded transitions
- evidence
- review decisions
- blocker relations
- runtime links

Do not steal Paperclip's platform:

- adapters
- multi-runtime layer
- agent company model
- execution runtime
- generalized policy machinery

That is the difference between building an OpenClaw-native control plane and building a worse Paperclip.

## Decision History: Why OpsDash Was Initially Considered

The initial recommendation to continue with OpsDash instead of going directly to Paperclip was based on a narrower assumption:

> The goal was an OpenClaw-native operator/control plane, not a full AI-company control plane.

Under that assumption, OpsDash had a defensible role:

- OpsDash already observed OpenClaw-native tasks, taskflows, and cron jobs.
- OpenClaw already owned agent execution, sessions, tools/MCP, gateway delivery, taskflows, and cron.
- OpenClaw also owned native channel communication and routing.
- The user explicitly narrowed scope to OpenClaw only, with no multi-runtime requirement.
- Therefore OpsDash could avoid Paperclip's adapter/runtime layer and only add a small deterministic work/review/evidence surface.

The argument was never that OpsDash would need no orchestration.

The correct distinction is:

> OpsDash would not need a second agent execution runtime.
> OpsDash would still need an orchestrator.

In that model, the orchestrator would be deterministic OpsDash server code:

- Maintain canonical work state.
- Enforce status transitions.
- Call the OpenClaw gateway to start agent runs.
- Reconcile OpenClaw run/task/flow/cron state back into work items.
- Enforce review and done policies.
- Escalate stale, blocked, or failed work.

That is different from creating another runtime. OpenClaw would still execute the agents.

## Correction: When Paperclip Becomes The Better Base

The OpsDash-first recommendation stops making sense once the desired scope grows to include most of Paperclip's core product:

- Canonical work items
- Delegated review
- Approval stages
- Hierarchy
- Agent organization
- Review queues
- Evidence tracking
- Orchestration lifecycle
- Scheduler/recovery behavior
- Multi-agent governance

At that point, building these features independently in OpsDash becomes a Paperclip clone.

The better strategy then becomes:

> Use or fork Paperclip as the control-plane base, but integrate it with OpenClaw in a way that preserves OpenClaw's native runtime, workspace, session, and channel model.

That means:

- Paperclip owns work, review, approval, hierarchy, and governance.
- OpenClaw owns execution, workspaces, agent directories, sessions, channels, taskflows, cron, and delivery.
- OpsDash either remains an OpenClaw observability surface or contributes OpenClaw-specific panels/integration code to the Paperclip fork.

## Important Lesson

The earlier "no additional runtime" argument was too imprecise.

The precise version is:

> Do not add another agent execution runtime if OpenClaw already owns execution.
> But if the control-plane scope becomes rich, do not rebuild Paperclip's orchestration platform from scratch.

So the decision boundary is:

- If the goal is a thin OpenClaw-native dashboard/control surface, continue OpsDash.
- If the goal is a serious multi-agent work/control plane with reviews, approvals, hierarchy, and orchestration lifecycle, start from Paperclip and preserve OpenClaw at the runtime/channel boundary.
