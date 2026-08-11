/**
 * Is `api.podio.com` answering, right now, in its own documented shape?
 *
 * A separate question from the `service` check, and the two disagree in exactly
 * the case that matters: a status page updated by humans lags the outage it
 * describes, and it has its own availability besides. This probe asks the API
 * host itself.
 *
 * ## Unsigned, and a 401 is a PASS
 *
 * `credential: "none"`, so no token is ever put on the wire and `sign` never
 * runs. The probe therefore *expects* to be refused — and being refused
 * correctly is the signal. A schema-shaped auth error proves three things at
 * once: DNS and TLS to `api.podio.com` resolved, an HTTP request was served,
 * and the thing that served it is Podio's API rather than a captive portal, a
 * CDN error page or a parked domain.
 *
 * Conflating this with "your token expired" is how "Podio is down" gets
 * misreported as "your credential is broken". Whether the credential is any
 * good is the derived `auth:*` checks' job, and they run signed.
 *
 * ## What "schema-shaped" means here, precisely
 *
 * Measured on `GET /user/status` with no `Authorization` header, 2026-08-11:
 *
 *     HTTP/2 401
 *     content-type: application/json; charset=utf-8
 *     {"error":"unauthorized","error_detail":null,"error_description":"invalid_request",
 *      "error_parameters":{},"error_propagate":false,
 *      "request":{"url":"/user/status","method":"GET","query_string":""}}
 *
 * The check requires the status to be 401 **and** the body to parse as JSON
 * **and** to carry an `error` string **and** to echo the requested path back in
 * `request.url`. That last condition is the one that does the real work: any
 * interception layer can serve a 401 with a JSON body, but only Podio's own
 * error handler knows which path was asked for. A 200 here would be a *failure*
 * — this endpoint requires a credential, so an unauthenticated 200 means
 * something other than Podio answered.
 *
 * ## Why `/user/status` when nothing else in this app touches it
 *
 * Because the probe is unsigned, the usual objection to that endpoint does not
 * apply. `auth/app-auth.ts` rejects it as a *credential* probe on two grounds:
 * it is unreachable under App Authentication, and its authenticated response
 * carries `calendar_code`, the secret in the account's iCal feed URL. Neither
 * bites here — with no credential there is no authenticated response at all,
 * only the error envelope. What is left is its one virtue for this job: it is
 * documented, it requires a credential, and it is cheap.
 *
 * ## Severity
 *
 * `degraded`, the default for a non-credential check, and deliberately not
 * `fatal`: a single failed probe from one host is weaker evidence than the
 * vendor's own status roll-up, and one flaky DNS lookup should not condemn the
 * App outright.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, type PodioErrorBody } from "../lib/client.ts";

/** The path probed. Chosen for the reasons in the header, not for its name. */
export const PROBE_PATH = "/user/status";
export const PROBE_URL = `${API_BASE}${PROBE_PATH}`;

/**
 * Does this look like Podio's own error envelope for the path we asked for?
 *
 * Exported so the test suite asserts against the same predicate the check uses
 * — a second copy in the test would be a test of the copy.
 */
export function isPodioErrorEnvelope(body: unknown, path: string): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const env = body as PodioErrorBody;
  if (typeof env.error !== "string" || env.error.length === 0) return false;
  return typeof env.request?.url === "string" && env.request.url.startsWith(path);
}

const api: HealthCheckDefinition = {
  key: "api",
  title: "Podio API reachable",
  description:
    "Unauthenticated probe of api.podio.com. A schema-correct 401 is a PASS — it proves the " +
    "API host resolves and Podio's own error handler answered. Whether a credential works " +
    "is the auth checks' job.",
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
      return { state: "down", message: `api.podio.com unreachable: ${String(e)}` };
    }

    const body = await res.json().catch(() => null);

    if (res.status === 401 && isPodioErrorEnvelope(body, PROBE_PATH)) {
      return {
        state: "ok",
        message: "api.podio.com answered with its documented 401 envelope",
        ttlSeconds: 60,
      };
    }

    if (res.status === 401) {
      // Right status, wrong body: something is answering for this host that is
      // not Podio's error handler. That is not proof of an outage, so it is
      // reported as unverifiable rather than down.
      return {
        state: "unknown",
        message: "api.podio.com returned 401 but not Podio's error envelope — something " +
          "other than the API may be answering for this host",
      };
    }

    if (res.status === 200) {
      return {
        state: "unknown",
        message: "api.podio.com answered 200 to an unauthenticated request, which this " +
          "endpoint should never do — the response is not coming from Podio",
      };
    }

    if (res.status >= 500) {
      return { state: "down", message: `api.podio.com returned ${res.status}` };
    }

    return { state: "unknown", message: `api.podio.com returned an unexpected ${res.status}` };
  },
};

export default api;
