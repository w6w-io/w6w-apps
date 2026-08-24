import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

/**
 * Is the ServiceM8 API answering?
 *
 * With no status page to lean on (`health/service.ts`), an unsigned request to
 * `api.servicem8.com` is the only external signal available.
 *
 * ## A 401 with ServiceM8's own plain-text body is the PASS
 *
 * Measured live, 2026-08-24, an unsigned `GET /vendor.json`:
 *
 *     HTTP/2 401
 *     content-type: text/html; charset=UTF-8
 *     www-authenticate: Basic realm="ServiceM8 API"
 *     Authorization Required                              (23 bytes, plain text)
 *
 * That is the strongest evidence available that the service is up: DNS
 * resolved, TLS terminated through CloudFront, the API's own router matched
 * `/vendor.json`, and its authentication gate ran and answered in its own
 * documented shape (`http-response-codes.md`'s 401 row: "Invalid credentials,
 * or invalid OAuth token"). This check carries no credential and says nothing
 * about anybody's key — that is `auth:api-key`'s job.
 *
 * Note this body is **plain text**, not the `{"errorCode","message"}` JSON
 * shape a *signed* request's 401 uses (see `lib/client.ts`) — the two are
 * genuinely different responses for genuinely different inputs, not a typo in
 * one or the other.
 *
 * ## What counts as a failure
 *
 *  - A body that is not exactly this vendor's `Authorization Required` text
 *    means something other than the ServiceM8 API answered — an edge error
 *    page, a captive portal. `down`.
 *  - A 2xx would mean `/vendor.json` had become readable with no credential —
 *    a security regression, not good news — reported `degraded`.
 *  - A 404/5xx means the route itself or the backend is broken. `down`.
 *
 * ## Annotation
 *
 *  - `kind: "dependency"` — a narrower claim than "ServiceM8 has declared
 *    itself healthy"; there is no vendor status declaration to defer to.
 *  - `scope: "app"` / `credential: "none"` — one shared host, no per-tenant
 *    subdomain, and `sign` must not run: spending a real key to prove the
 *    vendor is up would measure the wrong thing (and there is no quota
 *    headroom to protect either — ServiceM8 publishes no rate-limit header at
 *    all, only the flat 180/min + 20,000/day ceiling in `authentication.md`).
 *  - No `network.allow` — `api.servicem8.com` is already this app's own
 *    egress host.
 */

export const PROBE_URL = `${API_BASE}${PROBE_PATH}`;

/** ServiceM8's plain-text body for an unauthenticated request, verbatim. */
export const EXPECTED_401_BODY = "Authorization Required";

const api: HealthCheckDefinition = {
  key: "api",
  title: "ServiceM8 API reachability",
  description:
    `Unsigned GET ${PROBE_URL}. A 401 with ServiceM8's own plain-text "${EXPECTED_401_BODY}" ` +
    "body is the pass: it proves the API routed and answered. This says nothing about any " +
    "credential.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    const text = await res.text().catch(() => "");

    if (res.status === 401) {
      if (text.trim() === EXPECTED_401_BODY) {
        return { state: "ok", message: `API answered 401 "${EXPECTED_401_BODY}"`, ttlSeconds: 60 };
      }
      return {
        state: "down",
        message: `401 without ServiceM8's own "${EXPECTED_401_BODY}" body — something other than ` +
          "the API answered",
      };
    }

    if (res.ok) {
      return {
        state: "degraded",
        message: `${PROBE_PATH} answered ${res.status} with no credential; it is documented as ` +
          "requiring one",
      };
    }

    return { state: "down", message: `API returned HTTP ${res.status} for ${PROBE_PATH}` };
  },
};

export default api;
