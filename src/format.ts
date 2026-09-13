// Small pure formatting helpers shared by the run list, graph nodes, and task
// inspector (used in three places across files, so extracted here).

// Abbreviate a long identifier for display; the full value belongs in a title
// attribute.
export function shortId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 10)}…` : id;
}

// Compact local timestamp for list rows and metadata.
export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Human duration between two timestamps. When `endIso` is null the interval is
// measured to now (a still-running attempt or run).
export function formatDuration(startIso: string, endIso: string | null): string {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end)) return "—";
  let ms = Math.max(0, end - start);
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  const parts: string[] = [];
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  parts.push(`${rest}s`);
  return parts.join(" ");
}
