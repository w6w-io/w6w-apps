/**
 * Is this connection's Booqable company slug reachable?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — a different question from the vendor-wide
 *     `service` check: whether THIS account's own host answers at all.
 *   - `scope: "connection"` — every Connection points at a different company
 *     slug, which is also a different account/host.
 *   - `credential: "context"` — the Connection supplies which host to call,
 *     but no credential is needed to interpret the answer. `sign` must not
 *     run.
 *   - No `network.allow` is declared: `*.booqable.com` is already on the
 *     app's allowlist, and a `context` check is unsigned regardless.
 *   - `severity` defaults to `degraded` for this kind.
 *
 * The probe is deliberately UNauthenticated, so a **401 is a pass**: it
 * proves the company slug resolves to a real Booqable account and the API is
 * answering — exactly what this check is for. Whether the credential itself
 * is any good is the derived `auth:*` check's job.
 *
 * Verified live 2026-09-06 against `https://irent.booqable.com/api/4/companies/current`
 * (a real, unrelated company found in a documented example response) with NO
 * `Authorization` header: `401 {"errors":[{"code":"unauthorized","status":"401",
 * "title":"Access denied","detail":"You need to be logged in."}]}`. The exact
 * same unauthenticated request against a fabricated slug
 * (`this-should-not-exist-xyz123.booqable.com`) and against the docs' own
 * placeholder host (`example.booqable.com`, which is not a real company)
 * both answer `404 {"errors":[{"code":"resources_not_found","status":"404",
 * "title":"Resource(s) not found"}]}` — a body shape distinguishable from the
 * 401 above. Booqable serves every `*.booqable.com` subdomain from one
 * Heroku app (a shared `via: heroku-router` header on both responses), so
 * this cannot be told apart at the DNS/TLS level the way a per-tenant CNAME
 * setup could be — the distinction only exists in the JSON error body,
 * which is why this check reads `errors[0].code` rather than trusting the
 * HTTP status alone.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrl, errorMessage } from "../lib/client.ts";

const companyDomain: HealthCheckDefinition = {
  key: "company-domain",
  title: "Company slug reachable",
  description:
    "Unauthenticated request to this connection's Booqable company slug. A 401 passes — it " +
    "proves the company exists and is serving; credential validity is the `auth:*` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { companySlug?: string };
    if (!display.companySlug) {
      return { state: "unknown", message: "connection records no company slug" };
    }

    const res = await ctx.fetch(`${baseUrl(display.companySlug)}/companies/current`, {
      headers: { accept: "application/json" },
    });
    if (res.status === 401) return { state: "ok", ttlSeconds: 120 };
    if (res.status === 404) {
      return {
        state: "down",
        message: "company slug not found — the account may have been renamed",
      };
    }
    if (res.status >= 500) return { state: "down", message: `company slug returned ${res.status}` };
    const message = errorMessage(await res.text().catch(() => ""));
    return { state: "unknown", message: message || `unexpected status ${res.status}` };
  },
};

export default companyDomain;
