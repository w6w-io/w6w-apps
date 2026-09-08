/**
 * How much rate-limit headroom is left on THIS credential.
 *
 * **Entirely undocumented in the OpenAPI spec** (which only says, in prose, "wait for the
 * duration specified in the `Retry-After` header" on a 429). Verified live 2026-09-06 against
 * `GET /testAuth` — every response, including a 401 from an invalid key, actually carries two
 * header families:
 *
 *   - `X-Ip-Rate-Limit-{Limit,Remaining,Reset}` — keyed by caller IP.
 *   - `X-Api-Key-Rate-Limit-{Limit,Remaining,Reset}` — keyed by the literal key string sent (a
 *     garbage key still gets its own fresh bucket, observed at 2500).
 *
 * This check reads the per-key trio, since that is the budget this Connection's credential
 * actually owns. `Reset` was observed as Unix epoch seconds.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness (the derived `auth:*` check) or
 *     platform status (`service`).
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults and both are
 *     correct: the allowance belongs to the key this Connection holds.
 *   - `severity: "informational"` — running low is worth showing and never worth failing a
 *     verdict over.
 *
 * Probe: `GET /testAuth`, the same liveness call the auth `test` hook uses, so one request
 * answers both "is the key live?" and "how much headroom is left?" when both checks run close
 * together.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

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
  title: "API key rate-limit headroom",
  description:
    "Per-key allowance remaining, read off the undocumented X-Api-Key-Rate-Limit-* headers on " +
    "the testAuth probe.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/testAuth`);
    if (!res.ok && res.status !== 401) {
      return { state: "unknown", message: `quota probe returned ${res.status}` };
    }

    const h = res.headers;
    const limit = num(h.get("x-api-key-rate-limit-limit"));
    const remaining = num(h.get("x-api-key-rate-limit-remaining"));
    const resetAt = num(h.get("x-api-key-rate-limit-reset"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no X-Api-Key-Rate-Limit-* headers" };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "api-key",
        limit,
        remaining,
        unit: "requests",
        resetAt: resetAt !== undefined ? new Date(resetAt * 1000).toISOString() : undefined,
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
