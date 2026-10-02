import type { Json } from "../dagmar-types.ts";

export type Parsed = { ok: true; answer: Json } | { ok: false; error: string };

// A gate schema that is exactly one property whose schema is an `enum` (the
// example workflow's {decision: approve|revise}) is answered with buttons.
// Anything else falls back to the JSON textarea; Dagmar validates the answer.
export function singleEnumChoices(schema: Json | undefined): { key: string; values: Json[] } | null {
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) return null;
  const props = schema.properties;
  if (typeof props !== "object" || props === null || Array.isArray(props)) return null;
  const keys = Object.keys(props);
  if (keys.length !== 1) return null;
  const prop = props[keys[0]!];
  if (typeof prop !== "object" || prop === null || Array.isArray(prop)) return null;
  if (!Array.isArray(prop.enum) || prop.enum.length === 0) return null;
  return { key: keys[0]!, values: prop.enum };
}

export function enumAnswer(key: string, value: Json): Json {
  return { [key]: value };
}

// Gate textarea: must be valid JSON; its shape is Dagmar's to judge.
export function parseGateJson(text: string): Parsed {
  try {
    return { ok: true, answer: JSON.parse(text) as Json };
  } catch (e) {
    return { ok: false, error: `Not valid JSON: ${e instanceof Error ? e.message : "parse error"}` };
  }
}

// Turn reply: the raw string, not an object. Blank replies are rejected here
// because Dagmar rejects them anyway.
export function turnAnswer(text: string): Parsed {
  if (text.trim() === "") return { ok: false, error: "Reply is empty." };
  return { ok: true, answer: text };
}

// The exact text shown in the confirm step: what will be sent.
export const confirmPrompt = (answer: Json): string => `Send ${JSON.stringify(answer)}?`;
