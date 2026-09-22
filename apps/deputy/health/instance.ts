/**
 * Is **this connection's** Deputy install answering? — the install's own API,
 * probed unsigned.
 *
 * For a per-tenant app this is a different question from "is Deputy up": every
 * customer runs on their own `{install}.{geo}.deputy.com` (Deputy's
 * "Getting Started" page), and a token that was revoked, a URL that was typed
 * for the wrong region, and an install that is genuinely unreachable are three
 * different problems. This check asks only the third, by calling the install
 * with **no credential at all** — so an expired or revoked permanent token can
 * never make a healthy install look down, and the credential's own liveness is
 * the derived `auth:permanent-token` check's job.
 *
 * ## What "reachable" means here, and why there is no version endpoint
 *
 * Deputy publishes no unauthenticated ping or version endpoint, so this reads
 * the install's own **auth-error envelope** instead. Verified live on
 * 2026-09-22 against `simonssambos.au.deputy.com` (the install Deputy's own
 * docs use as their example):
 *
 *   | Target                                     | Status | Body                                                        |
 *   | ------------------------------------------ | ------ | ----------------------------------------------------------- |
 *   | `GET /api/v1/me` with no `Authorization`    | **403**| `{"error":{"code":403,"message":"No authorization given"}}`  |
 *   | `GET /api/v1/nope-not-real`, same           | **403**| the identical envelope                                       |
 *   | a hostname that is not an install           | **302**| `location: https://once.deputy.com/my/`                      |
 *
 * Two things follow, and both are stated rather than papered over:
 *
 *   - **The 403 envelope proves a Deputy install answered, not that any
 *     particular path exists.** Deputy authenticates before it routes, so an
 *     invented path answers exactly the same body as a real one. That is
 *     precisely why this envelope is safe to treat as a heartbeat and unsafe to
 *     treat as anything more.
 *   - **A host that is not an install redirects to Once** (`once.deputy.com/my/`,
 *     Deputy's own login/account host) and lands on a 200 HTML page, which the
 *     JSON check below refuses. "Your URL has a typo" and "Deputy is down" are
 *     not the same report.
 *
 * Annotation:
 *
 *   - `kind: "dependency"` — "is the thing this Connection points at
 *     reachable", not "is the vendor's platform up" (`service`) and not "is the
 *     credential live" (`auth:*`).
 *   - `scope: "connection"` — each Connection points at a different install.
 *   - `credential: "context"` — the Connection supplies the URL, the probe
 *     itself is unsigned.
 *   - No `network.allow`: the install host is already covered by the app's own
 *     `["*"]` allowlist, which is `["*"]` because only the operator knows the
 *     address.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_PATH, baseUrlFromConnection, errorMessage, host } from "../lib/client.ts";

const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Deputy install reachable",
  description:
    "This connection's own Deputy install, probed unsigned against /api/v1/me. Deputy's " +
    "documented auth-error envelope proves an install answered the call — no credential is " +
    "sent, so a revoked token cannot make a live install look down.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "context",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let base: string;
    try {
      base = baseUrlFromConnection(ctx.connection);
    } catch (err) {
      return { state: "unknown", message: String((err as Error).message) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}${API_PATH}/me`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      // An install that cannot be reached at all IS the failure this check is for.
      return { state: "down", message: `install unreachable: ${String(err)}` };
    }

    const text = await res.text().catch(() => "");

    if (res.url && host(res.url) && host(res.url) !== host(base)) {
      return {
        state: "down",
        message: `nothing at ${base} — the address redirected to ${host(res.url)}, which is ` +
          "Deputy's Once login rather than an install. Check the install name and region.",
      };
    }

    // The documented envelope, in either of its two shapes.
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = undefined;
    }
    const looksLikeDeputy = parsed !== null && parsed !== undefined &&
      typeof parsed === "object" && "error" in (parsed as object);

    if (!looksLikeDeputy) {
      if (parsed === undefined) {
        return {
          state: "degraded",
          message: `something answered at ${base} but it was not JSON — is a proxy or login ` +
            "page in the way?",
        };
      }
      if (res.ok) {
        // Deputy documents an install as requiring auth on every route; a 200
        // here is a different (still reachable) posture, not a failure.
        return {
          state: "ok",
          message: "reachable (answered without the documented 403)",
          ttlSeconds: 60,
        };
      }
      return {
        state: "down",
        message: `unexpected response (${res.status}): ${errorMessage(text)}`,
      };
    }

    if (res.status === 403) {
      return { state: "ok", message: "reachable", ttlSeconds: 60 };
    }
    return {
      state: "degraded",
      message: `Deputy answered ${res.status}${
        errorMessage(text) ? `: ${errorMessage(text)}` : ""
      }`,
      ttlSeconds: 60,
    };
  },
};

export default instance;
