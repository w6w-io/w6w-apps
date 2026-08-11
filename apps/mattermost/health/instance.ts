import type { HealthCheckDefinition } from "@w6w/types";
import { siteUrlFromConnection } from "../lib/client.ts";

/**
 * Is *this connection's* Mattermost server reachable?
 *
 * This is the check that carries real weight for a self-hosted tenant, and it is
 * per-Connection rather than per-App: "Mattermost Cloud is down" and "our server
 * is down" are different problems with different fixes, and most installs are
 * the second kind.
 *
 * ## `/api/v4/system/ping` is the right probe, and it is unauthenticated
 *
 * Verified on the wire against `community.mattermost.com` (server 11.11.0) on
 * 2026-08-11: with **no** `Authorization` header it answers
 *
 *     200 {"ActiveSearchBackend":"opensearch","AndroidLatestVersion":"",
 *          "AndroidMinVersion":"","IosLatestVersion":"","IosMinVersion":"",
 *          "status":"OK"}
 *
 * That property is exactly why it is used *here* and never as the credential
 * probe: a check that passes without a credential cannot tell you a credential
 * works. It can tell you the server is up, which is this check's whole job, and
 * `credential: "none"` means the token is never sent to it.
 *
 * The response is also read, not just the status line. A reverse proxy in front
 * of a stopped Mattermost commonly answers `200` with its own page, and
 * Mattermost is very commonly behind one, so a body without `status: "OK"` is
 * reported as degraded rather than counted as healthy.
 *
 * `X-Version-Id` is surfaced in the message because "which build is this
 * server?" is the first question when an endpoint 404s on one connection and
 * works on another.
 *
 * Severity is left at the `degraded` default for `kind: "dependency"` — this one
 * really is evidence about the Connection.
 */
const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Server reachable",
  description: "Probes this connection's own Mattermost server at /api/v4/system/ping, which is " +
    "unauthenticated by design — so the check runs unsigned and never sends the access token.",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 30,

  async check(_input, ctx) {
    let base: string;
    try {
      base = siteUrlFromConnection(ctx.connection);
    } catch (err) {
      return { state: "unknown", message: (err as Error).message };
    }

    const res = await ctx.fetch(`${base}/api/v4/system/ping`, {
      headers: { accept: "application/json" },
    });

    if (!res.ok) {
      return {
        state: res.status >= 500 ? "down" : "degraded",
        message: `Server answered ${res.status} at /api/v4/system/ping`,
      };
    }

    const body = await res.json().catch(() => null) as { status?: string } | null;
    if (body?.status !== "OK") {
      return {
        state: "degraded",
        message:
          "Host answered 200 but not with a Mattermost ping — is a proxy standing in for the " +
          "server?",
      };
    }

    const version = res.headers.get("x-version-id");
    return {
      state: "ok",
      message: version ? `server ${version.split(".").slice(0, 3).join(".")}` : undefined,
      ttlSeconds: 30,
    };
  },
};

export default instance;
