import { useState } from "react";
import type { Interaction, Json } from "../../dagmar-types.ts";
import { useDagmar } from "../../dagmar/DagmarProvider.tsx";
import { confirmPrompt, enumAnswer, parseGateJson, singleEnumChoices, turnAnswer, type Parsed } from "../../lib/answers.ts";
import { gateRequest, turnMessage, type DependencyResult, type HumanInteractionData } from "../../lib/pending.ts";
import { Button } from "../ui/Button.tsx";

const pre =
  "mt-1 overflow-x-auto rounded border border-border bg-surface-inset p-2 font-mono text-[11px] whitespace-pre-wrap break-words";
const textarea =
  "w-full rounded-md border border-border bg-surface-inset p-2 font-mono text-xs text-text-primary focus:border-accent focus:outline-none disabled:opacity-50";

// Gate and turn controls, shared by the node inspector and the dashboard run
// card. The answer goes through the provider's answerInteraction only; the
// provider refreshes runs and interactions afterwards. Pass `key={interaction.id}`
// so draft state never outlives the interaction it was typed for.
export function HumanInteraction({
  interaction,
  compact = false,
  dependencies = [],
}: {
  interaction: HumanInteractionData;
  // Dashboard card: clamp a long agent message.
  compact?: boolean;
  // Gate only: results of the gate's dependencies, collapsed.
  dependencies?: DependencyResult[];
}) {
  const { answerInteraction, connected } = useDagmar();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (answer: Json): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await answerInteraction(interaction.id, answer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "answer failed");
    } finally {
      setBusy(false);
    }
  };
  const disabled = busy || !connected;

  let body;
  if (interaction.kind === "gate") {
    const gate = gateRequest(interaction.request);
    body = gate ? (
      <GateControls prompt={gate.prompt} schema={gate.schema} dependencies={dependencies} disabled={disabled} send={send} />
    ) : (
      <Unexpected interaction={interaction} />
    );
  } else {
    const message = turnMessage(interaction.request);
    body =
      message === null ? (
        <Unexpected interaction={interaction} />
      ) : (
        <TurnControls message={message} compact={compact} disabled={disabled} send={send} />
      );
  }

  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      {body}
      {error && <div className="text-xs whitespace-pre-wrap text-error">{error}</div>}
    </div>
  );
}

function Unexpected({ interaction }: { interaction: Interaction }) {
  return (
    <div>
      <div className="text-xs text-error">Unexpected {interaction.kind} request shape.</div>
      <pre className={pre}>{JSON.stringify(interaction.request, null, 2)}</pre>
    </div>
  );
}

function GateControls({
  prompt,
  schema,
  dependencies,
  disabled,
  send,
}: {
  prompt: string;
  schema: Json | undefined;
  dependencies: DependencyResult[];
  disabled: boolean;
  send: (answer: Json) => Promise<void>;
}) {
  const choices = singleEnumChoices(schema);
  const [text, setText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  // The answer awaiting confirmation. A gate answer routes the run and cannot be undone.
  const [confirming, setConfirming] = useState<Json | undefined>(undefined);

  const review = (parsed: Parsed) => {
    if (parsed.ok) {
      setParseError(null);
      setConfirming(parsed.answer);
    } else {
      setParseError(parsed.error);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm whitespace-pre-wrap">{prompt}</p>
      {dependencies.length > 0 && (
        <div className="space-y-1">
          {dependencies.map((d) => (
            <details key={d.taskId} className="rounded border border-border bg-surface-inset px-2 py-1">
              <summary className="cursor-pointer font-mono text-xs text-text-secondary">
                {d.taskId}: {d.headline}
                {d.outcome === "blocked" && " (blocked)"}
              </summary>
              <pre className={pre}>{JSON.stringify(d.output, null, 2)}</pre>
            </details>
          ))}
        </div>
      )}
      {choices === null && (
        <>
          <div className="text-xs text-text-tertiary">Answer schema</div>
          <pre className={pre}>{schema === undefined ? "none" : JSON.stringify(schema, null, 2)}</pre>
        </>
      )}

      {confirming !== undefined ? (
        <div className="space-y-2">
          <div className="font-mono text-xs break-all text-text-primary">{confirmPrompt(confirming)}</div>
          <div className="flex gap-2">
            <Button variant="primary" disabled={disabled} onClick={() => void send(confirming)}>
              Confirm
            </Button>
            <Button disabled={disabled} onClick={() => setConfirming(undefined)}>
              Back
            </Button>
          </div>
        </div>
      ) : choices !== null ? (
        <div className="flex flex-wrap gap-2">
          {choices.values.map((v) => (
            <Button
              key={JSON.stringify(v)}
              variant="primary"
              disabled={disabled}
              onClick={() => setConfirming(enumAnswer(choices.key, v))}
            >
              {typeof v === "string" ? v : JSON.stringify(v)}
            </Button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            spellCheck={false}
            placeholder="JSON answer"
            disabled={disabled}
            className={textarea}
          />
          {parseError && <div className="text-xs text-error">{parseError}</div>}
          <Button variant="primary" disabled={disabled} onClick={() => review(parseGateJson(text))}>
            Review answer
          </Button>
        </div>
      )}
    </div>
  );
}

const CLAMP_LINES = 3;
const CLAMP_CHARS = 240;

function TurnControls({
  message,
  compact,
  disabled,
  send,
}: {
  message: string;
  compact: boolean;
  disabled: boolean;
  send: (answer: Json) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const clampable = compact && (message.length > CLAMP_CHARS || message.split("\n").length > CLAMP_LINES);

  const submit = () => {
    if (disabled) return;
    const parsed = turnAnswer(text);
    if (!parsed.ok) {
      setParseError(parsed.error);
      return;
    }
    setParseError(null);
    void send(parsed.answer);
  };

  return (
    <div className="space-y-2">
      <p className={`text-sm whitespace-pre-wrap ${clampable && !expanded ? "line-clamp-3" : ""}`}>{message}</p>
      {clampable && (
        <button
          type="button"
          className="text-xs text-accent hover:underline"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        rows={3}
        placeholder="Reply (Cmd/Ctrl+Enter sends)"
        disabled={disabled}
        className={textarea}
      />
      {parseError && <div className="text-xs text-error">{parseError}</div>}
      <Button variant="primary" disabled={disabled} onClick={submit}>
        Send
      </Button>
    </div>
  );
}
