/**
 * Is this connection's Kustomer org host reachable?
 *
 * Mirrors `apps/freshdesk/health/domain.ts` — Kustomer, like Freshdesk, gives
 * every account its own host (`{orgname}.api.kustomerapp.com`), so a status
 * page cannot answer for a specific org. This probes the connection's own
 * host unauthenticated.
 *
 * - `kind: "dependency"`, `scope: "connection"`, `credential: "context"` —
 *   the check needs the Connection to know WHICH host to call, and needs no
 *   credential to interpret the answer; `sign` must not run.
 * - No `network.allow` is declared: `*.api.kustomerapp.com` is already on the
 *   app's allowlist, and a `context` check is unsigned regardless.
 *
 * A **401 is a pass** — Kustomer requires auth on every endpoint (there is no
 * unauthenticated ping), so an unauthenticated request to `/v1/users/current`
 * answering 401 rather than a connection error or 404 proves the org's host
 * resolves, TLS terminates, and the API is answering. Whether the stored
 * credential is any good is the derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

const domain: HealthCheckDefinition = {
  key: "domain",
  title: "Org host reachable",
  description:
    "Unauthenticated request to this connection's Kustomer org host. A 401 passes — it proves the org is serving; credential validity is the `auth:*` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { orgSubdomain?: string };
    if (!display.orgSubdomain) {
      return { state: "unknown", message: "connection records no org subdomain" };
    }

    const res = await ctx.fetch(`${baseUrl(display.orgSubdomain)}/users/current`);
    if (res.status === 404) {
      return { state: "down", message: "org host not found — the org may have been renamed" };
    }
    if (res.status >= 500) {
      return { state: "down", message: `org host returned ${res.status}` };
    }
    // 401 (no credential attached) and 200 both mean the org is serving.
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default domain;
