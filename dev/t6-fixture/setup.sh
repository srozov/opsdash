#!/usr/bin/env bash
# Prepare a Dagmar config for the T6 verification fixture: the unmodified
# examples/review-iteration-loop.yaml driven by a fake ACP agent on port 7351.
#
#   DAGMAR=/path/to/dagmar-checkout dev/t6-fixture/setup.sh <stateDir>
#
# Optional environment:
#   FAKE_ACP_DELAY_MS  slow each fake-agent prompt (scenario S4)
#   VERIFY_SEED        value written to the verify counter file (default 999):
#                      999 = exactly one failing verify, 0 = every verify fails
set -euo pipefail

: "${DAGMAR:?set DAGMAR to the absolute path of a built dagmar checkout}"
[ -d "$DAGMAR/dist" ] || { echo "no $DAGMAR/dist: build dagmar first" >&2; exit 1; }
[ $# -eq 1 ] || { echo "usage: $0 <stateDir>" >&2; exit 1; }

here=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$1"
state=$(cd "$1" && pwd)
dagmar=$(cd "$DAGMAR" && pwd)
seed=${VERIFY_SEED:-999}

mkdir -p "$state/workflows" "$state/state" "$state/target"
printf '{"name":"t6-target","private":true,"scripts":{"test":"node -e \\"\\""}}\n' > "$state/target/package.json"
printf '%s' "$seed" > "$state/verify-count"
# Literal split/join: sed and bash ${//} treat characters such as # and & in the path specially.
node -e 'const fs = require("node:fs");
  const [src, dest, dagmar] = process.argv.slice(1);
  fs.writeFileSync(dest, fs.readFileSync(src, "utf8").split("/ABSOLUTE/PATH/TO/dagmar").join(dagmar));' \
  "$dagmar/examples/review-iteration-loop.yaml" "$state/workflows/review-iteration-loop.yaml" "$dagmar"

agent_env='{}'
if [ -n "${FAKE_ACP_DELAY_MS:-}" ]; then agent_env="{ FAKE_ACP_DELAY_MS: \"$FAKE_ACP_DELAY_MS\" }"; fi

cat > "$state/config.yaml" <<YAML
workflowDir: $state/workflows
storageDir: $state/state
listen: { host: 127.0.0.1, port: 7351 }
executors:
  builder:
    type: acp
    cwd: $state/target
    run: [node, $here/fake-acp-agent.mjs]
    env: $agent_env
  reviewer:
    type: acp
    cwd: $state/target
    run: [node, $here/fake-acp-agent.mjs]
    env: $agent_env
  check:
    type: process
    cwd: $state/target
    env: { VERIFY_FAIL_FIRST: "1000", VERIFY_COUNTER_FILE: "$state/verify-count" }
YAML

echo "wrote $state/config.yaml"
echo "start:  node $dagmar/dist/daemon.js --config $state/config.yaml"
echo "cli:    node $dagmar/dist/cli.js --config $state/config.yaml ping"
