import { useEffect, useState } from "react";

// Re-render on an interval so live durations (elapsed, uptime) tick.
export function useNow(intervalMs = 1000): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
