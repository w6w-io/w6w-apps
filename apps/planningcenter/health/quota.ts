import type { HealthCheckDefinition } from "@w6w/types";
import { HOST, USER_AGENT } from "../lib/client.ts";

/**
 * Rate-limit headroom, read off the same `/current/v2/me` call the Auth
 * `test` hook uses — no dedicated quota endpoint exists.
 *
 * Verified live against the Rate Limiting guide: every response carries
 * `X-PCO-API-Request-Rate-Limit`, `X-PCO-API-Request-Rate-Count` and
 * `X-PCO-API-Request-Rate-Period`, and the guide is explicit that these are
 * dynamic — "Rate limits can also be adjusted dynamically at any time and
 * without prior notice. Your application should never hard-code rate limit
 * values" — so this check reads the headers on every run rather than
 * asserting the documented default of 100 requests/20 seconds.
 *
 * `credential: "signed"` is the default for `kind: "quota"`, so the runtime
 * routes this call through `sign` exactly like an Action — no manual header
 * building here.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  severity: "informational",

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${HOST}/current/v2/me`, {
      headers: { accept: "application/json", "user-agent": USER_AGENT },
    });
    if (!res.ok) return { state: "unknown", message: `returned ${res.status}` };

    const limit = res.headers.get("x-pco-api-request-rate-limit");
    const count = res.headers.get("x-pco-api-request-rate-count");
    const period = res.headers.get("x-pco-api-request-rate-period");
    if (limit === null || count === null) {
      return { state: "unknown", message: "rate-limit headers not present on this response" };
    }

    const limitN = Number(limit);
    const countN = Number(count);
    const remaining = limitN - countN;
    return {
      state: "ok",
      message: period ? `${countN}/${limitN} requests used this ${period} window` : undefined,
      quota: [{ id: "requests", limit: limitN, remaining, unit: "requests" }],
    };
  },
};

export default quota;
