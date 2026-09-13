import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DagmarClient } from "../dagmar-client.ts";
import type {
  DagmarEvent,
  Interaction,
  Json,
  PingResult,
  RunSummary,
  RunView,
  TranscriptReadResult,
  TranscriptRecord,
  WorkflowListResult,
} from "../dagmar-types.ts";

// Dagmar is reached through Tailscale Serve on the same tailnet host that serves
// OpsDash. Derive the endpoint from the page hostname.
const DAGMAR_URL = `wss://${location.hostname}:7331`;

const msg = (e: unknown): string => (e instanceof Error ? e.message : "request failed");

interface DagmarContextValue {
  connected: boolean;
  connectionError: string | null;
  epoch: number;
  ping: PingResult | null;
  workflows: WorkflowListResult | null;
  workflowsError: string | null;
  runs: RunSummary[];
  runsError: string | null;
  interactions: Interaction[];
  client: DagmarClient;
  subscribe: (fn: (event: DagmarEvent) => void) => () => void;
  refreshRuns: () => Promise<void>;
  refreshInteractions: () => Promise<void>;
  startRun: (workflowId: string, input: Json) => Promise<{ workflowRunId: string; status: string }>;
  cancelRun: (workflowRunId: string) => Promise<RunView>;
  resumeRun: (workflowRunId: string) => Promise<RunView>;
  cancelTask: (taskRunId: string) => Promise<RunView>;
  answerInteraction: (interactionId: string, response: Json) => Promise<RunView>;
}

const DagmarContext = createContext<DagmarContextValue | null>(null);

export function DagmarProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<DagmarClient | null>(null);
  const listenersRef = useRef(new Set<(event: DagmarEvent) => void>());

  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [epoch, setEpoch] = useState(0);
  const [ping, setPing] = useState<PingResult | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowListResult | null>(null);
  const [workflowsError, setWorkflowsError] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);

  const refreshRuns = useCallback(async () => {
    const c = clientRef.current;
    if (!c) return;
    try {
      const list = await c.request<RunSummary[]>("run.list");
      setRuns([...list].sort((a, b) => b.startedAt.localeCompare(a.startedAt)));
      setRunsError(null);
    } catch (e) {
      setRunsError(msg(e));
    }
  }, []);

  const refreshInteractions = useCallback(async () => {
    const c = clientRef.current;
    if (!c) return;
    try {
      setInteractions(await c.request<Interaction[]>("interaction.list"));
    } catch {
      // Secondary data; keep the last known list.
    }
  }, []);

  const loadAll = useCallback(async () => {
    const c = clientRef.current;
    if (!c) return;
    await Promise.all([
      (async () => {
        try {
          setPing(await c.request<PingResult>("system.ping"));
        } catch {
          setPing(null);
        }
      })(),
      (async () => {
        try {
          setWorkflows(await c.request<WorkflowListResult>("workflow.list"));
          setWorkflowsError(null);
        } catch (e) {
          setWorkflowsError(msg(e));
        }
      })(),
      refreshRuns(),
      refreshInteractions(),
    ]);
  }, [refreshRuns, refreshInteractions]);

  useEffect(() => {
    const client = new DagmarClient(DAGMAR_URL, {
      onOpen: () => {
        setConnected(true);
        setConnectionError(null);
        setEpoch((e) => e + 1);
        void loadAll();
      },
      onClose: (error) => {
        setConnected(false);
        setConnectionError(error);
      },
      onEvent: (event) => {
        for (const fn of listenersRef.current) fn(event);
        if (event.type === "workflow.status_changed") void refreshRuns();
        if (event.type === "interaction.changed") void refreshInteractions();
      },
    });
    clientRef.current = client;
    client.start();
    return () => {
      client.stop();
      clientRef.current = null;
    };
  }, [loadAll, refreshRuns, refreshInteractions]);

  const subscribe = useCallback((fn: (event: DagmarEvent) => void) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  }, []);

  const startRun = useCallback(
    async (workflowId: string, input: Json) => {
      const result = await clientRef.current!.request<{ workflowRunId: string; status: string }>(
        "run.start",
        { workflowId, input },
      );
      await refreshRuns();
      return result;
    },
    [refreshRuns],
  );

  const writeRun = useCallback(
    async (method: string, params: Record<string, Json>) => {
      const run = await clientRef.current!.request<RunView>(method, params);
      await refreshRuns();
      return run;
    },
    [refreshRuns],
  );

  const cancelRun = useCallback(
    (workflowRunId: string) => writeRun("run.cancel", { workflowRunId }),
    [writeRun],
  );
  const resumeRun = useCallback(
    (workflowRunId: string) => writeRun("run.resume", { workflowRunId }),
    [writeRun],
  );
  const cancelTask = useCallback(
    (taskRunId: string) => writeRun("task.cancel", { taskRunId }),
    [writeRun],
  );
  const answerInteraction = useCallback(
    async (interactionId: string, response: Json) => {
      const run = await clientRef.current!.request<RunView>("interaction.answer", {
        interactionId,
        response,
      });
      await Promise.all([refreshRuns(), refreshInteractions()]);
      return run;
    },
    [refreshRuns, refreshInteractions],
  );

  const value = useMemo<DagmarContextValue>(
    () => ({
      connected,
      connectionError,
      epoch,
      ping,
      workflows,
      workflowsError,
      runs,
      runsError,
      interactions,
      client: clientRef.current as DagmarClient,
      subscribe,
      refreshRuns,
      refreshInteractions,
      startRun,
      cancelRun,
      resumeRun,
      cancelTask,
      answerInteraction,
    }),
    [
      connected,
      connectionError,
      epoch,
      ping,
      workflows,
      workflowsError,
      runs,
      runsError,
      interactions,
      subscribe,
      refreshRuns,
      refreshInteractions,
      startRun,
      cancelRun,
      resumeRun,
      cancelTask,
      answerInteraction,
    ],
  );

  return <DagmarContext.Provider value={value}>{children}</DagmarContext.Provider>;
}

