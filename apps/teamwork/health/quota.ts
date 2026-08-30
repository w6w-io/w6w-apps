/**
 * How much headroom is left on THIS credential — Teamwork.
 *
 * Verified against apidocs.teamwork.com/guides/teamwork/rate-limit: the API
 * rate limit is global per account ("if there are multiple users making
 * request at the same time, they will all count towards the total limit per
 * minute"), 150 requests/minute up to the Grow plan and 300/minute on Scale,
 * and "each response will contain" `X-Rate-Limit-Limit`,
 * `X-Rate-Limit-Remaining` and `X-Rate-Limit-Reset` (UTC epoch seconds until
 * reset). A live unauthenticated 401 was confirmed to carry NONE of these
 * headers, so the probe must be signed to read them.
 *
 * Annotation:
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:api-key` check answers "is the credential live"; this answers
 *     "will the next hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct here: the limit is per-account (i.e. per
 *     Connection), and reading it needs the credential on the wire. Signing
 *     is safe because the probe stays on the app's own egress allowlist
 *     (`*.teamwork.com`) — this check declares no `network.allow` of its own.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /projects/api/v3/people.json?pageSize=1`, the same cheap,
 * no-special-scope read the auth `test` hook uses.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { baseUrl, domainFromConnection } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. It is reported honestly anyway so a UI can
 * show why a workflow is about to start getting 429s.
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
    "Per-minute account allowance remaining, read off the X-Rate-Limit-* headers on the whoami-style people probe.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let domain: string;
    try {
      domain = domainFromConnection(ctx.connection);
    } catch {
      return { state: "unknown", message: "connection records no site name" };
    }

    const res = await ctx.fetch(`${baseUrl(domain)}/projects/api/v3/people.json?pageSize=1`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const limit = num(h.get("x-rate-limit-limit"));
    const remaining = num(h.get("x-rate-limit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no X-Rate-Limit-* headers" };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{ id: "account", limit, remaining, unit: "requests" }],
      ttlSeconds: 30,
    };
  },
};

export default quota;
