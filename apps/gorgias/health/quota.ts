/**
 * How much headroom is left on THIS credential — Gorgias.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:*` check answers "is the credential live"; this answers "will the
 *     next hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct: the allowance belongs to the credential,
 *     and reading it needs the credential on the wire. Signing is safe
 *     because the probe stays on the app's own egress allowlist
 *     (`*.gorgias.com`) — this check declares no `network.allow` of its own,
 *     which the spec forbids alongside a signed posture.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /account`, the scope-free whoami the auth `test` hook uses. The
 * domain comes from the Connection's redacted display data; it identifies the
 * account, so it belongs to the Connection rather than to a param.
 *
 * Gorgias meters with a leaky bucket (developers.gorgias.com/reference/limitations)
 * and reports it as `used/limit` on `X-Gorgias-Account-Api-Call-Limit` (e.g.
 * `10/80`) — the same shape `apps/shopify`'s quota check reads off
 * `X-Shopify-Shop-Api-Call-Limit`. API-key integrations are limited to 40
 * requests per 20-second window (80 for OAuth2 apps); there is no reset
 * instant to report since the bucket refills continuously rather than
 * resetting on a boundary.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

const headroom = (remaining: number, limit: number): HealthState => {
  if (remaining <= 0) return "down";
  if (limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API call-limit headroom",
  description:
    "Leaky-bucket headroom from `X-Gorgias-Account-Api-Call-Limit`, reported as calls still available before throttling.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { domain?: string };
    if (!display.domain) {
      return { state: "unknown", message: "connection records no domain" };
    }

    const res = await ctx.fetch(`${baseUrl(display.domain)}/account`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const raw = res.headers.get("x-gorgias-account-api-call-limit");
    const [usedRaw, limitRaw] = (raw ?? "").split("/");
    const used = Number(usedRaw);
    const limit = Number(limitRaw);
    if (!Number.isFinite(used) || !Number.isFinite(limit)) {
      return {
        state: "unknown",
        message: "response carried no X-Gorgias-Account-Api-Call-Limit header",
      };
    }

    const remaining = limit - used;
    return {
      state: headroom(remaining, limit),
      quota: [{ id: "bucket", limit, remaining, unit: "requests" }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
