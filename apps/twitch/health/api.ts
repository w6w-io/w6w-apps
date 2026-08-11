/**
 * Is the Helix API reachable and answering?
 *
 * ## Why an unauthenticated probe, and why a 401 is a PASS
 *
 * This check exists because Twitch's status page carries no API component (see
 * `health/api-status.ts`), so nothing else in this app answers "is Helix up".
 * It is deliberately **unsigned**: it asks whether `api.twitch.tv` resolves, is
 * reachable from this host, and is answering as the Twitch API — three
 * questions that have nothing to do with whether any particular credential is
 * good. Whether the credential works is the derived `auth:*` checks' job, and
 * conflating the two is how "Twitch had an outage" gets misreported as "your
 * token expired".
 *
 * So the pass condition is a **JSON 401 in Twitch's documented error shape**.
 * Measured live on 2026-08-11:
 *
 *     GET https://api.twitch.tv/helix/users            (no headers)
 *     → HTTP/2 401, content-type: application/json; charset=utf-8
 *       {"error":"Unauthorized","status":401,"message":"OAuth token is missing"}
 *
 * That is a stronger signal than a 200 would be, on two counts. It proves the
 * request reached Twitch's own application layer rather than a CDN error page
 * or a captive portal — an intercepting proxy answers 200 with HTML, not a
 * schema-correct 401 JSON body. And it costs Twitch nothing: the request is
 * refused before any work is done, and carries no rate-limit headers precisely
 * because Twitch never bucketed it.
 *
 * The body is checked, not just the status. `HTTP 200 != a real endpoint` cuts
 * both ways: `HTTP 401` from something that is not Twitch is equally worthless,
 * and a 401 whose body is HTML is a proxy, not Helix. The same reasoning rules
 * out treating the bogus-path 404 as the probe — measured the same day,
 * `GET /helix/definitely-not-real-zzz` answers `404` with
 * `{"error":"Not Found","status":404,"message":""}`, which proves Helix routes
 * but reads as a *broken* app to anyone skimming a health report.
 *
 * ## States
 *
 *  - `ok`      — a 401 (or any 2xx) whose body is Twitch's JSON error shape.
 *  - `degraded`— reachable, answering, but with a 5xx: Helix is there and sick.
 *  - `unknown` — unreachable, or answering with something that is not Twitch.
 *                Never `down`: a DNS failure or a blocked egress here says
 *                nothing about Twitch, and claiming otherwise would be a lie.
 *
 * `kind: "dependency"` with `credential: "none"` and no `network.allow`: the
 * host is `api.twitch.tv`, already the app's own, so this widens nothing.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * The probe URL: the plainest Helix endpoint there is.
 *
 * `/helix/users` with no parameters is the canonical "who am I" read, so an
 * unauthenticated call to it is the shortest path to Twitch's own 401 handler.
 */
export const PROBE_URL = `${API_BASE}${API_PREFIX}/users`;

interface HelixError {
  error?: string;
  status?: number;
  message?: string;
}

/** Does this body look like Twitch's documented error envelope? */
export function isHelixErrorShape(body: unknown): body is HelixError {
  if (!body || typeof body !== "object") return false;
  const b = body as HelixError;
  return typeof b.error === "string" && typeof b.status === "number";
}

const api: HealthCheckDefinition = {
  key: "api",
  title: "Helix API reachable",
  description:
    "Unauthenticated probe of api.twitch.tv. A JSON 401 in Twitch's documented error shape is a " +
    "pass — it proves the API resolved and answered from its own application layer. Whether a " +
    "credential is valid is the derived auth checks' job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return {
        state: "unknown",
        message: `could not reach api.twitch.tv: ${(err as Error).message}`,
      };
    }

    const contentType = res.headers.get("content-type") ?? "";
    const text = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON — handled below */ }

    if (res.status === 401) {
      if (isHelixErrorShape(body)) {
        return {
          state: "ok",
          message: `Helix answered 401 as documented: ${(body as HelixError).message ?? ""}`.trim(),
          ttlSeconds: 60,
        };
      }
      return {
        state: "unknown",
        message:
          `something answered 401 for ${API_PREFIX}/users but not in Twitch's JSON error shape ` +
          `(content-type ${contentType || "absent"}) — this is probably a proxy, not Helix`,
      };
    }

    if (res.ok) {
      // Unexpected but not alarming: Twitch answering 2xx without a credential
      // would mean the endpoint changed, not that it is broken.
      return { state: "ok", message: `Helix answered ${res.status}`, ttlSeconds: 60 };
    }

    if (res.status >= 500) {
      return { state: "degraded", message: `Helix answered ${res.status}` };
    }

    return {
      state: "unknown",
      message: `Helix answered an unexpected ${res.status} to an unauthenticated probe`,
    };
  },
};

export default api;
