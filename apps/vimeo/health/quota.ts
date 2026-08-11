import type { HealthCheckDefinition } from "@w6w/types";
import { ACCEPT, API_BASE, readRateLimit, USER_AGENT } from "../lib/client.ts";

/**
 * How much of this connection's per-minute request allowance is left?
 *
 * ## Vimeo publishes it, and the number is not what it looks like
 *
 * `developer.vimeo.com/guidelines/rate-limiting` documents three response
 * headers on every API request:
 *
 *   | Header                   | Meaning                                            |
 *   | ------------------------ | -------------------------------------------------- |
 *   | `X-RateLimit-Limit`      | Maximum requests in any 60-second period            |
 *   | `X-RateLimit-Remaining`  | Requests left in the current 60-second period       |
 *   | `X-RateLimit-Reset`      | Datetime when the next 60-second period begins      |
 *
 * Exceeding the allowance gives `429` with Vimeo error code `9000` for the rest
 * of the minute.
 *
 * The trap is in the same guide, one paragraph down, and it is the reason this
 * probe is built the way it is:
 *
 *   "`X-RateLimit-Limit` and `X-RateLimit-Remaining` assume that you're using
 *    field filtering to double the normal request quota. If you aren't using
 *    field filtering, divide these values by 2."
 *
 * The headers are reported as the **doubled** figure unconditionally. A caller
 * who reads `X-RateLimit-Remaining` without sending a `fields` parameter is
 * over-reading their own headroom by 100% and will hit 429 at what the header
 * calls half-full. This probe sends `fields=uri`, so the figure it reports is
 * the one that actually applies to it — and every read action in this app
 * offers `fields` for the same reason.
 *
 * The allowance is per *end user*, not per app: an authenticated token gets its
 * own independent pool, sized by that Vimeo member's plan (the guide's table
 * runs from Basic up to 2,500 requests/minute, doubled to 5,000 with field
 * filtering). That is why this check is `scope: "connection"` — one Connection's
 * headroom says nothing about another's.
 *
 * ## Why `unknown` is a real outcome here, and why the severity is informational
 *
 * The headers were **not** present on a live unauthenticated request: a
 * `GET https://api.vimeo.com/` on 2026-08-11 returned 22 response headers —
 * `date`, `content-type`, `content-length`, `server`, `strict-transport-security`,
 * `www-authenticate`, `cache-control`, `request-hash`, `x-vimeo-error`,
 * `x-bapp-server`, `x-backend-server`, `accept-ranges`, `via`, `x-served-by`,
 * `x-cache`, `x-cache-hits`, `x-timer`, `vary`, `cf-cache-status`, `set-cookie`,
 * `cf-ray`, `alt-svc` — and none of the three rate-limit headers. That is
 * consistent with the vendor's own rule that the quota belongs to the end user
 * the token identifies, and there is no such user on an unauthenticated call.
 * It also means this check cannot promise the headers are present for every
 * plan and token type, so it reports `unknown` with the reason rather than
 * inventing a number.
 *
 * `severity: "informational"` follows from that, and it is load-bearing:
 * `unknown` outranks `ok` in the roll-up, so at the default `degraded` severity
 * a missing header would pin this App's verdict at `unknown` forever — the exact
 * failure the health-check contract warns about for declared absences. Running
 * low on request budget is also not a reason to call the App broken; it is
 * information for whoever is scheduling the workflow.
 *
 * `credential: "signed"` is the default for a non-service check and is correct:
 * the reading only exists for a token-bound caller. Because it is signed, this
 * check declares no `network` widening — it stays on the app's own API host.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  description:
    "Reads X-RateLimit-Limit / -Remaining / -Reset from a filtered GET /me. The figures Vimeo " +
    "reports already assume field filtering; a caller not using `fields` must halve them.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    // `fields=uri` for three reasons: it is the cheapest possible /me, it makes
    // the reported figures the ones that apply to this call, and it means the
    // response provably cannot contain `preferences.videos.password`.
    const res = await ctx.fetch(`${API_BASE}/me?fields=uri`, {
      headers: { accept: ACCEPT, "user-agent": USER_AGENT },
    });

    // Drain the body so the connection is not left half-read; nothing needs it.
    await res.text().catch(() => "");

    const reading = readRateLimit(res.headers);

    if (res.status === 429) {
      return {
        state: "degraded",
        message: "Vimeo is rate limiting this connection (429, error code 9000). Requests resume " +
          `at the start of the next 60-second period${
            reading.resetAt ? ` (${reading.resetAt})` : ""
          }.`,
        quota: [{ id: "requests", limit: reading.limit, remaining: 0, resetAt: reading.resetAt }],
        ttlSeconds: 30,
      };
    }

    if (!res.ok) {
      // The credential's own health is the derived `auth:access-token` check's
      // job. All this can say is that it could not get a reading.
      return {
        state: "unknown",
        message: `Vimeo returned ${res.status} for the quota probe, so no headroom was read.`,
      };
    }

    if (reading.remaining === undefined && reading.limit === undefined) {
      return {
        state: "unknown",
        message: "Vimeo returned no X-RateLimit-* headers on this response, so request headroom " +
          "is unknown for this token.",
      };
    }

    // No threshold is applied. Vimeo's window is 60 seconds and refills whole,
    // so a low reading mid-minute is ordinary rather than a problem — calling it
    // `degraded` would fire constantly on a busy, entirely healthy connection.
    const parts = [
      reading.remaining !== undefined && reading.limit !== undefined
        ? `${reading.remaining} of ${reading.limit} requests left this minute`
        : reading.remaining !== undefined
        ? `${reading.remaining} requests left this minute`
        : `limit ${reading.limit} requests/minute`,
      "as reported by Vimeo, which already assumes field filtering",
    ];

    return {
      state: "ok",
      message: parts.join(", "),
      quota: [{
        id: "requests",
        limit: reading.limit,
        remaining: reading.remaining,
        resetAt: reading.resetAt,
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
