// Dependency-free fake ACP agent (NDJSON JSON-RPC over stdio) for the T6 fixture.
// It answers the review-iteration-loop prompts deterministically so the whole
// workflow runs without a paid agent. Keyed off the prompt text of each task.
//
//   FAKE_ACP_DELAY_MS   delay before each prompt is answered (default 0)
import { createInterface } from "node:readline";

const delay = Number(process.env.FAKE_ACP_DELAY_MS ?? 0);
const send = (x) => process.stdout.write(JSON.stringify(x) + "\n");
const chunk = (sessionId, kind, text) =>
  send({
    jsonrpc: "2.0",
    method: "session/update",
    params: { sessionId, update: { sessionUpdate: kind, content: { type: "text", text } } },
  });
const envelope = (message, output) => JSON.stringify({ outcome: "completed", message, output });

let sessionId = "fake-session";
// Interactive-turn state lives in this process: it relies on Dagmar running one attempt per agent
// process, so the count starts at zero for every interactive task.
let interactiveTurns = 0;

function reply(text) {
  // First interactive turn carries the multi-turn contract; the agent asks a question.
  if (text.includes("multi-turn interactive task")) {
    interactiveTurns = 1;
    return { thought: "The reviewer's notes are in the inputs.", message: "What would you like changed?" };
  }
  if (interactiveTurns === 1) {
    interactiveTurns = 2;
    return { message: `Applied your change: ${JSON.stringify(text)}. Anything else?` };
  }
  if (interactiveTurns === 2) {
    interactiveTurns = 3;
    return { message: envelope("revised with the user", { turns: 3 }) };
  }
  if (text.startsWith("Implement the task")) {
    return {
      thought: "Planning the change.",
      message: envelope("implemented", { notes: "Fake implementation; kept the design minimal." }),
    };
  }
  if (text.startsWith("Verification failed")) {
    return { thought: "Reading the report.", message: envelope("fixup applied", { fixed: true }) };
  }
  if (text.startsWith("You are now the reviewer")) {
    return {
      message: envelope("review done", {
        verdict: "approve",
        concerns: [],
        on_builder_notes: "Agree with the builder's stated decision to keep the design minimal.",
      }),
    };
  }
  return { message: envelope("unrecognized prompt", { prompt: text.slice(0, 80) }) };
}

createInterface({ input: process.stdin }).on("line", async (line) => {
  const m = JSON.parse(line);
  switch (m.method) {
    case "initialize":
      send({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: 1, agentCapabilities: { loadSession: true } } });
      break;
    case "session/new":
      sessionId = `fake-${process.pid}-${Date.now()}`;
      send({ jsonrpc: "2.0", id: m.id, result: { sessionId } });
      break;
    case "session/load":
      // ACP agents replay the loaded session's history as session/update notifications.
      sessionId = m.params.sessionId;
      chunk(sessionId, "user_message_chunk", "Earlier prompt (replayed).");
      chunk(sessionId, "agent_message_chunk", "Earlier answer (replayed).");
      send({ jsonrpc: "2.0", id: m.id, result: {} });
      break;
    case "session/prompt": {
      const text = m.params.prompt.map((b) => (b.type === "text" ? b.text : "")).join("");
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      const out = reply(text);
      if (out.thought) chunk(sessionId, "agent_thought_chunk", out.thought);
      // Split the message so chunk coalescing has something to merge.
      const mid = Math.ceil(out.message.length / 2);
      chunk(sessionId, "agent_message_chunk", out.message.slice(0, mid));
      chunk(sessionId, "agent_message_chunk", out.message.slice(mid));
      send({ jsonrpc: "2.0", id: m.id, result: { stopReason: "end_turn" } });
      break;
    }
    case "session/close":
      send({ jsonrpc: "2.0", id: m.id, result: {} });
      break;
    default:
      if (m.id !== undefined) {
        send({ jsonrpc: "2.0", id: m.id, error: { code: -32601, message: `unsupported: ${m.method}` } });
      }
  }
});