export function useDagmar(): DagmarContextValue {
  const ctx = useContext(DagmarContext);
  if (!ctx) throw new Error("useDagmar must be used within a DagmarProvider");
  return ctx;
}

// Load one run's full RunView and keep it fresh from events for that run.
export function useRun(runId: string | undefined): {
  run: RunView | null;
  error: string | null;
  reload: () => Promise<void>;
} {
  const { client, subscribe, epoch } = useDagmar();
  const [run, setRun] = useState<RunView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!runId) {
      setRun(null);
      return;
    }
    try {
      const r = await client.request<RunView>("run.get", { workflowRunId: runId });
      setRun(r);
      setError(null);
    } catch (e) {
      setError(msg(e));
    }
  }, [client, runId]);

  useEffect(() => {
    void load();
  }, [load, epoch]);

  useEffect(() => {
    if (!runId) return;
    return subscribe((event) => {
      if (
        event.workflowRunId === runId &&
        (event.type === "task.status_changed" ||
          event.type === "workflow.status_changed" ||
          event.type === "interaction.changed")
      ) {
        void load();
      }
    });
  }, [subscribe, runId, load]);

  return { run, error, reload: load };
}

// Load and incrementally append one attempt's transcript.
export function useTranscript(taskRunId: string | null): {
  records: TranscriptRecord[];
  error: string | null;
} {
  const { client, subscribe, epoch } = useDagmar();
  const [records, setRecords] = useState<TranscriptRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const nextLineRef = useRef(0);

  useEffect(() => {
    setRecords([]);
    setError(null);
    nextLineRef.current = 0;
    if (!taskRunId) return;
    let cancelled = false;
    const read = async (afterLine: number, append: boolean) => {
      try {
        const result = await client.request<TranscriptReadResult>("transcript.read", {
          taskRunId,
          afterLine,
        });
        if (cancelled) return;
        nextLineRef.current = result.nextLine;
        setRecords((prev) => (append ? [...prev, ...result.records] : result.records));
      } catch (e) {
        if (!cancelled) setError(msg(e));
      }
    };
    void read(0, false);
    const unsub = subscribe((event) => {
      if (event.type === "transcript.appended" && event.taskRunId === taskRunId) {
        void read(nextLineRef.current, true);
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [client, subscribe, taskRunId, epoch]);

  return { records, error };
}
