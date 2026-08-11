import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Is `api.createsend.com` answering at all?
 *
 * With no usable vendor status feed (see `health/service.ts`), this is the only
 * out-of-band signal the App has, and it answers the question that the derived
 * `auth:*` checks structurally cannot: **"is the API down, or is my credential
 * bad?"** Conflating the two is how a Campaign Monitor outage gets misreported
 * to every tenant as "your API key expired".
 *
 * ## An unsigned 401 is a PASS, and here is why that is sound
 *
 * The probe sends `GET /api/v3.3/systemdate.json` with **no credential at all**.
 * The expected answer is:
 *
 *     HTTP/2 401
 *     content-type: application/json; charset=utf-8
 *     {"Code":100,"Message":"Invalid API Key"}
 *
 * measured live on 2026-08-11. A schema-correct authentication error proves the
 * API server parsed the request, ran its authenticator and produced its own
 * documented error envelope — which is precisely the claim this check makes and
 * nothing more. Whether any particular credential is good is the derived
 * `auth:api-key` / `auth:oauth2` checks' job.
 *
 * The verdict is therefore driven by the **shape of the body**, never by the
 * status code:
 *
 *  - a JSON body carrying a numeric `Code` → `ok`, whatever the status. Both 401
 *    (unauthenticated, the normal case) and 200 (would mean the endpoint stopped
 *    requiring a credential — surprising, but the API is plainly up) qualify.
 *  - a 5xx, or any non-JSON body → `down`. `api.createsend.com` behind a
 *    maintenance page or a CDN error page produces HTML, and HTML from this host
 *    is a real signal.
 *  - a transport failure (DNS, TLS, connect) → `down`.
 *  - anything else — a JSON body with no `Code`, an empty body — → `unknown`
 *    rather than `down`, because a probe that cannot interpret what it got has
 *    not learned that the vendor is broken.
 *
 * ## Posture
 *
 * `credential: "none"`, so `sign` never runs and no key is ever sent to this
 * request. That is deliberate twice over: an unsigned probe is what makes the
 * 401 meaningful, and it keeps the check honest about what it measures. It
 * declares no extra egress, because `api.createsend.com` is the App's own API
 * host and is already in `w6w.network.allow`.
 *
 * `kind: "dependency"` rather than `"service"`: this reports on one host's
 * reachability, not on Campaign Monitor's own view of its platform health. The
 * default severity for a non-credential check (`degraded`) is right — a failure
 * here is strong evidence, but it is one probe from one network position.
 */
export const PROBE_URL = `${API_BASE}${API_PREFIX}/systemdate.json`;

/** What a healthy, unauthenticated probe is documented and measured to return. */
export const EXPECTED_UNAUTHENTICATED_CODE = 100;

const api: HealthCheckDefinition = {
  key: "api",
  title: "Campaign Monitor API reachability",
  description:
    "Unauthenticated GET /api/v3.3/systemdate.json against api.createsend.com. A schema-correct " +
    '401 {"Code":100} is a pass: it proves the API parsed the request and answered with its own ' +
    "error envelope. Whether a given credential works is the derived auth checks' job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    } catch (e) {
      return {
        state: "down",
        message: `api.createsend.com is unreachable: ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    const raw = await res.text().catch(() => "");
    let code: number | undefined;
    let message: string | undefined;
    try {
      const body = JSON.parse(raw) as { Code?: number; Message?: string };
      code = typeof body.Code === "number" ? body.Code : undefined;
      message = body.Message;
    } catch { /* not JSON — handled below */ }

    if (code !== undefined) {
      // A 5xx with a well-formed error envelope is still the vendor telling us
      // it is broken; codes 500 and above are its own server-error range.
      if (res.status >= 500) {
        return {
          state: "down",
          message: `Campaign Monitor returned ${res.status} code ${code}${
            message ? `: ${message}` : ""
          }`,
          ttlSeconds: 60,
        };
      }
      return {
        state: "ok",
        message: code === EXPECTED_UNAUTHENTICATED_CODE
          ? undefined
          : `API answered ${res.status} code ${code} to an unsigned probe (expected code ` +
            `${EXPECTED_UNAUTHENTICATED_CODE})`,
        ttlSeconds: 60,
      };
    }

    if (res.status >= 500) {
      return { state: "down", message: `Campaign Monitor returned HTTP ${res.status}` };
    }
    if (raw.trimStart().startsWith("<")) {
      // Markup from the API host means something in front of it is answering —
      // a CDN error page or a maintenance interstitial, not the API.
      return {
        state: "down",
        message:
          `api.createsend.com returned markup rather than JSON (HTTP ${res.status}), so the API ` +
          "itself did not answer",
      };
    }
    return {
      state: "unknown",
      message: `api.createsend.com returned HTTP ${res.status} with no readable Code field`,
    };
  },
};

export default api;
