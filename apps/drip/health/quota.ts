/**
 * How much of this token's hourly rate limit is left?
 *
 * Drip's "Rate Limiting" section documents `X-RateLimit-Limit` and
 * `X-RateLimit-Remaining` as present on every rate-limited response — shown
 * unconditionally in the docs' own example (unlike some vendors, who only
 * emit the headers once a caller is already at the ceiling), so this reads
 * them off an ordinary signed request rather than declaring the check
 * unavailable.
 *
 * The published ceiling is **3,600 individual requests per hour** per token
 * (batch endpoints are metered separately: 50 requests/hour, up to 1,000
 * records each) — carried here only to caption a reading when Drip omits
 * `X-RateLimit-Limit` itself.
 *
 * Rides on `GET /v2/user` — the cheapest authenticated call Drip publishes,
 * already used by the auth `test` hook, so this spends nothing extra beyond
 * what liveness already costs.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState, HookContext } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

export const LIMIT_HEADER = "x-ratelimit-limit";
export const REMAINING_HEADER = "x-ratelimit-remaining";

/** Drip's documented ceiling for individual (non-batch) requests. */
export const DOCUMENTED_LIMIT = 3600;

/** Remaining at or below this fraction of the limit is worth flagging. */
export const WARN_FRACTION = 0.1;

function parseCount(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === "") return undefined;
  const n = Number(raw.trim());
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export interface HeadroomReading {
  state: HealthState;
  message?: string;
  quota?: HealthQuota[];
}

/** Turn a set of response headers into a state + quota reading. */
export function readHeadroom(headers: Headers): HeadroomReading {
  const limit = parseCount(headers.get(LIMIT_HEADER));
  const remaining = parseCount(headers.get(REMAINING_HEADER));

  if (remaining === undefined) {
    return {
      state: "unknown",
      message: `Drip sent no ${REMAINING_HEADER} header on this response.`,
    };
  }

  const ceiling = limit ?? DOCUMENTED_LIMIT;
  const quota: HealthQuota = {
    id: "requests-per-hour",
    limit: ceiling,
    remaining,
    unit: "requests",
  };
  const caption = `${remaining}/${ceiling} requests remaining this hour`;

  if (ceiling <= 0) {
    return {
      state: "unknown",
      message: `Drip reported a non-positive rate limit (${ceiling})`,
      quota: [quota],
    };
  }
  if (remaining === 0) {
    return {
      state: "degraded",
      message: `Drip's hourly rate limit is exhausted — ${caption}`,
      quota: [quota],
    };
  }
  if (remaining / ceiling <= WARN_FRACTION) {
    return {
      state: "degraded",
      message: `Drip's hourly rate limit is nearly exhausted — ${caption}`,
      quota: [quota],
    };
  }
  return { state: "ok", message: caption, quota: [quota] };
}

/**
 * This check needs the raw `Response` headers, not the parsed body
 * `lib/client.ts#request` returns — so it calls `ctx.fetch` directly rather
 * than going through `DripClient`.
 */
async function probe(ctx: HookContext): Promise<Headers> {
  const res = await ctx.fetch(`${API_BASE}/user`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Drip returned ${res.status} for GET /user`);
  return res.headers;
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request-rate headroom",
  description:
    "Reads X-RateLimit-Limit / X-RateLimit-Remaining off a signed GET /v2/user. Ceiling is 3,600 " +
    "individual requests per hour per token; batch endpoints are metered separately (50/hour).",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let headers: Headers;
    try {
      headers = await probe(ctx);
    } catch (err) {
      // A rejected credential says nothing about headroom — that's the
      // derived `auth:api-key` check's question.
      return {
        state: "unknown",
        message: `quota probe failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    return { ...readHeadroom(headers), ttlSeconds: 60 };
  },
};

export default quota;
