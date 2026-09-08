/**
 * Is **this Connection's** homeserver reachable? — probed unsigned against the
 * one endpoint the spec deliberately puts outside version negotiation:
 * `GET /_matrix/client/versions` (verified 2026-09-06 — note this is NOT
 * under `/_matrix/client/v3`, unlike every action endpoint in this app; the
 * spec's own point of this endpoint is that a client should be able to ask
 * "which versions do you speak?" without first assuming any prefix works).
 *
 * For a federated protocol this is the check that matters, and it is a
 * different question from "is Matrix up" (`service`): the homeserver is
 * whichever one this Connection was made against — `matrix.org`, or a
 * self-hosted Synapse a person is running on a laptop or behind a VPN no
 * status page has heard of.
 *
 * The probe is deliberately unsigned (`credential: "context"` — no
 * Authorization header at all, per the endpoint's own "Requires
 * authentication: Optional"): an expired or revoked access token must not
 * make a perfectly reachable homeserver look down. The 200 response's shape
 * is a `versions: [string]` array, which is enough on its own to confirm
 * "this is answering the Matrix Client-Server API", regardless of which
 * version numbers it lists.
 *
 * Annotation:
 *
 *   - `kind: "dependency"` — "is the thing this Connection points at
 *     reachable", not "is the protocol up" (`service`) and not "is the
 *     credential live" (the derived `auth:*` checks).
 *   - `scope: "connection"` — every Connection points at a different
 *     homeserver.
 *   - `credential: "context"` — the Connection supplies the homeserver URL;
 *     the probe itself needs no token to interpret.
 *
 * No `network.allow` entry: the homeserver host is the app's own allowlist,
 * which is `["*"]` because only the account holder knows the address.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { homeserverUrlFromConnection, VERSIONS_PATH } from "../lib/client.ts";

const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Homeserver reachable",
  description:
    "This connection's own homeserver, via its unauthenticated /_matrix/client/versions " +
    "endpoint. Sends no credential — an expired access token must not make a healthy " +
    "homeserver look down.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "context",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let base: string;
    try {
      base = homeserverUrlFromConnection(ctx.connection);
    } catch (err) {
      return { state: "unknown", message: String((err as Error).message) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}${VERSIONS_PATH}`, { headers: { accept: "application/json" } });
    } catch (err) {
      // A homeserver that cannot be reached at all IS the failure this check is for.
      return { state: "down", message: `homeserver unreachable: ${String(err)}` };
    }

    if (!res.ok) {
      return {
        state: "down",
        message: res.status === 404
          ? `nothing at ${base}${VERSIONS_PATH} (404) — is the homeserver URL right?`
          : `${VERSIONS_PATH} returned ${res.status}`,
      };
    }

    const body = await res.json().catch(() => null) as { versions?: unknown } | null;
    if (!body || !Array.isArray(body.versions) || body.versions.length === 0) {
      return {
        state: "degraded",
        message: "something answered, but not with a Matrix `versions` list — is this a " +
          "homeserver, or a proxy/login page in the way?",
      };
    }

    return {
      state: "ok",
      message: `speaks ${body.versions.join(", ")}`,
      ttlSeconds: 60,
    };
  },
};

export default instance;
