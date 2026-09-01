import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrlFromConnection, safeErrorMessage } from "../lib/client.ts";
import type { BubbleErrorBody } from "../lib/client.ts";

/**
 * Is **this connection's own Bubble app** reachable? — distinct from `service`
 * (is Bubble's shared platform up) exactly the way `gitea`'s `instance` check
 * is distinct from a vendor-status question: a Bubble app can be unreachable
 * (wrong URL, undeployed, taken down) while Bubble's own infrastructure is
 * fine, and this is the check that would say so.
 *
 * Sent **unsigned**, against a Data Type name (`__w6w_health_check__`) chosen
 * to not exist, on purpose: this check only wants to know whether the app
 * itself answers Bubble's API router, not whether any particular Data Type is
 * exposed — an expired token or an unrelated 404 from a real type must not
 * make a perfectly healthy app look down.
 *
 * Two response shapes were confirmed live 2026-09-01 and are what this check
 * tells apart:
 *   - A real, deployed Bubble app answers **404 JSON**
 *     (`{"statusCode":404,"body":{"status":"NOT_FOUND","message":"…"}}`) for
 *     any Data Type it does not recognise — including a made-up one — because
 *     Bubble's router still identified the app first. This is "reachable".
 *   - A `*.bubbleapps.io` subdomain with **no app behind it** answers
 *     **400 `text/plain`**: `"Error: OwnerError\n\nMessage: invalid appname
 *     hosted on bubbleapps.io"`. This is "down" — the app URL is wrong.
 * A connected **custom domain** that resolves to something other than a
 * Bubble app will not match either shape; that case reports `unknown` rather
 * than guessing which of "down" or "misconfigured" it is.
 */
const app: HealthCheckDefinition = {
  key: "app",
  title: "Bubble app reachable",
  description: "This connection's own app, via an unauthenticated request Bubble's router must " +
    "still identify the app to answer — an expired token must not make a healthy app look down.",
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
      res = await ctx.fetch(`${base}/api/1.1/obj/__w6w_health_check__`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "down", message: `app unreachable: ${String(err)}` };
    }

    if (res.status === 400) {
      const text = await res.text().catch(() => "");
      if (/invalid appname/i.test(text)) {
        return { state: "down", message: "no Bubble app at this URL — check the app URL" };
      }
      return { state: "degraded", message: `Bubble answered 400: ${text.slice(0, 200)}` };
    }
    if (res.status === 404) {
      const body = await res.json().catch(() => null) as BubbleErrorBody | null;
      const detail = safeErrorMessage(body);
      return { state: "ok", message: detail ?? "app reachable", ttlSeconds: 60 };
    }
    if (res.ok) {
      return { state: "ok", ttlSeconds: 60 };
    }
    return { state: "degraded", message: `Bubble answered ${res.status}` };
  },
};

export default app;
