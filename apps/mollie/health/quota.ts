/**
 * Rate-limit headroom.
 *
 * `docs.mollie.com/reference/rate-limiting` documents real, structured
 * headers on **every** response: `RateLimit-Policy` (`"policy";q=<quota
 * req/s>;w=<window s>`) and `RateLimit` (`"policy";r=<remaining>;t=<seconds
 * to next slot>`), an IETF-draft-style structured field, plus `Retry-After`
 * on a `429`. The page itself carries a banner: *"This feature is being
 * rolled out gradually and may not be available to everyone yet."*
 *
 * Live probes against `api.mollie.com/v2/methods` on 2026-09-01 (both
 * unauthenticated and with a syntactically-plausible key) carried **no**
 * `RateLimit*` header at all — consistent with the documented gradual
 * rollout rather than a vendor that never publishes one. Because this app
 * has no real credential to probe with, and the feature is explicitly
 * opt-in-by-rollout rather than universal, this check is a **live probe**
 * that reports `unknown` (not `down`, and not a declared absence) whenever
 * the headers are missing — the same "a broken/incomplete answer says
 * nothing about health" discipline this pack applies to a broken feed. An
 * account the rollout has reached gets a real reading; one it hasn't gets an
 * honest "can't tell", not a permanent gap.
 */
import type { HealthCheckDefinition, HealthQuota } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/bearer.ts";

/** Consumption at or above this fraction of the bucket is worth flagging. */
export const WARN_FRACTION = 0.9;

/**
 * Parse an IETF-structured-field-shaped header value:
 * `"policy-name";r=15;t=2;mollie-burst=60` or `"policy-name";q=20;w=3;mollie-burst=60`.
 * Returns the quoted token as `policy` plus every `key=number` pair.
 */
export function parseRateLimitHeader(value: string): {
  policy?: string;
  fields: Record<string, number>;
} {
  const fields: Record<string, number> = {};
  const policyMatch = value.match(/^"([^"]*)"/);
  const rest = value.slice(policyMatch?.[0]?.length ?? 0);
  for (const m of rest.matchAll(/([a-zA-Z-]+)\s*=\s*(-?\d+)/g)) {
    fields[m[1]] = Number(m[2]);
  }
  return { policy: policyMatch?.[1], fields };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description:
    "Reads the documented RateLimit/RateLimit-Policy structured headers. Mollie's own docs say " +
    "this feature is rolled out gradually per account — a response with no such header reports " +
    "`unknown`, not a failure.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json" },
    });

    const rateLimit = res.headers.get("ratelimit");
    const rateLimitPolicy = res.headers.get("ratelimit-policy");
    if (!rateLimit) {
      return {
        state: "unknown",
        message: "No RateLimit header on this response — this account's rollout may not have " +
          "reached the rate-limiting feature yet.",
      };
    }

    const { policy, fields: current } = parseRateLimitHeader(rateLimit);
    const { fields: policyFields } = rateLimitPolicy
      ? parseRateLimitHeader(rateLimitPolicy)
      : { fields: {} as Record<string, number> };

    const remaining = current.r;
    const quotaCeiling = policyFields.q;
    const quotaReading: HealthQuota = {
      id: policy,
      limit: quotaCeiling,
      remaining,
      unit: "requests/s",
    };

    if (typeof remaining !== "number" || typeof quotaCeiling !== "number" || quotaCeiling <= 0) {
      return {
        state: "ok",
        message: policy ? `bucket: ${policy}` : undefined,
        quota: [quotaReading],
      };
    }

    const fraction = remaining / quotaCeiling;
    return {
      state: fraction <= 0 ? "degraded" : fraction < 1 - WARN_FRACTION ? "degraded" : "ok",
      message: `${remaining}/${quotaCeiling} requests left in the ${policy ?? "current"} bucket`,
      quota: [quotaReading],
    };
  },
};

export default quota;
