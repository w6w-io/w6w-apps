/**
 * Is this Connection's Datadog site answering at all?
 *
 * The question the status page cannot answer. Every one of Datadog's eight
 * status pages reports *products* — APM, Monitors, Log Management, RUM — and
 * across all eight there is **no component whose name mentions the API**
 * (measured 2026-08-11, 38–39 components each). "Is `api.<site>` up?" and "is
 * Log Management having an incident?" are different questions with different
 * answers, and one of them is the one that explains why every Action just
 * failed. UK1 makes the gap total: it has no status page at all, so this is its
 * only automatable signal.
 *
 * ## Deliberately unauthenticated, which makes a 401 or 403 a PASS
 *
 * The probe is `GET /api/v1/validate` with **no credential**. The point is not
 * whether the keys are good — that is the derived `auth:api-key` check's job —
 * but whether the site's API host resolves, terminates TLS and answers in
 * Datadog's own error grammar. A schema-correct auth refusal proves all three.
 * Conflating the two is how "our EU1 org was renamed" gets misreported as "your
 * token expired".
 *
 * So the pass condition is: **401 or 403, with a body that parses as
 * `{"errors": [...]}`**. Measured on `api.datadoghq.com`, 2026-08-11:
 *
 *   | Request                                  | Status | Body                          |
 *   | ---------------------------------------- | ------ | ----------------------------- |
 *   | `GET /api/v1/validate`, no credential     | 403    | `{"errors":["Forbidden"]}`    |
 *   | `GET /api/v1/monitor`, no credential      | 401    | `{"errors":["Unauthorized"]}` |
 *   | `GET /api/v1/definitely-not-real-zzz`     | 404    | `{"errors":["Not found"]}`    |
 *
 * Both 401 and 403 are accepted because Datadog uses both for "no usable
 * credential" and picks between them per endpoint — `/api/v1/validate` is the
 * outlier that answers 403 where the rest of the API answers 401. Pinning this
 * probe to one of them would make it fail the day Datadog made them consistent.
 *
 * The 404 row is the control: bogus paths are refused, so this host is routing
 * rather than blanket-answering. A `200` here would be the *suspicious* result —
 * an unauthenticated request cannot legitimately validate a key — so it reports
 * `unknown` rather than `ok`, because something other than Datadog is very
 * likely answering (a captive portal, a corporate TLS-inspecting proxy).
 *
 * ## Why `context` and not `none`
 *
 * There are nine sites and the check must probe the right one. It reads
 * `ctx.connection` for the site and nothing else; no credential is sent and
 * `sign` never runs. No `network.allow` widening is needed either — every
 * `api.<site>` host is already in the app's own allowlist.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { apiBase, siteFromConnection } from "../lib/sites.ts";
import { datadogErrorMessages } from "../lib/client.ts";

/** The path probed. Unauthenticated on purpose — see the module comment. */
export const REACHABILITY_PATH = "/api/v1/validate";

const api: HealthCheckDefinition = {
  key: "api",
  title: "Datadog API reachability",
  description:
    "Unauthenticated probe of GET /api/v1/validate on this connection's own api.<site> host. A " +
    "schema-correct 401 or 403 is a pass: it proves the host resolves and Datadog is answering. " +
    "Whether the keys are any good is the auth check's job. This is the only automatable signal " +
    "for the UK1 site, which publishes no status page.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const site = siteFromConnection(ctx.connection);
    const url = `${apiBase(site)}${REACHABILITY_PATH}`;

    let res: Response;
    try {
      res = await ctx.fetch(url, { headers: { accept: "application/json" } });
    } catch (err) {
      // DNS failure, TLS failure, connection refused — the host is genuinely not
      // reachable, which is the one case this check is entitled to call `down`.
      return {
        state: "down",
        message: `${site.apiHost} is unreachable: ${(err as Error).message}`,
      };
    }

    const raw = await res.text().catch(() => "");
    const messages = datadogErrorMessages(raw);

    if (res.status === 401 || res.status === 403) {
      return messages.length > 0
        ? {
          state: "ok",
          message:
            `${site.apiHost} answered ${res.status} ${messages.join("; ")} to an unsigned probe ` +
            "— the site is up and refusing anonymous callers, which is correct.",
          ttlSeconds: 60,
        }
        : {
          // The right status with the wrong body: something is answering for
          // this host that is not Datadog.
          state: "unknown",
          message:
            `${site.apiHost} answered ${res.status} but not in Datadog's error format — a proxy ` +
            "or captive portal may be intercepting this host.",
        };
    }

    if (res.status === 200) {
      return {
        state: "unknown",
        message: `${site.apiHost} validated an unsigned request (200), which Datadog never does. ` +
          "Something other than Datadog is answering for this host.",
      };
    }

    if (res.status === 429) {
      // Being rate-limited proves the site is answering; it says nothing bad
      // about availability.
      return { state: "ok", message: `${site.apiHost} answered 429 (rate limited) — it is up.` };
    }

    if (res.status >= 500) {
      return { state: "down", message: `${site.apiHost} returned ${res.status}` };
    }

    return {
      state: "unknown",
      message: `${site.apiHost} returned an unexpected ${res.status} for ${REACHABILITY_PATH}`,
    };
  },
};

export default api;
