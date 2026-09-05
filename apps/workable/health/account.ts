/**
 * Is *this* Workable account reachable, and does the token actually belong
 * to the subdomain this connection records?
 *
 * ## It has to be signed, and that is the point
 *
 * Every other connection-scoped dependency check in this pack (Zendesk,
 * Gorgias) probes unauthenticated so a revoked credential does not read as an
 * outage. Workable gives no such signal: `*.workable.com` resolves through a
 * shared Cloudflare edge for every subdomain (verified live — a made-up
 * subdomain and a real one resolve to the same two anycast IPs), and an
 * UNAUTHENTICATED request to either answers the identical `401
 * invalid_token` body. There is nothing to learn from an unsigned probe here.
 *
 * A signed request is different: Workable ties an access token to one
 * account, so `GET /accounts/:subdomain` with a real token answers `404` when
 * the subdomain isn't the token's own account (the same 404 `auth/
 * access-token.ts`'s `test` hook treats as a credential/subdomain mismatch).
 * That is the one signal this vendor actually offers, so this check trades
 * the "never signs a dependency probe" convention for it deliberately, the
 * same trade `apps/azure-blob`'s `account` check makes for the same reason
 * (Azure also has no unauthenticated signal).
 *
 * This overlaps with the derived `auth:access-token` check (from the Auth
 * `test` hook), which already answers "is this credential+subdomain pair
 * live" — the two are intentionally redundant in what they measure, since a
 * host may cache `auth:*` results less eagerly than a dedicated dependency
 * check with its own `minIntervalSeconds`.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrl, subdomainFromConnection } from "../lib/client.ts";

const account: HealthCheckDefinition = {
  key: "account",
  title: "Account reachable",
  description:
    "Signed request to this connection's own subdomain. Workable offers no unauthenticated " +
    "signal that distinguishes a real subdomain from a made-up one, so this probe is necessarily " +
    "signed — see the file header.",
  kind: "dependency",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let subdomain: string;
    try {
      subdomain = subdomainFromConnection(ctx.connection);
    } catch (err) {
      return { state: "unknown", message: String(err) };
    }

    const res = await ctx.fetch(`${baseUrl(subdomain)}/accounts/${subdomain}`);
    if (res.status === 404) {
      return {
        state: "down",
        message: "404 — this token does not belong to the account at this subdomain",
      };
    }
    if (res.status === 401) {
      return { state: "down", message: "401 — the token is invalid or was revoked" };
    }
    if (res.status >= 500) {
      return { state: "down", message: `Workable returned ${res.status}` };
    }
    if (!res.ok) {
      return { state: "degraded", message: `Workable returned ${res.status}` };
    }
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default account;
