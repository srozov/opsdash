// A rounded status pill colored by Dagmar run/task/attempt state, using the
// per-state CSS variables from theme.css (Archon-style bg-<status>/20 look).
export function StatusBadge({ state, className = "" }: { state: string; className?: string }) {
  const color = `var(--state-${state})`;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-xs font-medium whitespace-nowrap ${className}`}
      style={{ color, backgroundColor: `color-mix(in oklab, ${color} 20%, transparent)` }}
    >
      {state}
    </span>
  );
}
