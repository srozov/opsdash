import { describe, expect, test } from "bun:test";
import type { Json, TranscriptRecord } from "../dagmar-types.ts";
import { groupTranscript, selectedConfig } from "./transcript.ts";
import fixupJson from "./__fixtures__/s1-fixup-transcript.json";

// Captured from the S1 fixup attempt of the verification fixture (`raw` stripped).
const fixup = fixupJson as unknown as TranscriptRecord[];

const t = "2026-09-29T21:34:42.000Z";
const req = (id: number, method: string, params: Json): TranscriptRecord => ({
  type: "acp", direction: "to_executor", message: { jsonrpc: "2.0", id, method, params }, timestamp: t,
});
const res = (id: number): TranscriptRecord => ({
  type: "acp", direction: "from_executor", message: { jsonrpc: "2.0", id, result: {} }, timestamp: t,
});
const chunk = (sessionUpdate: string, text: string): TranscriptRecord => ({
  type: "acp", direction: "from_executor", timestamp: t,
  message: { jsonrpc: "2.0", method: "session/update", params: { sessionId: "s", update: { sessionUpdate, content: { type: "text", text } } } },
});
const prompt = (id: number, text: string) => req(id, "session/prompt", { sessionId: "s", prompt: [{ type: "text", text }] });
const lifecycle = (event: string, data?: object): TranscriptRecord => ({
  type: "lifecycle", direction: "internal", event, ...(data ? { data } : {}), timestamp: t,
} as TranscriptRecord);

describe("groupTranscript on the S1 fixup attempt", () => {
  const items = groupTranscript(fixup);

  test("the two replayed records collapse into one replay item", () => {
    const replays = items.filter((i) => i.kind === "replay");
    expect(replays).toHaveLength(1);
    const replay = replays[0]!;
    if (replay.kind !== "replay") throw new Error("unreachable");
    expect(replay.sessionId).toBe("fake-546660-1790717681869");
    expect(replay.replayed).toBe(2);
    expect(replay.done).toBe(true);
    // request + two replayed updates + response
    expect(replay.records).toHaveLength(4);
    expect(replay.items.map((i) => i.kind === "chunks" && i.text)).toEqual([
      "Earlier prompt (replayed).",
      "Earlier answer (replayed).",
    ]);
  });

  test("the replayed history does not leak into the live output", () => {
    const live = items.filter((i) => i.kind === "chunks");
    expect(live.map((i) => i.kind === "chunks" && [i.update, i.text])).toEqual([
      ["agent_thought_chunk", "Reading the report."],
      ["agent_message_chunk", '{"outcome":"completed","message":"fixup applied","output":{"fixed":true}}'],
    ]);
  });

  test("the only prompt is the first, contract-carrying one", () => {
    const prompts = items.filter((i) => i.kind === "prompt");
    expect(prompts).toHaveLength(1);
    const p = prompts[0]!;
    expect(p.kind === "prompt" && p.first).toBe(true);
    expect(p.kind === "prompt" && p.text.startsWith("Verification failed")).toBe(true);
  });

  test("every record appears in exactly one item, in order", () => {
    expect(items.flatMap((i) => i.records)).toEqual(fixup);
  });
});

describe("chunks", () => {
  test("consecutive chunks of one kind merge; a different kind starts a new block", () => {
    const items = groupTranscript([
      chunk("agent_message_chunk", "a"),
      chunk("agent_message_chunk", "b"),
      chunk("agent_thought_chunk", "c"),
      chunk("agent_message_chunk", "d"),
    ]);
    expect(items.map((i) => i.kind === "chunks" && i.text)).toEqual(["ab", "c", "d"]);
  });

  test("another record between chunks keeps them apart", () => {
    const items = groupTranscript([chunk("agent_message_chunk", "a"), lifecycle("acp_turn_completed"), chunk("agent_message_chunk", "b")]);
    expect(items.map((i) => i.kind)).toEqual(["chunks", "record", "chunks"]);
  });

  test("a chunk without text stays a generic row", () => {
    const image: TranscriptRecord = {
      type: "acp", direction: "from_executor", timestamp: t,
      message: { jsonrpc: "2.0", method: "session/update", params: { update: { sessionUpdate: "agent_message_chunk", content: { type: "image" } } } },
    };
    expect(groupTranscript([image]).map((i) => i.kind)).toEqual(["record"]);
  });
});

describe("prompts", () => {
  // An S3-style revise attempt: load, contract prompt, agent question, human reply, envelope.
  const revise = [
    req(1, "session/load", { sessionId: "s" }),
    chunk("agent_message_chunk", "old"),
    res(1),
    prompt(2, "contract and inputs"),
    chunk("agent_message_chunk", "What "),
    chunk("agent_message_chunk", "changed?"),
    res(2),
    prompt(3, "please rename it"),
    chunk("agent_message_chunk", "done"),
    res(3),
  ];

  test("only the first prompt is marked first; later prompts are human turns", () => {
    const prompts = groupTranscript(revise).filter((i) => i.kind === "prompt");
    expect(prompts.map((p) => p.kind === "prompt" && [p.first, p.text])).toEqual([
      [true, "contract and inputs"],
      [false, "please rename it"],
    ]);
  });

  test("the conversation reads as prompt, agent, prompt, agent", () => {
    const kinds = groupTranscript(revise).map((i) => i.kind);
    expect(kinds).toEqual(["replay", "prompt", "chunks", "record", "prompt", "chunks", "record"]);
  });

  test("a prompt with no text blocks stays a generic row", () => {
    expect(groupTranscript([req(2, "session/prompt", { prompt: [{ type: "image" }] })]).map((i) => i.kind)).toEqual(["record"]);
  });
});

describe("replay", () => {
  test("a load still in flight is an open replay holding every later record", () => {
    const items = groupTranscript([req(1, "session/load", { sessionId: "s" }), chunk("user_message_chunk", "x")]);
    expect(items).toHaveLength(1);
    const replay = items[0]!;
    expect(replay.kind === "replay" && [replay.done, replay.replayed]).toEqual([false, 1]);
  });

  test("a load with no replayed history is an empty replay", () => {
    const items = groupTranscript([req(1, "session/load", { sessionId: "s" }), res(1), prompt(2, "p")]);
    expect(items.map((i) => i.kind)).toEqual(["replay", "prompt"]);
    const replay = items[0]!;
    expect(replay.kind === "replay" && replay.replayed).toBe(0);
  });

  test("a response with a different id does not close the load", () => {
    const items = groupTranscript([req(1, "session/load", { sessionId: "s" }), res(7), res(1)]);
    const replay = items[0]!;
    expect(replay.kind === "replay" && [replay.replayed, replay.done]).toEqual([1, true]);
  });
});

describe("selectedConfig", () => {
  test("reads model and mode from the two lifecycle events", () => {
    expect(
      selectedConfig([lifecycle("acp_model_selected", { model: "opus" }), lifecycle("acp_mode_selected", { mode: "acceptEdits" })]),
    ).toEqual({ model: "opus", mode: "acceptEdits" });
  });
  test("is null when the profile selected nothing (the S1 fixture)", () => {
    expect(selectedConfig(fixup)).toEqual({ model: null, mode: null });
  });
});
