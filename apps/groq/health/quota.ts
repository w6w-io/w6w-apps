/**
 * How much headroom is left on THIS credential — Groq.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:*` check answers "is the credential live"; this answers "will
 *     the next hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct here: the allowance belongs to the
 *     credential, and reading it needs the credential on the wire.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /openai/v1/models`, the same scope-free call the auth `test`
 * hook uses. Groq's rate-limit headers are byte-for-byte the same names and
 * shape as OpenAI's (`x-ratelimit-{limit,remaining}-{requests,tokens}` plus a
 * Go-style duration in `x-ratelimit-reset-*`, e.g. `2m59.56s` — confirmed
 * against console.groq.com/docs/rate-limits, 2026-09-05) and, per that same
 * page, are sent on EVERY response (not just errors) while `retry-after` is
 * sent only alongside a 429 — so a healthy 200 still carries full headroom.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Groq's reset headers are Go-style durations from now (`2m59.56s`,
 * `1h2m3s`, `120ms`), not instants — parse to an absolute time so a host can
 * cache against it.
 */
const isoFromDuration = (v: string | null): string | undefined => {
  if (!v) return undefined;
  let ms = 0;
  let matched = false;
  const re = /(\d+(?:\.\d+)?)(ms|[dhms])/g;
  const unit: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  for (const m of v.matchAll(re)) {
    matched = true;
    ms += Number(m[1]) * unit[m[2]];
  }
  return matched ? new Date(Date.now() + ms).toISOString() : undefined;
};

/**
 * Headroom is context, not a verdict — `severity: "informational"` means
 * this state never worsens a roll-up. It is reported honestly anyway so a UI
 * can show why a workflow is about to start getting 429s.
 */
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
    "Requests-per-minute and tokens-per-minute remaining, read off the `x-ratelimit-*` headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/models`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const reqLimit = num(h.get("x-ratelimit-limit-requests"));
    const reqRemaining = num(h.get("x-ratelimit-remaining-requests"));
    const tokLimit = num(h.get("x-ratelimit-limit-tokens"));
    const tokRemaining = num(h.get("x-ratelimit-remaining-tokens"));

    if (reqRemaining === undefined && tokRemaining === undefined) {
      return { state: "unknown", message: "response carried no x-ratelimit-* headers" };
    }

    return {
      // Worst bucket wins: tokens usually run out before requests do.
      state: worstHealthState([
        headroom(reqRemaining, reqLimit),
        headroom(tokRemaining, tokLimit),
      ]),
      quota: [
        {
          id: "requests",
          limit: reqLimit,
          remaining: reqRemaining,
          resetAt: isoFromDuration(h.get("x-ratelimit-reset-requests")),
          unit: "requests",
        },
        {
          id: "tokens",
          limit: tokLimit,
          remaining: tokRemaining,
          resetAt: isoFromDuration(h.get("x-ratelimit-reset-tokens")),
          unit: "tokens",
        },
      ],
      ttlSeconds: 60,
    };
  },
};

export default quota;
