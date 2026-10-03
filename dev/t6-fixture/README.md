# T6 verification fixture

Dev-only. Runs Dagmar's unmodified `examples/review-iteration-loop.yaml` on a separate daemon
(port **7351**) with a fake ACP agent, so the loop, gate and revise conversation can be shown in
OpsDash without a paid agent. Nothing here is shipped or imported by `src/`.

Requires a built Dagmar checkout (`$DAGMAR/dist`) and Node 24 with `pnpm` on `PATH`.

```bash
S=/tmp/opsdash-t6-fixture
DAGMAR=/path/to/dagmar dev/t6-fixture/setup.sh $S
node $DAGMAR/dist/daemon.js --config $S/config.yaml &
D="node $DAGMAR/dist/cli.js --config $S/config.yaml"
$D run review-iteration-loop --input-json '{"task":"add a greeting"}'
$D pending                                                   # the gate, once review is done
$D answer <interaction-id> --json '{"decision":"approve"}'   # gate; a turn takes a raw JSON string
```

OpsDash: open `?dagmar=7351`. The gate and turns can also be answered there (node inspector or the
dashboard card); a gate answer is confirmed before it is sent. The port needs its own tailnet-only `tailscale serve` mapping
(`tailscale serve --bg --https=7351 http://127.0.0.1:7351`). Dagmar's RPC has no authentication, so
that mapping exposes start/cancel/answer to every tailnet device; ask before running it.

`setup.sh` writes the config, the workflow (only the `/ABSOLUTE/PATH/TO/dagmar` placeholder is
replaced) and a scratch target directory under `<stateDir>`. Run it again with an empty
`<stateDir>` for a clean start; stop the daemon first.

`verify` fails a seeded number of times: `VERIFY_FAIL_FIRST` is 1000 and the counter file
`<stateDir>/verify-count` holds how many verifies have run. `VERIFY_SEED` (default 999) sets its
initial value: 999 gives exactly one failing verify, 0 makes every verify fail.
`FAKE_ACP_DELAY_MS` slows each fake-agent prompt.

| Scenario | Setup | Result |
|---|---|---|
| S1 loop + approve | `VERIFY_SEED=999`; answer the gate `approve` | verify ×2, fixup ×1, review, gate, done; `exhausted` and `revise` skipped; run `completed` |
| S2 exhausted | `VERIFY_SEED=0` | verify ×4, fixup ×3, `exhausted` blocked; review/gate/done/revise skipped; run `blocked` |
| S3 revise | `VERIFY_SEED=999`; answer the gate `revise`, then answer each `turn` with a string | revise takes three turns (question, reply, envelope); `done` skipped; run `completed` |
| S4 restart | `VERIFY_SEED=0 FAKE_ACP_DELAY_MS=15000`; kill the daemon during fixup, restart, `resume` | fixup `failed` (`executor_lost`), run `blocked`; resume starts a new fixup attempt |

S1 was run against this fixture with the Dagmar CLI and ended `completed`. S2–S4 are described
from Dagmar's rules and have not been run yet.
