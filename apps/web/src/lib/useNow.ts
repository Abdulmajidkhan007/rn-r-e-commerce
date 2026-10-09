import { useEffect, useState } from 'react';

/**
 * Current time for render-time comparisons (promo expiry, report buckets),
 * captured outside render and refreshed every minute. Render must stay pure,
 * so components never call Date.now() directly.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
