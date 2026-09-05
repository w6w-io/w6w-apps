/**
 * Is **this connection's** Marketo pod reachable? — probed unsigned.
 *
 * Every Marketo subscription runs on its own pod at a Munchkin-ID-derived
 * host, so a generic vendor status page (even a working one) would not
 * cover any one customer's own instance. `service` below is the declared
 * absence for that question; this is the one that actually matters — is the
 * server this Connection points at up and answering Marketo's own routing?
 *
 * ## No unauthenticated endpoint, but a documented unauthenticated error shape
 *
 * Nothing in Marketo's REST API is unauthenticated. Instead, this reads
 * Marketo's own documented Response-Level error envelope
 * (`error-codes.md`): a request that reaches Marketo's routing but carries
 * no valid access token gets `{"success": false, "errors": [{"code": "601"
 * or "602", ...}]}` back at **HTTP 200** — not a connection failure, not
 * HTML, not a blank response. That shape IS the "this pod is alive and this
 * is Marketo" signal, proven without asserting anything about this
 * Connection's own credential (which `sign` never touches here).
 *
 * Annotation:
 *   - `kind: "dependency"` — "is the pod this Connection points at
 *     reachable", not "is Marketo's platform up" (`service`) and not "is the
 *     credential live" (the derived `auth:*` check).
 *   - `scope: "connection"` — every Connection points at a different pod.
 *   - `credential: "context"` — the Connection supplies the URL; the probe
 *     is deliberately unsigned so an expired or rotated Client Secret cannot
 *     make a healthy pod look down.
 *
 * No `network.allow` entry: the pod host is the app's own allowlist, which
 * is `["*"]` because only the operator's Munchkin ID says what it is.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_PATH, baseUrlFromConnection } from "../lib/client.ts";

const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Marketo pod reachable",
  description: "This connection's own pod, probed unsigned against /rest/v1/leads/describe.json. " +
    "Marketo's documented 601/602 auth-error envelope proves the pod is up and answering — no " +
    "credential is sent, so a rotated Client Secret must not make the pod look down.",
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
      res = await ctx.fetch(`${base}${API_PATH}/leads/describe.json`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "down", message: `pod unreachable: ${String(err)}` };
    }

    const text = await res.text().catch(() => "");
    let parsed:
      | { success?: boolean; errors?: Array<{ code: string; message: string }> }
      | undefined;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = undefined;
    }

    if (!parsed || typeof parsed.success !== "boolean") {
      return {
        state: "degraded",
        message: parsed === undefined
          ? "something answered but it was not Marketo's JSON envelope — is the REST base URL " +
            "right, or is a proxy/login page in the way?"
          : `unexpected response shape (${res.status})`,
      };
    }

    // A 610 "Requested resource not found" means something answered but not
    // at this path — the REST base URL is probably wrong, not that the pod
    // is down.
    const codes = (parsed.errors ?? []).map((e) => e.code);
    if (codes.includes("610")) {
      return {
        state: "down",
        message: `nothing at ${base}${API_PATH}/leads/describe.json (610) — check the REST ` +
          "base URL.",
      };
    }

    // success:true (a misconfigured pod with no auth enforced) or any other
    // documented {"success":false,"errors":[...]} shape — 601/602 (no/expired
    // token), 603 (access denied) — both prove Marketo itself answered.
    return {
      state: "ok",
      message: parsed.success ? "reachable (unauthenticated read allowed)" : "reachable",
      ttlSeconds: 60,
    };
  },
};

export default instance;
