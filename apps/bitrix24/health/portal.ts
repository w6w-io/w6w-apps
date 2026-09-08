import type { HealthCheckDefinition } from "@w6w/types";
import { portalUrlFromConnection } from "../lib/client.ts";
import type { Bitrix24ErrorBody } from "../lib/client.ts";

/**
 * Is **this connection's own Bitrix24 portal** reachable? — distinct from
 * `service` (is Bitrix24's shared cloud up), exactly the way `mautic`'s
 * `instance` check is distinct from a vendor-status question: a portal can be
 * unreachable (wrong URL, a paused subscription, a taken-down on-premise
 * install) while Bitrix24's own infrastructure is fine, and this is the check
 * that would say so.
 *
 * Sent **unsigned**, against `method.get` — scope `basic`, so it exists on
 * every portal regardless of what the webhook was granted, with an empty
 * body and no `<user_id>/<webhook_code>` path segment at all. Bitrix24's own
 * error-codes page documents that a request with no auth gets
 * `{"error":"NO_AUTH_FOUND","error_description":"Wrong authorization data"}`
 * — that structured JSON body IS the "this is a live Bitrix24 REST router"
 * signal, independent of whether this particular credential still works
 * (which is what the derived `auth:webhook` check is for).
 */
const portal: HealthCheckDefinition = {
  key: "portal",
  title: "Bitrix24 portal reachable",
  description: "This connection's own portal, via an unsigned request Bitrix24 must still " +
    "route to answer — an expired or revoked webhook must not make a healthy portal look down.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "context",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let base: string;
    try {
      base = portalUrlFromConnection(ctx.connection);
    } catch (err) {
      return { state: "unknown", message: String((err as Error).message) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/rest/method.get`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: "{}",
      });
    } catch (err) {
      return { state: "down", message: `portal unreachable: ${String(err)}` };
    }

    const text = await res.text().catch(() => "");
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = undefined;
    }

    const body = parsed && typeof parsed === "object" ? (parsed as Bitrix24ErrorBody) : null;
    if (body && typeof body.error === "string") {
      // Any structured {error, ...} body proves a live Bitrix24 REST router answered —
      // NO_AUTH_FOUND is expected here since the call is deliberately unsigned.
      return { state: "ok", message: `portal reachable (${body.error})`, ttlSeconds: 60 };
    }
    if (res.ok && body && "result" in body) {
      // A portal that has disabled auth entirely for basic-scope methods also proves reachable.
      return { state: "ok", ttlSeconds: 60 };
    }
    if (parsed === undefined) {
      return {
        state: "degraded",
        message: `something answered at ${base} but not in Bitrix24's JSON shape (status ` +
          `${res.status}) — wrong portal URL, or a proxy/login page in the way?`,
      };
    }
    return { state: "degraded", message: `Bitrix24 answered ${res.status} unexpectedly` };
  },
};

export default portal;
