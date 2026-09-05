import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrlFromConnection } from "../lib/client.ts";

/**
 * Is THIS connection's own Wati tenant endpoint reachable? — distinct from `service` (is Wati's
 * shared platform up): a customer's endpoint host/tenant id can be mistyped or the account
 * suspended while Wati's own platform is fine, and `service` alone says nothing about that.
 *
 * Sent unsigned (`credential: "context"`): this only needs to know whether SOMETHING answers
 * over HTTP at the tenant's own endpoint, which needs no token at all. It deliberately does not
 * try to classify the response body, because Wati's own OpenAPI document declares no schema for
 * a 401 response on any endpoint (see `lib/client.ts`) — there is no confirmed, documented body
 * shape to pattern-match against without a live tenant to probe, and guessing one would be
 * exactly the kind of invented endpoint behavior this pack avoids. The one thing that IS
 * verifiable without a live account: a real Wati host answers over HTTP (with SOME status code,
 * even a 401/403/404) for any request, whereas a mistyped or deprovisioned subdomain fails at
 * the network layer (DNS resolution failure, connection refused, TLS failure) — `ctx.fetch`
 * throws in the second case and resolves in the first. This check reports exactly that
 * distinction and nothing finer.
 */
const tenant: HealthCheckDefinition = {
  key: "tenant",
  title: "Tenant endpoint reachable",
  description: "This connection's own Wati API endpoint, via an unauthenticated request — " +
    "reports whether the host answers at the network level at all, not the response's content " +
    "(see module doc for why the body cannot be classified without a documented 401 shape).",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let root: string;
    try {
      root = baseUrlFromConnection(ctx.connection);
    } catch (err) {
      return { state: "unknown", message: String((err as Error).message) };
    }

    try {
      await ctx.fetch(`${root}/api/ext/v3/account/credits`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "down", message: `tenant endpoint unreachable: ${String(err)}` };
    }
    // Any HTTP response at all — including a 401/403 — means a real host answered.
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default tenant;
