import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

/**
 * Is this connection's Freshsales domain reachable?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — Freshsales publishes no machine-readable status
 *     (which is why `service` is declared `unavailable`). The one thing that
 *     can be probed automatically is whether THIS account's domain answers.
 *   - `scope: "connection"` — every Connection points at a different
 *     `acme.myfreshworks.com` domain, which is also a different account.
 *   - `credential: "context"` — the posture a boolean would lose. The check
 *     needs the Connection to know WHICH host to call, and needs no
 *     credential to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: `*.myfreshworks.com` is already on the
 *     app's allowlist, and a `context` check is unsigned regardless.
 *   - `severity` defaults to `degraded` for this kind.
 *
 * The probe is deliberately unauthenticated, so a **401 is a pass**: it
 * proves the domain resolves, TLS terminates, and the API is answering —
 * exactly what this check is for. Whether the credential is any good is the
 * derived `auth:*` check's job, and conflating the two is how "the account
 * was renamed" gets misreported as "your API key expired." Only a transport
 * failure (the hook throws), a 404 (domain gone — the docs' own §Errors
 * table lists 404 for "invalid ID/Freshsales domain in the URL") or a 5xx
 * counts as down.
 */
const domain: HealthCheckDefinition = {
  key: "domain",
  title: "Account domain reachable",
  description:
    "Unauthenticated request to this connection's Freshsales domain. A 401 passes — it proves " +
    "the account is serving; credential validity is the `auth:*` check's job.",
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

    const res = await ctx.fetch(`${baseUrl(display.domain)}/contacts/filters`);
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
