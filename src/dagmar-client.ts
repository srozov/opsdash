import type { DagmarEvent, Json, JsonObject } from "./dagmar-types.ts";

// Reconnect backoff schedule in milliseconds. After exhausting the list the
// last delay repeats.
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000];
// Reject a request that Dagmar never answers.
const REQUEST_TIMEOUT_MS = 15000;

export class DagmarError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly data?: Json,
  ) {
    super(message);
    this.name = "DagmarError";
  }
}

export interface DagmarClientHandlers {
  // Fired after a connection opens and an event subscription is established.
  // The application should resubscribe its view by reloading current state.
  onOpen(): void;
  // Fired when the socket closes or fails; the client will keep retrying.
  onClose(error: string | null): void;
  // A Dagmar event notification.
  onEvent(event: DagmarEvent): void;
}

interface Pending {
  resolve(value: Json): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
}

// Owns the WebSocket JSON-RPC transport to Dagmar: request correlation, event
// delivery, request timeouts, and reconnection. It holds protocol state only;
// workflow and run data live in the application.
export class DagmarClient {
  private socket?: WebSocket;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private reconnectAttempt = 0;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private stopped = false;

  constructor(
    private readonly url: string,
    private readonly handlers: DagmarClientHandlers,
  ) {}

  start(): void {
    this.stopped = false;
    this.open();
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer !== undefined) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.socket?.close();
    this.socket = undefined;
    this.failPending(new DagmarError("disconnected", "Client stopped"));
  }

  // Typed JSON-RPC request. The wire value is JSON; the caller asserts the
  // decoded shape via T. Rejects with a DagmarError on RPC error, timeout, or
  // socket close.
  request<T = Json>(method: string, params: JsonObject = {}): Promise<T> {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new DagmarError("disconnected", "Not connected to Dagmar"));
    }
    const id = this.nextId++;
    return new Promise<Json>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new DagmarError("timeout", `Request ${method} timed out`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
    }) as unknown as Promise<T>;
  }

  private open(): void {
    const socket = new WebSocket(this.url);
    this.socket = socket;
    socket.addEventListener("open", () => {
      // Subscribe to future events first, then let the application reload state
      // so nothing is missed in the gap. Ignore any prior event sequence:
      // Dagmar resets it on restart.
      this.request("events.subscribe", {})
        .then(() => {
          this.reconnectAttempt = 0;
          this.handlers.onOpen();
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Subscription failed";
          socket.close();
          this.handlers.onClose(message);
        });
    });
    socket.addEventListener("message", (event) => this.receive(String(event.data)));
    socket.addEventListener("close", () => this.handleClose("Connection to Dagmar closed"));
    socket.addEventListener("error", () => {
      // A browser WebSocket error is always followed by a close event, which
      // drives reconnection; surface a message here.
      this.handlers.onClose("Connection to Dagmar failed");
    });
  }

  private handleClose(reason: string): void {
    this.failPending(new DagmarError("disconnected", reason));
    if (this.stopped) return;
    this.handlers.onClose(reason);
    const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)]!;
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => this.open(), delay);
  }

  private failPending(error: Error): void {
    for (const item of this.pending.values()) {
      clearTimeout(item.timer);
      item.reject(error);
    }
    this.pending.clear();
  }

  private receive(raw: string): void {
    let value: Record<string, unknown>;
    try {
      value = JSON.parse(raw);
    } catch {
      return;
    }
    if (value.method === "event") {
      const event = value.params;
      if (event && typeof event === "object" && typeof (event as DagmarEvent).sequence === "number") {
        this.handlers.onEvent(event as DagmarEvent);
      }
      return;
    }
    if (typeof value.id !== "number") return;
    const pending = this.pending.get(value.id);
    if (!pending) return;
    this.pending.delete(value.id);
    clearTimeout(pending.timer);
    if (value.error && typeof value.error === "object") {
      const error = value.error as { message?: unknown; data?: unknown };
      const detail = error.data as { code?: unknown; data?: Json } | undefined;
      const code = typeof detail?.code === "string" ? detail.code : "rpc_error";
      const message = typeof error.message === "string" ? error.message : "RPC failed";
      pending.reject(new DagmarError(code, message, detail?.data));
    } else {
      pending.resolve((value.result ?? null) as Json);
    }
  }
}
