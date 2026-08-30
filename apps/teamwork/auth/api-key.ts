import type { AuthDefinition } from "@w6w/types";
import { baseUrl, readError } from "../lib/client.ts";

/**
 * API key (`basic`).
 *
 * Verified against apidocs.teamwork.com/guides/teamwork/authentication: "For
 * all requests to our API with Basic, first add the Basic word followed by a
 * space and a base64-encoded string `{API_KEY or username}:password` in the
 * Authorization header" — its own curl example is
 * `curl -i https://{yourSiteName}.teamwork.com/projects/api/v3/projects.json
 * -H "Authorization: Basic <base64>"`. The password half is unspecified for
 * the API-key case (there is no real password — the key alone identifies the
 * caller), so this app uses the literal `X` placeholder, the same convention
 * `freshdesk`'s identical Basic-with-API-key scheme documents.
 *
 * The site name (`{yourSiteName}` in Teamwork's own docs) is collected here
 * rather than per-action: it identifies the account, so it belongs to the
 * Connection. `afterConnect` echoes it onto the connection's display data,
 * which is where `lib/client.ts` reads it from.
 *
 * ## No 404 for a nonexistent site — verified live, 2026-08-30
 *
 * Freshdesk's per-account host answers 404 for a nonexistent domain, which
 * lets a `dependency`-kind health check tell "wrong account" apart from "bad
 * credential" (see `freshdesk/health/domain.ts`). Teamwork's does not: an
 * unauthenticated request to a deliberately bogus subdomain
 * (`intentionally-bad-subdomain-w6wtest.teamwork.com`) answers the exact same
 * `401 {"errors":[{"title":"unexpected error","detail":"401: Not
 * authorized"}]}` as a real site with a wrong key — `*.teamwork.com` fronts
 * every request with the same auth gate before it knows whether the account
 * exists. There is no unauthenticated signal this app can probe that
 * distinguishes the two, so no separate `dependency` health check is
 * declared; a failing `auth:api-key` check is the only signal for either
 * cause, and its message says so.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "Find your API key under your name (top right) → Edit My Details → API & Mobile in your Teamwork site.",
  connectionLabel: "{{person.firstName}} {{person.lastName}} ({{domain}})",
  fields: [
    {
      key: "domain",
      label: "Site name",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "Just the subdomain from `acme.teamwork.com` — not the full URL.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Your name (top right) → Edit My Details → API & Mobile.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    // Teamwork's Basic auth: the API key as the username. There is no real
    // password — "X" is a placeholder, same convention as Freshdesk's
    // identical scheme.
    request.headers["authorization"] = `Basic ${btoa(`${apiKey}:X`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { domain, apiKey } = credential as { domain?: string; apiKey?: string };
    if (!domain || !apiKey) {
      return { ok: false, message: "credential missing domain or apiKey" };
    }
    const res = await ctx.fetch(`${baseUrl(domain)}/projects/api/v3/people.json?pageSize=1`, {
      headers: { authorization: `Basic ${btoa(`${apiKey}:X`)}`, accept: "application/json" },
    });
    if (!res.ok) {
      const detail = await readError(res);
      return {
        ok: false,
        message: `Teamwork returned ${res.status}: ${detail || "check the site name and API key"}`,
      };
    }
    return { ok: true };
  },

  /**
   * Records the site name on the connection so the client can build URLs
   * without ever seeing the credential, and fetches the caller's own person
   * record for the connection label — `GET /projects/api/v3/people.json`
   * with no `ids` filter and `pageSize=1` returns the requesting user first,
   * per Teamwork's own ordering default (`orderBy=name` is NOT applied when
   * unset; the API's default list order surfaces the caller). This never
   * echoes the credential — it returns account display data only.
   */
  async afterConnect({ credential }, ctx) {
    const { domain, apiKey } = credential as { domain?: string; apiKey?: string };
    if (!domain) return {};
    const res = await ctx.fetch(`${baseUrl(domain)}/projects/api/v3/people.json?pageSize=1`, {
      headers: { authorization: `Basic ${btoa(`${apiKey}:X`)}`, accept: "application/json" },
    });
    if (!res.ok) return { domain };
    const body = await res.json().catch(() => ({})) as {
      people?: Array<{ id?: number; firstName?: string; lastName?: string }>;
    };
    const person = body.people?.[0];
    if (!person) return { domain };
    return {
      domain,
      person: { id: person.id, firstName: person.firstName, lastName: person.lastName },
    };
  },
};

export default apiKey;
