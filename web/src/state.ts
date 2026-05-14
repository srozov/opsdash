import type { ReactiveController, ReactiveControllerHost } from "lit";
import { fetchSnapshot, openEventStream } from "./client.ts";
import type { Snapshot } from "./client.ts";

export type Mode = "live" | "config";
export type LiveTab = "tasks" | "taskflows" | "cron-jobs" | "heartbeat" | "files";
export type ConfigTab = "standing-orders" | "hooks" | "webhooks";

export class OpsState implements ReactiveController {
  snapshot: Snapshot = { tasks: [], flows: [], cronJobs: [], generatedAt: 0 };
  mode: Mode = "live";
  liveTab: LiveTab = "tasks";
  configTab: ConfigTab = "standing-orders";
  loading = true;
  error: string | null = null;
  acks = new Set<string>();
  private host: ReactiveControllerHost;
  private closeStream?: () => void;

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this);
    try {
      const raw = localStorage.getItem("opsdash.acks");
      if (raw) this.acks = new Set(JSON.parse(raw));
    } catch {
      // ignore
    }
  }

  async hostConnected() {
    try {
      this.snapshot = await fetchSnapshot();
      this.loading = false;
      this.host.requestUpdate();
    } catch (err) {
      this.error = (err as Error).message;
      this.loading = false;
      this.host.requestUpdate();
    }
    this.closeStream = openEventStream((snap) => {
      this.snapshot = snap;
      this.host.requestUpdate();
    });
  }

  hostDisconnected() {
    this.closeStream?.();
  }

  setMode(mode: Mode) {
    this.mode = mode;
    this.host.requestUpdate();
  }

  setLiveTab(tab: LiveTab) {
    this.liveTab = tab;
    this.host.requestUpdate();
  }

  setConfigTab(tab: ConfigTab) {
    this.configTab = tab;
    this.host.requestUpdate();
  }

  toggleAck(id: string) {
    if (this.acks.has(id)) this.acks.delete(id);
    else this.acks.add(id);
    try {
      localStorage.setItem("opsdash.acks", JSON.stringify([...this.acks]));
    } catch {
      // ignore
    }
    this.host.requestUpdate();
  }
}

export function fmtAge(ms: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function fmtTime(ms: number | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}
