/**
 * Is this connection's Gorgias domain reachable?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — a different question from the vendor-wide
 *     `service` check: whether THIS account's own host answers at all.
 *   - `scope: "connection"` — every Connection points at a different domain,
 *     which is also a different account.
 *   - `credential: "context"` — the posture a boolean would lose. The check
 *     needs the Connection to know WHICH host to call, and needs no
 *     credential to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: `*.gorgias.com` is already on the app's
 *     allowlist, and a `context` check is unsigned regardless.
 *   - `severity` defaults to `degraded` for this kind.
 *
 * The probe is deliberately unauthenticated, so a **401 is a pass**: it
 * proves the domain resolves, TLS terminates, and the API is answering —
 * exactly what this check is for. Whether the credential is any good is the
 * derived `auth:*` check's job.
 *
 * Verified live 2026-08-29: an unauthenticated `GET /api/account` against a
 * real Gorgias domain returns `401 {"error":{"msg":"Unauthorized."}}`, while
 * a made-up subdomain returns a plain Flask `404 Not Found` HTML page — the
 * same distinguishable shape `apps/freshdesk`'s equivalent check relies on.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

const domain: HealthCheckDefinition = {
  key: "domain",
  title: "Account domain reachable",
  description:
    "Unauthenticated request to this connection's Gorgias domain. A 401 passes — it proves the account is serving; credential validity is the `auth:*` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { domain?: string };
    if (!display.domain) {
      return { state: "unknown", message: "connection records no domain" };
    }

    const res = await ctx.fetch(`${baseUrl(display.domain)}/account`);
    if (res.status === 404) {
      return { state: "down", message: "domain not found — the account may have been renamed" };
    }
    if (res.status >= 500) {
      return { state: "down", message: `domain returned ${res.status}` };
    }
    // 200 and 401 both mean the account is serving. That is the whole question.
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default domain;
