import type { RunResult } from "./process.ts";

const RATE_LIMIT_PATTERNS = [
  /rate limit/i,
  /ratelimitexceeded/i,
  /eresult\s*84/i, // Steam's RateLimitExceeded EResult code
];

export function isRateLimitError(output: string): boolean {
  return RATE_LIMIT_PATTERNS.some((pattern) => pattern.test(output));
}

export interface BackoffOptions {
  baseDelayMs: number;
  maxDelayMs: number;
  /** Called before each retry sleep, e.g. for logging. */
  onRetry?: (attempt: number, delayMs: number) => void;
}

/**
 * Retries `run()` forever, but *only* when its result looks like a Steam
 * rate-limit response. Any other failure (bad mod id, network error,
 * missing binary, wrong password, etc.) is returned immediately without
 * retrying — this backoff exists solely to ride out rate limiting.
 */
export async function withRateLimitBackoff(
  run: () => Promise<RunResult>,
  options: BackoffOptions,
): Promise<RunResult> {
  let attempt = 0;

  while (true) {
    const result = await run();

    if (result.code === 0 || !isRateLimitError(result.output)) {
      return result;
    }

    attempt++;
    const delayMs = Math.min(
      options.maxDelayMs,
      options.baseDelayMs * 2 ** (attempt - 1),
    );
    options.onRetry?.(attempt, delayMs);
    await sleep(delayMs);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
