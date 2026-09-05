import type { HealthCheckDefinition } from "@w6w/types";
import { apiRootFromConnection } from "../lib/client.ts";

/**
 * Is **this connection's own Kintone tenant** reachable? — distinct from
 * `service` (is Kintone's shared platform up) the same way `gitea`'s
 * `instance` check is distinct from a vendor-status question: a tenant
 * subdomain can be wrong, suspended, or never provisioned while Kintone's
 * own platform is fine, and `service` alone would say nothing about that.
 *
 * Sent **unsigned**, on purpose: no credential is needed to tell "there is a
 * live Kintone environment answering at this URL" apart from "there isn't".
 *
 * Two response shapes were confirmed live 2026-09-05, against both a real
 * subdomain and one made up to not resolve to any tenant:
 *   - Cybozu's edge answers a **generic "forest_error" 404 HTML page**
 *     (`このリンクは不正です` / "This link is invalid") for a subdomain that is
 *     not provisioned — this fires before the request ever reaches a Kintone
 *     environment's own REST API router, for ANY path under that host,
 *     including `/k/v1/...` routes.
 *   - Kintone's own REST API Overview states its error-response format
 *     applies to *every* API failure, `{code, id, message}` JSON — so a live
 *     tenant answers that shape even for an unauthenticated request to a
 *     record endpoint, rejecting it for a missing/invalid credential rather
 *     than falling through to the edge's HTML page.
 * This check tells the two apart by response shape (JSON vs not), not by
 * status code — both cases answer with a 4xx.
 */
const site: HealthCheckDefinition = {
  key: "site",
  title: "Tenant reachable",
  description: "This connection's own Kintone tenant, via an unauthenticated request — Cybozu's " +
    "edge answers a generic HTML page for an unprovisioned subdomain, while a live tenant's own " +
    "REST API answers its documented JSON error shape even without a credential.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let root: string;
    try {
      root = apiRootFromConnection(ctx.connection);
    } catch (err) {
      return { state: "unknown", message: String((err as Error).message) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${root}/v1/records.json?app=0`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "down", message: `tenant unreachable: ${String(err)}` };
    }

    if (res.ok) return { state: "ok", ttlSeconds: 120 };

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return {
        state: "down",
        message: `no Kintone tenant answered at this URL (got ${res.status} ${
          contentType || "unknown content-type"
        })`,
      };
    }
    // A structured JSON error — Kintone's own router identified a real tenant
    // and rejected the (unsigned, made-up app id) request; that is "reachable".
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default site;
