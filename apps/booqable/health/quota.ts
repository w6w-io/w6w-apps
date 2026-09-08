/**
 * How much monthly API headroom is left on THIS credential's company.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:*` check answers "is the credential live"; this answers "will
 *     the next call succeed before the monthly cap is hit".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct: the allowance belongs to the company
 *     the credential authenticates against, and reading it needs the
 *     credential on the wire. Signing is safe because the probe stays on the
 *     app's own egress allowlist (`*.booqable.com`) — this check declares no
 *     `network.allow` of its own, which the spec forbids alongside a signed
 *     posture.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Booqable does NOT expose quota via response headers the way Gorgias/Shopify
 * do (verified 2026-09-06: no `X-RateLimit-*`/`Retry-After` header appears
 * anywhere in developers.booqable.com, and a live probe's response headers
 * carry none either). Instead, `GET /companies/current` with
 * `extra_fields[companies]=subscription` — documented under "Fetch
 * subscription details" — returns the numbers directly in the body:
 * `data.attributes.subscription.restrictions.api_monthly_calls` (the ceiling)
 * and `data.attributes.subscription.api_usage_count` (calls used this
 * period), verified against the docs' own worked example
 * (`"api_monthly_calls":1000000, ... "api_usage_count":0`). The same
 * `restrictions` hash also carries `rate_limit_max`/`rate_limit_period`
 * (e.g. 250 calls per 60 seconds) — a SEPARATE, shorter-window throttle this
 * check cannot report headroom for (no "used in this window" counter is
 * exposed anywhere), so it is surfaced only in the check's message, not as a
 * second `quota[]` entry.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { baseUrl, errorMessage } from "../lib/client.ts";

interface CompanySubscription {
  api_usage_count?: number;
  restrictions?: {
    api_monthly_calls?: number;
    rate_limit_max?: number;
    rate_limit_period?: number;
  };
}

const headroom = (remaining: number, limit: number): HealthState => {
  if (remaining <= 0) return "down";
  if (limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Monthly API-call headroom",
  description:
    "Monthly call allowance from `companies/current`'s subscription.restrictions.api_monthly_calls " +
    "and subscription.api_usage_count. Also reports the account's shorter-window rate limit " +
    "(calls per period), which carries no usage counter to compute headroom from.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { companySlug?: string };
    if (!display.companySlug) {
      return { state: "unknown", message: "connection records no company slug" };
    }

    const url = new URL(`${baseUrl(display.companySlug)}/companies/current`);
    url.searchParams.set("extra_fields[companies]", "subscription");
    url.searchParams.set("fields[companies]", "subscription");
    const res = await ctx.fetch(url.toString(), { headers: { accept: "application/json" } });
    if (!res.ok) {
      const message = errorMessage(await res.text().catch(() => ""));
      return { state: "unknown", message: message || `quota probe returned ${res.status}` };
    }

    const body = await res.json().catch(() => ({})) as {
      data?: { attributes?: { subscription?: CompanySubscription } };
    };
    const subscription = body.data?.attributes?.subscription;
    const limit = subscription?.restrictions?.api_monthly_calls;
    const used = subscription?.api_usage_count;
    if (typeof limit !== "number" || typeof used !== "number") {
      return {
        state: "unknown",
        message: "response carried no subscription.restrictions.api_monthly_calls/api_usage_count",
      };
    }

    const remaining = limit - used;
    const rateLimitMax = subscription?.restrictions?.rate_limit_max;
    const rateLimitPeriod = subscription?.restrictions?.rate_limit_period;
    const rateLimitNote = rateLimitMax && rateLimitPeriod
      ? ` (also rate-limited to ${rateLimitMax} calls / ${rateLimitPeriod}s, usage not reported)`
      : "";

    return {
      state: headroom(remaining, limit),
      message: `${remaining}/${limit} monthly API calls remaining${rateLimitNote}`,
      quota: [{ id: "monthly_api_calls", limit, remaining, unit: "requests" }],
      ttlSeconds: 300,
    };
  },
};

export default quota;
