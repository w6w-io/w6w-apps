/**
 * Is **this connection's** ERPNext site reachable? — probed unsigned.
 *
 * For a self-hosted app this is the check that matters, and it is a different
 * question from "is the vendor up": the site is the operator's own, and may
 * be a container on a laptop or a box behind a VPN no status page has heard
 * of.
 *
 * ## No unauthenticated version/heartbeat endpoint, so this reads a refusal
 *
 * Frappe names no bare "are you alive" route in its REST documentation. This
 * check instead calls `GET /api/method/frappe.auth.get_logged_user` with NO
 * Authorization header, and reads the shape of the refusal — verified
 * directly against the framework's own dispatch code
 * (`frappe/__init__.py#is_whitelisted`, `develop` branch, fetched
 * 2026-09-05): an unauthenticated caller is the built-in `Guest` user, and
 * `get_logged_user` is whitelisted WITHOUT `allow_guest=True`, so `Guest`
 * fails the whitelist check and Frappe raises `PermissionError` — mapped to
 * **HTTP 403** by `frappe/exceptions.py` — with the fixed message "You are
 * not permitted to access this resource. Login to access." carried inside the
 * standard `_server_messages` envelope (see `lib/client.ts#unwrapError`).
 *
 * That 403 IS the "instance is alive and this is Frappe" signal: it proves
 * the site's routing and permission system answered in Frappe's own shape,
 * without sending or needing this Connection's credential — an expired or
 * revoked API Secret must not make a healthy site look down. A 200 is also
 * accepted, for the rarer site that has enabled guest access broadly.
 *
 * Annotation:
 *
 *   - `kind: "dependency"` — "is the thing this Connection points at
 *     reachable", not "is the vendor's platform up" (`service`) and not "is
 *     the credential live" (the derived `auth:*` check).
 *   - `scope: "connection"` — every Connection points at a different site.
 *   - `credential: "context"` — the Connection supplies the URL; the probe is
 *     deliberately unsigned so an expired API Secret cannot make a healthy
 *     site look down.
 *
 * No `network.allow` entry: the site host is the app's own allowlist, which
 * is `["*"]` because only the operator knows the address.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrlFromConnection, METHOD_PATH, unwrapError } from "../lib/client.ts";

const instance: HealthCheckDefinition = {
  key: "instance",
  title: "ERPNext site reachable",
  description:
    "This connection's own site, probed unsigned against frappe.auth.get_logged_user. Frappe's " +
    "own 403 'login to access' refusal proves the site is answering as Frappe — no credential is " +
    "sent, so an expired API Secret must not make the site look down.",
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
      res = await ctx.fetch(`${base}${METHOD_PATH}/frappe.auth.get_logged_user`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      // A site that cannot be reached at all IS the failure this check is for.
      return { state: "down", message: `site unreachable: ${String(err)}` };
    }

    const text = await res.text().catch(() => "");
    if (res.status === 404) {
      return {
        state: "down",
        message: `nothing at ${base}${METHOD_PATH}/frappe.auth.get_logged_user (404) — is the ` +
          "site URL right?",
      };
    }

    if (res.ok) {
      return { state: "ok", message: "reachable (guest access allowed)", ttlSeconds: 60 };
    }

    if (res.status === 403) {
      const detail = unwrapError(res.status, text);
      // Frappe's own fixed refusal wording — anything else answering 403 is a
      // proxy or a different app impersonating the path, not confirmation.
      if (/permitted|login to access/i.test(detail)) {
        return {
          state: "ok",
          message: "reachable (unauthenticated call correctly refused)",
          ttlSeconds: 60,
        };
      }
      return { state: "degraded", message: `unexpected 403 body: ${detail}` };
    }

    return {
      state: "degraded",
      message: `unexpected response (${res.status}): ${unwrapError(res.status, text) || "no body"}`,
    };
  },
};

export default instance;
