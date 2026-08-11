import type { HealthCheckDefinition } from "@w6w/types";
import { siteUrlFromConnection } from "../lib/client.ts";

/**
 * How much request headroom does this server publish?
 *
 * ## This is a live probe, and that makes it the exception in this pack
 *
 * Most apps here declare `quota` as `unavailable` because the vendor exposes
 * nothing to read. Mattermost is different: when rate limiting is switched on it
 * emits the standard trio, documented in its own API reference and shown in the
 * vendor's login example:
 *
 *     X-Ratelimit-Limit: 10
 *     X-Ratelimit-Remaining: 9
 *     X-Ratelimit-Reset: 1
 *
 * So there is genuinely something to read — sometimes.
 *
 * ## …but it is off by default, which is why the severity is `informational`
 *
 * Rate limiting is a server setting (**System Console → Environment → Rate
 * Limiting**, `RateLimitSettings.Enable`) and it is **off by default**. Verified
 * on the wire against `community.mattermost.com` (server 11.11.0) on 2026-08-11:
 * a request returned `x-request-id` and `x-version-id` and **no** `X-Ratelimit-*`
 * header at all.
 *
 * A check that reports `unknown` on every server whose operator left the default
 * alone must not be allowed to drag the App's verdict there — `unknown` outranks
 * `ok` in the roll-up. `informational` says what this is: real and worth
 * displaying when present, and silent when the server simply does not publish
 * it.
 *
 * The alternative — declaring it `unavailable` — would be a worse answer,
 * because it would be false for every operator who *has* turned rate limiting
 * on, which is the common configuration for an internet-facing server.
 *
 * ## Posture
 *
 * `credential: "none"`, and the probe is the unauthenticated
 * `/api/v4/system/ping`. Mattermost's rate limiting is applied per IP (and
 * optionally per user or per header) at the proxy layer in front of the API, so
 * an unsigned request reports the same headroom as a signed one — and this way
 * the token is never sent to satisfy a metric.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description:
    "Reads X-Ratelimit-Remaining from this server. Mattermost only emits it when rate limiting " +
    "is enabled in the System Console, which is off by default — hence informational.",
  kind: "quota",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let base: string;
    try {
      base = siteUrlFromConnection(ctx.connection);
    } catch (err) {
      return { state: "unknown", message: (err as Error).message };
    }

    const res = await ctx.fetch(`${base}/api/v4/system/ping`, {
      headers: { accept: "application/json" },
    });

    const limit = res.headers.get("x-ratelimit-limit");
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = res.headers.get("x-ratelimit-reset");

    if (remaining === null) {
      return {
        state: "unknown",
        message:
          "This server publishes no X-Ratelimit-* headers — rate limiting is disabled in the " +
          "System Console (the default).",
      };
    }

    const remainingCount = Number(remaining);
    const limitCount = limit === null ? undefined : Number(limit);
    if (!Number.isFinite(remainingCount)) {
      return { state: "unknown", message: `Unreadable X-Ratelimit-Remaining: ${remaining}` };
    }

    // A ratio, not an absolute: Mattermost's default limit is 10 requests per
    // second per IP, so "3 remaining" is routine there and alarming on a server
    // configured for 100.
    const ratio = limitCount && limitCount > 0 ? remainingCount / limitCount : undefined;
    const state = remainingCount === 0
      ? "degraded"
      : ratio !== undefined && ratio < 0.1
      ? "degraded"
      : "ok";

    const parts = [`${remainingCount}${limitCount ? `/${limitCount}` : ""} remaining`];
    if (reset) parts.push(`resets in ${reset}s`);

    return { state, message: parts.join(", "), ttlSeconds: 60 };
  },
};

export default quota;
