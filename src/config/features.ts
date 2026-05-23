/**
 * Frontend feature flags.
 *
 * NOTE:
 * When ENABLE_SAM is false, SAM is hidden and disabled only in the frontend.
 * Backend SAM endpoints may still exist and remain callable by authenticated users.
 *
 * Tech debt:
 * If SAM stays disabled long-term, consider adding a backend guard that returns
 * 503 Service Unavailable when SAM is turned off or not configured.
 */
export const FEATURES = {
  ENABLE_SAM: import.meta.env.VITE_ENABLE_SAM === 'true',
} as const;
