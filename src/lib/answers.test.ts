import { describe, expect, test } from "bun:test";
import { confirmPrompt, enumAnswer, parseGateJson, singleEnumChoices, turnAnswer } from "./answers.ts";

const exampleSchema = {
  type: "object",
  required: ["decision"],
  properties: { decision: { enum: ["approve", "revise"] } },
};

describe("singleEnumChoices", () => {
  test("the example gate schema yields one choice per enum value", () => {
    expect(singleEnumChoices(exampleSchema)).toEqual({ key: "decision", values: ["approve", "revise"] });
  });
  test("the answer it produces is {key: value}, shown exactly in the confirm", () => {
    expect(enumAnswer("decision", "revise")).toEqual({ decision: "revise" });
    expect(confirmPrompt(enumAnswer("decision", "revise"))).toBe('Send {"decision":"revise"}?');
  });
  test("anything but exactly one enum property falls back to JSON", () => {
    expect(singleEnumChoices(undefined)).toBe(null);
    expect(singleEnumChoices(true)).toBe(null);
    expect(singleEnumChoices({ type: "object" })).toBe(null);
    expect(singleEnumChoices({ properties: {} })).toBe(null);
    expect(singleEnumChoices({ properties: { a: { enum: ["x"] }, b: { enum: ["y"] } } })).toBe(null);
    expect(singleEnumChoices({ properties: { a: { type: "string" } } })).toBe(null);
    expect(singleEnumChoices({ properties: { a: { enum: [] } } })).toBe(null);
    expect(singleEnumChoices({ properties: { a: true } })).toBe(null);
  });
});

describe("parseGateJson", () => {
  test("valid JSON of any shape is accepted without schema checks", () => {
    expect(parseGateJson('{"decision":"approve"}')).toEqual({ ok: true, answer: { decision: "approve" } });
    expect(parseGateJson('{"nonsense":1}')).toEqual({ ok: true, answer: { nonsense: 1 } });
    expect(parseGateJson("[1]")).toEqual({ ok: true, answer: [1] });
  });
  test("invalid JSON and empty text are rejected", () => {
    expect(parseGateJson("{decision: approve}").ok).toBe(false);
    expect(parseGateJson("").ok).toBe(false);
  });
});

describe("turnAnswer", () => {
  test("the answer is the raw string, untrimmed", () => {
    expect(turnAnswer("  use tabs\n")).toEqual({ ok: true, answer: "  use tabs\n" });
  });
  test("blank and whitespace-only replies are rejected", () => {
    expect(turnAnswer("").ok).toBe(false);
    expect(turnAnswer(" \n\t ").ok).toBe(false);
  });
});
