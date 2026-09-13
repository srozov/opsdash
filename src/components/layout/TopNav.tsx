import { NavLink } from "react-router-dom";
import { useDagmar } from "../../dagmar/DagmarProvider.tsx";
import { formatDuration } from "../../format.ts";
import { useNow } from "../../lib/useNow.ts";

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${
    isActive
      ? "bg-surface-elevated text-text-primary"
      : "text-text-secondary hover:text-text-primary"
  }`;

// Archon's legacy top-nav shell. The health widget on the right is Dagmar's
// connection state + version/uptime (Archon showed Docker/WSL health there).
export function TopNav() {
  const { connected, connectionError, ping } = useDagmar();
  useNow();
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-2">
      <div className="flex items-center gap-5">
        <span className="text-sm font-semibold tracking-tight">OpsDash</span>
        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={tabClass}>
            Dashboard
          </NavLink>
          <NavLink to="/workflows" className={tabClass}>
            Workflows
          </NavLink>
        </nav>
      </div>
      <div className="flex items-center gap-3 font-mono text-xs text-text-secondary">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: connected ? "var(--color-success)" : "var(--color-error)" }}
        />
        <span>{connected ? "connected" : "reconnecting…"}</span>
        {ping && <span>v{ping.version}</span>}
        {ping && <span title={ping.startedAt}>up {formatDuration(ping.startedAt, null)}</span>}
        {!connected && connectionError && (
          <span style={{ color: "var(--color-error)" }}>{connectionError}</span>
        )}
      </div>
    </header>
  );
}
