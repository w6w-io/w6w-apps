import type { HealthCheckDefinition } from "@w6w/types";
import { BASE_URL, type PushoverLimits } from "../lib/client.ts";

/**
 * How many messages are left this month?
 *
 * ## This is a real probe with real numbers, which is rare in this pack
 *
 * Most apps here declare `quota` as `unavailable` because the vendor exposes
 * nothing to read. Pushover is the opposite case: it publishes the allowance
 * two ways, and both were verified on 2026-08-11.
 *
 *  - Every message response carries `X-Limit-App-Limit`,
 *    `X-Limit-App-Remaining` and `X-Limit-App-Reset`.
 *  - A dedicated `GET /1/apps/limits.json?token=…` returns the same three as
 *    `limit`, `remaining` and `reset` in the body.
 *
 * This check reads the dedicated endpoint, so it costs nothing against the
 * allowance it is measuring — it is not a message.
 *
 * ## What the number actually means
 *
 * The allowance is **per month, per account, shared across every application on
 * it** — 10,000 free, 25,000 for a Team — not a per-second rate limit. The
 * vendor's own note explains the misleading header names: "for historical
 * reasons, the headers refer to 'app' limits but this is now representing the
 * limit for the entire user or team."
 *
 * That shape is why the thresholds below are proportional. Running out is a
 * hard stop for the rest of the month, so the check reports `degraded` at 10%
 * remaining and `down` at zero — a monthly allowance at zero really does mean
 * this Connection cannot send, which is a stronger statement than a rate limiter
 * refusing one request.
 *
 * ## Posture and severity
 *
 * `credential: "context"` — this endpoint needs the application token, so the
 * check is signed. It is the app's own host, not a third party, so nothing is
 * being widened.
 *
 * Severity is left at the default for `kind: "quota"` rather than dropped to
 * `informational`, because unlike a "the vendor publishes nothing" check this
 * one always has an answer for every Connection: the number is real, it applies
 * to that account, and an exhausted allowance is a genuine outage of this
 * integration.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Monthly message allowance",
  description:
    "Reads GET /1/apps/limits.json. Pushover meters messages per month per account — 10,000 free, " +
    "25,000 for a Team — shared by every application on the account.",
  kind: "quota",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${BASE_URL}/1/apps/limits.json`, {
      headers: { accept: "application/json" },
    });

    const body = await res.json().catch(() => null) as
      | (PushoverLimits & { status?: number })
      | null;
    if (!res.ok || !body) {
      return { state: "unknown", message: `Pushover returned HTTP ${res.status}` };
    }
    if (body.status !== 1) {
      return { state: "unknown", message: "Pushover rejected the limits request" };
    }

    const { limit, remaining, reset } = body;
    if (typeof remaining !== "number") {
      return { state: "unknown", message: "Pushover returned no remaining count" };
    }

    const ratio = typeof limit === "number" && limit > 0 ? remaining / limit : undefined;
    const state = remaining === 0 ? "down" : ratio !== undefined && ratio < 0.1 ? "degraded" : "ok";

    const parts = [`${remaining}${typeof limit === "number" ? `/${limit}` : ""} messages left`];
    if (typeof reset === "number") {
      parts.push(`resets at ${new Date(reset * 1000).toISOString().slice(0, 10)}`);
    }
    if (remaining === 0) parts.push("no messages can be sent until the allowance resets");

    return { state, message: parts.join(", "), ttlSeconds: 300 };
  },
};

export default quota;
