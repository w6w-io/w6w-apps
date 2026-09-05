/**
 * How much headroom is left on THIS credential — Insightly.
 *
 * Verified against `v3.1/help`'s "Rate Limit Response Header" section:
 * every Web API request returns `X-RateLimit-Limit` and
 * `X-RateLimit-Remaining` headers; a 429 is returned once the DAILY quota
 * (1,000-100,000 requests/day depending on plan) is exhausted, and the
 * allowance resets on a rolling 24-hour basis rather than at a fixed clock
 * time — so no `resetAt` is reported, only the remaining count.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness (the derived
 *     `auth:*` check) or platform status (`service`).
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct: the allowance belongs to the credential.
 *     Signing is safe because the probe stays on the app's own egress
 *     allowlist (`*.insightly.com`).
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /Users/Me`, the same scope-free whoami the auth `test` hook
 * uses. The pod comes from the Connection's redacted display data.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const headroom = (remaining?: number, limit?: number): HealthState => {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Daily per-instance allowance remaining, read off the X-RateLimit-* headers on the whoami " +
    "probe.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as { pod?: string };
    if (!display.pod) return { state: "unknown", message: "connection records no pod" };

    const res = await ctx.fetch(`${baseUrl(display.pod)}/Users/Me`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const limit = num(h.get("x-ratelimit-limit"));
    const remaining = num(h.get("x-ratelimit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no X-RateLimit-* headers" };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{ id: "instance", limit, remaining, unit: "requests" }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
