/**
 * keepAlive — Periodic health-check ping to prevent Heroku dyno idling.
 *
 * Heroku sleeps a dyno after ~30 minutes of no inbound traffic.
 * A lightweight GET /actuator/health every 25 minutes keeps the backend warm.
 *
 * - Only active in production (import.meta.env.PROD).
 * - Uses fetch with keepalive: true for reliability during page navigations.
 * - Idempotent: calling startKeepAlive() multiple times creates only one interval.
 * - GET /actuator/health is verified to be publicly accessible (permitAll in SecurityConfig).
 * - Uses fetch GET and NOT sendBeacon because sendBeacon sends POST; /actuator/health is GET-only.
 */

const PING_INTERVAL_MS = 25 * 60 * 1000; // 25 minutes
const HEALTH_PATH = '/actuator/health';

let intervalId: ReturnType<typeof setInterval> | null = null;

function getPingUrl(): string | null {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!baseUrl) return null;
  // Strip the /api/v1 suffix to reach the actuator root
  const origin = baseUrl.replace(/\/api\/v1\/?$/, '');
  return `${origin}${HEALTH_PATH}`;
}

function ping(): void {
  const url = getPingUrl();
  if (!url) return;
  // mode: 'no-cors' — we don't need to read the response, just keep the dyno alive.
  // keepalive: true — ensures the request completes even if the tab is navigated away.
  fetch(url, { method: 'GET', mode: 'no-cors', keepalive: true }).catch(() => {
    // Silently ignore — best-effort ping, not critical
  });
}

/**
 * Start the keep-alive interval.
 * No-op in development (import.meta.env.PROD === false).
 * Idempotent: safe to call multiple times.
 */
export function startKeepAlive(): void {
  if (!import.meta.env.PROD) return;
  if (intervalId !== null) return; // Already running
  ping(); // Immediate ping on mount
  intervalId = setInterval(ping, PING_INTERVAL_MS);
}

/**
 * Stop the keep-alive interval.
 * Useful for testing or unmounting.
 */
export function stopKeepAlive(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
