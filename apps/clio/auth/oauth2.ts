import type { AuthDefinition } from "@w6w/types";
import { apiBaseFor, apiHost, type ClioRegion, formatClioError } from "../lib/client.ts";

/**
 * Clio's Authorization Code grant, one Auth method per region.
 *
 * Verified 2026-08-24 against `docs.developers.clio.com/api-docs/clio-manage/authorization/`
 * plus live probes against all four regional hosts.
 *
 * ## Why four Auth methods, not one with a region field
 *
 * The authorize/token endpoints live on the SAME per-region host as the API
 * itself (`eu.app.clio.com/oauth/authorize`, not a shared `accounts.clio.com`)
 * — confirmed live: all four hosts answer `302` to `GET /oauth/authorize` and
 * `401` to an unauthenticated `GET /api/v4/users/who_am_i.json`. Which host to
 * redirect the browser to has to be decided BEFORE that redirect, so it cannot
 * be a connect-time form field the way an API token's region often is — this
 * is exactly `apps/docusign`'s production/demo split, generalized to four
 * regions instead of two environments. `createClioOAuth` is the shared
 * factory; `oauth2-eu.ts`, `oauth2-ca.ts` and `oauth2-au.ts` are three-line
 * siblings that call it with a different region. `lib/client.ts`'s
 * `regionFromConnection` is what lets every Action stay region-agnostic:
 * it reads the region `afterConnect` recorded, once, on the Connection.
 *
 * ## No OAuth `scope` parameter, on purpose
 *
 * Clio's Permissions guide states plainly that "access permissions" — read
 * and read/write, per resource type (Matters, Contacts, Tasks, ...) — are
 * chosen when the OAuth application itself is REGISTERED in the Clio
 * developer portal, not requested per authorization request. The
 * `/oauth/authorize` example in Clio's own docs carries no `scope` parameter
 * at all. So `oauth2.scopes` is deliberately left empty here rather than
 * populated with resource names that would never actually reach the wire —
 * an app registered with only read access to Matters will 403 on
 * `matter-create` regardless of anything this app declares, and the fix is
 * changing the app's own registration, not this Connection.
 *
 * ## PKCE
 *
 * Clio's docs describe only the classic `client_id` + `client_secret` +
 * `redirect_uri` confidential-client dance and never mention PKCE, so
 * `pkce: false` — enabling it would add a `code_challenge` Clio's
 * `/oauth/authorize` has no documented support for.
 *
 * ## `refresh` and `exchange` are intentionally NOT implemented here
 *
 * Every one of this pack's 88 other `oauth2`-type apps leaves the standard
 * authorization-code exchange and refresh-token renewal to the host's
 * generic OAuth2 handling (driven by the declared `tokenUrl`), rather than
 * re-implementing RFC 6749 per app. Clio's token endpoint takes the fully
 * standard `grant_type=authorization_code` / `grant_type=refresh_token` forms
 * (`application/x-www-form-urlencoded`, JSON response), so this app follows
 * the same precedent.
 */
export function createClioOAuth(region: ClioRegion): AuthDefinition {
  const host = apiHost(region);
  const base = apiBaseFor(region);
  const isDefault = region === "us";

  return {
    key: isDefault ? "oauth2" : `oauth2-${region}`,
    type: "oauth2",
    displayName: isDefault
      ? "OAuth (US — app.clio.com)"
      : `OAuth (${region.toUpperCase()} — ${host})`,
    description: isDefault
      ? "Clio's US-region production account (app.clio.com). Requires an OAuth application " +
        "registered in the Clio developer portal with a matching redirect URI."
      : `Clio's ${region.toUpperCase()}-region account (${host}). Use this instead of the ` +
        "default US method when the workspace was created in that region — a workspace never " +
        "moves between regions after creation.",
    connectionLabel: `{{name}} ({{email}}) · ${region.toUpperCase()}`,
    oauth2: {
      authorizationUrl: `https://${host}/oauth/authorize`,
      tokenUrl: `https://${host}/oauth/token`,
      refreshUrl: `https://${host}/oauth/token`,
      // See "No OAuth `scope` parameter, on purpose" above.
      scopes: [],
      pkce: false,
    },

    sign({ request, credential }) {
      const { accessToken } = credential as { accessToken: string };
      request.headers["authorization"] = `Bearer ${accessToken}`;
      return request;
    },

    /**
     * `GET /users/who_am_i.json` — the whoami. Chosen because it requires no
     * particular access permission beyond the baseline every OAuth application
     * has (it is about the AUTHENTICATED USER, not a resource type an app's
     * registration can be scoped away from) and its response — id, name,
     * email, roles, time zone — carries no credential material (verified
     * against the `User` / `User_base` OpenAPI schemas).
     */
    async test({ credential }, ctx) {
      const { accessToken } = credential as { accessToken?: string };
      if (!accessToken) return { ok: false, message: "credential missing accessToken" };

      const res = await ctx.fetch(`${base}/users/who_am_i.json?fields=id,name`, {
        headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) return { ok: true };

      const detail = await res.text().catch(() => "");
      const message = formatClioError(res.status, "GET", "/users/who_am_i.json", detail);
      return { ok: false, message };
    },

    /** Publish the user's name, email and this Connection's region. Nothing else. */
    async afterConnect({ credential }, ctx) {
      const { accessToken } = credential as { accessToken?: string };
      if (!accessToken) return { region };

      const res = await ctx.fetch(`${base}/users/who_am_i.json?fields=id,name,email`, {
        headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return { region };

      const body = await res.json().catch(() => null) as
        | { data?: { id?: number; name?: string; email?: string } }
        | null;
      const user = body?.data;
      if (!user?.name) return { region };

      return { region, userId: user.id, name: user.name, email: user.email };
    },
  };
}

export default createClioOAuth("us");
