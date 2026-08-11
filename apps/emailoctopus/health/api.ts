/**
 * Is `api.emailoctopus.com` answering? — an unsigned reachability probe.
 *
 * ## Why this exists when a `service` check already does
 *
 * The vendor's status page publishes exactly one component, `Platform`. It has
 * no `API` row, so it cannot say whether the host every action calls is
 * answering — it can only say whether EmailOctopus considers the product
 * healthy overall. Those are different failures with different fixes ("their
 * dashboard is down" vs "our egress to their API is broken"), and collapsing
 * them is how an outage gets misattributed.
 *
 * ## A 401 is a PASS here, and that is the whole point
 *
 * This check sends **no credential** (`credential: "none"`), so the correct,
 * healthy answer from a working API is an authentication error. Measured live
 * on 2026-08-11, `GET https://api.emailoctopus.com/lists` with no
 * `Authorization` header returns:
 *
 *     HTTP/2 401  content-type: application/json
 *     {"title":"An error occurred.",
 *      "detail":"Full authentication is required to access this resource.",
 *      "status":401,"type":"/errors/401"}
 *
 * A *schema-correct* RFC 7807 problem document proves three things at once: DNS
 * resolves, TLS completes, and the application behind the edge is processing
 * requests rather than a CDN serving a cached error page. Whether any given key
 * is good is the derived `auth:api-key` check's job; conflating the two is how
 * "the API is fine, your key expired" gets reported as an outage.
 *
 * So the pass condition is deliberately **not** the status code. It is: the
 * body parses as JSON and carries the documented problem-document shape. A 200,
 * an HTML body, or a 5xx all fail it — including the case that motivates the
 * rule, an edge that answers 200 with a marketing page for every path. (This
 * host does not do that: an unknown path returns a JSON 404,
 * `{"detail":"Resource not found."}`, measured the same day.)
 *
 * ## Annotation
 *
 *   - `kind: "dependency"` — this is about a host being reachable, not about
 *     the vendor's own published verdict (`service`) or a credential
 *     (`auth:api-key`).
 *   - `credential: "none"` — no Connection, `sign` never runs. That is what
 *     makes the 401 expected rather than alarming, and it means this check
 *     reports even before anyone has connected.
 *   - No `network.allow`: `api.emailoctopus.com` is already the app's own
 *     declared egress host.
 *   - `severity: "degraded"` rather than `fatal` — this probe cannot see
 *     per-tenant problems, so it should colour a verdict without owning it.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL, type ProblemDetails } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description:
    "Unauthenticated GET of api.emailoctopus.com/lists. A schema-correct RFC 7807 401 is the expected healthy answer — it proves the API is answering. Credential validity is the `auth:api-key` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/lists`, { headers: { accept: "application/json" } });
    } catch (e) {
      return { state: "down", message: `could not reach api.emailoctopus.com: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: ProblemDetails | null = null;
    try {
      body = raw ? JSON.parse(raw) as ProblemDetails : null;
    } catch { /* handled below — a non-JSON body is itself the finding */ }

    if (res.status === 401) {
      // The documented shape: `title`, `detail` and `status` on an RFC 7807
      // problem document. Anything else on a 401 means something other than the
      // API answered.
      const shaped = body !== null &&
        typeof body.detail === "string" &&
        typeof body.title === "string";
      return shaped
        ? {
          state: "ok",
          message: "API answered with the documented authentication error",
          ttlSeconds: 60,
        }
        : {
          state: "degraded",
          message: "401 without the documented RFC 7807 body — an intermediary may be answering",
        };
    }

    if (res.ok) {
      // Nothing should succeed unauthenticated. If it does, the response is not
      // coming from the API this app targets.
      return {
        state: "degraded",
        message: `unauthenticated GET /lists returned ${res.status}; expected 401`,
      };
    }

    if (res.status >= 500) {
      return { state: "down", message: `API returned ${res.status}` };
    }

    return {
      state: "degraded",
      message: `API returned an unexpected ${res.status}: ${body?.detail ?? raw.slice(0, 120)}`,
    };
  },
};

export default api;
