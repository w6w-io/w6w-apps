import type { AuthDefinition } from "@w6w/types";
import { BASE } from "../lib/client.ts";

/**
 * Google spells its OAuth scopes as URL-shaped *identifiers*. `www.googleapis.com`
 * is the namespace those URNs live in — it is never fetched, and it is
 * deliberately absent from `w6w.network.allow`: this app's only API host is
 * `searchconsole.googleapis.com`. Composing the URN from a named constant
 * keeps that distinction explicit rather than leaving a bare URL literal that
 * reads like an endpoint. (Same reasoning, same wording, as this pack's other
 * `google-*` apps.)
 */
const SCOPE_NAMESPACE = "www.googleapis.com/auth";
const scope = (name: string) => `https://${SCOPE_NAMESPACE}/${name}`;

interface ListSitesResponse {
  siteEntry?: Array<{ siteUrl?: string; permissionLevel?: string }>;
}

/**
 * OAuth 2.0 — the only auth path Search Console offers — plus the one
 * connection field OAuth cannot supply.
 *
 * **Scopes.** The discovery document names exactly two, and both are used
 * as-is:
 *
 *   - `webmasters.readonly` — every read this app makes (`sites.list`,
 *     `sites.get`, `sitemaps.*` reads, `searchanalytics.query`,
 *     `urlInspection.index.inspect`).
 *   - `webmasters` — the writes (`sites.add`, `sites.delete`,
 *     `sitemaps.submit`, `sitemaps.delete`).
 *
 * Both are requested so one connection covers every action in this app;
 * `webmasters` alone already implies read access, but requesting the
 * readonly scope too costs nothing and documents intent.
 *
 * **`siteUrl`.** The site a call is addressed to is a path segment, so it has
 * to be visible to actions. It travels via `afterConnect` onto the
 * Connection's redacted `display` (the first site the grant can see, if any),
 * and each action can override it — a single account commonly has several
 * verified properties.
 *
 * Google requires `access_type=offline` + `prompt=consent` on the authorize
 * URL to reliably hand back a refresh token; without them the connection dies
 * in an hour and scheduled runs stop.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Google)",
  description:
    "Public OAuth flow. Requires a Google Cloud project with the Search Console API enabled " +
    "and OAuth client credentials configured on this w6w installation. The connecting Google " +
    "account must be a verified owner or user of the site(s) to be managed.",
  connectionLabel: "{{siteUrl}}",
  oauth2: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    refreshUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: [scope("webmasters"), scope("webmasters.readonly")],
    extraAuthParams: {
      access_type: "offline",
      prompt: "consent",
    },
    pkce: true,
  },

  /** The only hook handed the credential. It stamps the bearer and returns. */
  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `sites.list` is the right liveness probe: it needs no site id, needs only
   * `webmasters.readonly`, and returns every site the credential can see — so
   * it proves the bearer without assuming the connection's `siteUrl` is
   * already correct. A credential that owns no verified sites still answers
   * 200 with an empty object, which is a working connection with no data
   * behind it, and is reported as such rather than as a failure. Verified
   * live (2026-09-05): an unsigned call to this same path answers a
   * schema-correct `{"error":{"code":401,"status":"UNAUTHENTICATED"}}`, which
   * is what a rejected token looks like here — the body names no credential
   * value, so there is no echo risk to route around.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${BASE}/webmasters/v3/sites`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (res.status === 401) return { ok: false, message: "Google rejected the token (401)" };
    if (!res.ok) return { ok: false, message: `Search Console returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Records the first verified site the grant can see, so actions have a
   * default without every call needing an explicit `siteUrl`. Best-effort: a
   * failed lookup or an account with zero sites must not fail the connect
   * flow — `siteUrl` is simply left unset, and every action still accepts it
   * as a per-call override.
   */
  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken: string };
    const res = await ctx.fetch(`${BASE}/webmasters/v3/sites`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as ListSitesResponse | null;
    const first = body?.siteEntry?.[0];
    if (!first?.siteUrl) return {};
    return { siteUrl: first.siteUrl, permissionLevel: first.permissionLevel };
  },
};

export default oauth2;
