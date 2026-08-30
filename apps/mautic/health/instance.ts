/**
 * Is **this connection's** Mautic reachable? — the instance's own REST API,
 * probed unsigned.
 *
 * For a self-hosted app this is the check that matters, and it is a different
 * question from "is the vendor up": the server is the operator's, and may be a
 * container on a laptop or a box behind a VPN no status page has heard of.
 *
 * ## No unauthenticated version endpoint to read
 *
 * Unlike Gitea's `GET /version`, Mautic's REST API documentation names no
 * unauthenticated endpoint that answers a version or a heartbeat — every path
 * in `devdocs.mautic.org/en/7.1/rest_api/` requires a Connection. This check
 * instead reads Mautic's own documented behaviour for an unauthenticated call
 * (`getting_started.html` §"Error handling"): a request with no credential
 * that reaches Mautic's routing gets a structured JSON error —
 * `{"error":{"message":"…","code":401 or 403}}` — rather than a silent 200.
 * That response IS the "instance is alive and this is Mautic" signal: it
 * proves the REST API is enabled and answering in Mautic's own shape, without
 * asserting anything about this Connection's own credential (which `sign`
 * never touches here).
 *
 * No public Mautic instance was reachable to confirm this envelope on the
 * wire while building this app (`community.mautic.org` and the vendor's own
 * demo hosts do not resolve) — the shape is taken from the documentation
 * page's own example, not a live capture. `degraded`/`unknown` are used for
 * anything that does not match it exactly, rather than guessing further.
 *
 * Annotation:
 *
 *   - `kind: "dependency"` — "is the thing this Connection points at
 *     reachable", not "is the vendor's platform up" (`service`) and not "is
 *     the credential live" (the derived `auth:*` check).
 *   - `scope: "connection"` — every Connection points at a different server.
 *   - `credential: "context"` — the Connection supplies the URL; the probe is
 *     deliberately unsigned so an expired or revoked API Credential cannot
 *     make a healthy instance look down.
 *
 * No `network.allow` entry: the instance host is the app's own allowlist,
 * which is `["*"]` because only the operator knows the address.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_PATH, baseUrlFromConnection, errorMessage } from "../lib/client.ts";

const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Mautic instance reachable",
  description:
    "This connection's own server, probed unsigned against /api/contacts. A structured Mautic " +
    "auth-error body proves the REST API is enabled and answering — no credential is sent, so " +
    "an expired API Credential must not make the server look down.",
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
      res = await ctx.fetch(`${base}${API_PATH}/contacts?limit=1`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      // A server that cannot be reached at all IS the failure this check is for.
      return { state: "down", message: `instance unreachable: ${String(err)}` };
    }

    const text = await res.text().catch(() => "");
    if (res.status === 404) {
      return {
        state: "down",
        message: `nothing at ${base}${API_PATH}/contacts (404) — is the instance URL right, ` +
          "and is the REST API enabled (Configuration → API Settings)?",
      };
    }

    // 200 (an operator who disabled auth entirely) or the documented
    // {"error":{...}} / {"error":"...", "error_description":"..."} envelope
    // both prove Mautic itself answered.
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = undefined;
    }
    const looksLikeMautic = res.ok ||
      (parsed !== null && typeof parsed === "object" && "error" in (parsed as object));

    if (!looksLikeMautic) {
      return {
        state: parsed === undefined ? "degraded" : "down",
        message: parsed === undefined
          ? "something answered but it was not JSON — is a proxy or login page in the way?"
          : `unexpected response (${res.status}): ${errorMessage(text)}`,
      };
    }

    return {
      state: "ok",
      message: res.ok ? "reachable (unauthenticated read allowed)" : "reachable",
      ttlSeconds: 60,
    };
  },
};

export default instance;
