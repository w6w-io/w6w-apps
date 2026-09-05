/**
 * OAuth 2.0 authorization code flow against the Microsoft identity platform
 * (Microsoft Entra ID), v2.0 endpoints.
 *
 * https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
 *
 * You register an application (Entra admin center → App registrations), add a
 * Web redirect URI, and store the resulting `client_id` + `client_secret` +
 * `redirect_uri` on the w6w server via `PUT /apps/:id/oauth-config/oauth2`. End
 * users then connect through the browser authorization dance.
 *
 * Microsoft specifics that drove the config below:
 *
 *   - **Tenant segment: `common`, not `organizations`.** Unlike the sibling
 *     `sharepoint` and `excel` Apps — whose reference pages state plainly
 *     "Delegated (personal Microsoft account): Not supported" for every
 *     endpoint — the OneNote API overview opens with "get authorized access to
 *     a user's OneNote notebooks, sections, and pages in a **personal or
 *     organization account**", and every single permission table below (Get
 *     notebook, List notebooks, Create page, Update page, Delete page, …)
 *     lists a non-empty "Delegated (personal Microsoft account)" row. `common`
 *     is the only tenant segment that accepts both, matching the sibling
 *     `onedrive` App's same conclusion for the same reason. A deployment that
 *     must be restricted to one tenant registers its own app and overrides
 *     these URLs with its tenant id or verified domain.
 *
 *   - **App-only authentication is explicitly unsupported.** The overview's own
 *     note says so ("The Microsoft Graph OneNote API doesn't support app-only
 *     authentication"), which is also why every permission table's
 *     "Application" row is either absent or a dead end — this App offers only
 *     delegated OAuth, never client-credentials.
 *
 *   - **`Notes.ReadWrite`, not the "least privileged" `Notes.Create`.** Nearly
 *     every read AND create endpoint's permission table lists `Notes.Create`
 *     as the *least privileged* delegated scope — which reads backwards until
 *     you notice what it actually grants: access restricted to notebooks and
 *     pages the connecting app itself created, not the ones the user already
 *     had. A credential connected with only `Notes.Create` would list zero
 *     notebooks on a OneNote account that predates this App. `Notes.ReadWrite`
 *     is the narrowest scope that also reaches pre-existing content, and it is
 *     the ONLY delegated scope this App's two write endpoints without a
 *     `Notes.Create` alternative — Update Page content and Delete Page — offer
 *     at all (their tables list no `Notes.Create` row).
 *
 *   - **Refresh tokens come from a scope, not a parameter.** Unlike Google
 *     (`access_type=offline`), Microsoft issues a refresh token only when
 *     `offline_access` is among the requested scopes — so it is listed as a
 *     scope and there are no `extraAuthParams`.
 *
 *   - **PKCE.** The docs call `code_challenge` "recommended for all application
 *     types, both public and confidential clients", and `S256` is supported, so
 *     it is left on (the spec default is `true` anyway).
 *
 * Scopes: `offline_access` (refresh token), `User.Read` (the `test` /
 * `afterConnect` probe — the same choice the sibling `onedrive`, `excel` and
 * `sharepoint` Apps make, since it is the cheapest authenticated call Graph
 * offers and needs no OneNote-specific scope), `Notes.ReadWrite` (every
 * notebook/section/sectionGroup/page read, create, update and delete in this
 * App).
 */
import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/** Work-or-school *and* personal accounts. See the note on the tenant segment above. */
const TENANT = "common";

export const AUTHORIZATION_URL =
  `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`;
export const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;

export const SCOPES = [
  "offline_access",
  "User.Read",
  "Notes.ReadWrite",
];

interface GraphUser {
  id?: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
}

const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Microsoft)",
  description:
    "Public OAuth flow for a work, school or personal Microsoft account. Requires a Microsoft Entra ID app registration (client_id / client_secret / redirect_uri) configured on this w6w installation.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  oauth2: {
    authorizationUrl: AUTHORIZATION_URL,
    tokenUrl: TOKEN_URL,
    scopes: SCOPES,
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  /**
   * `GET /me` is the cheapest authenticated Graph call and needs only
   * `User.Read`, so a credential that legitimately lacks a Notes scope still
   * reports as live rather than as broken. Probing `/me/onenote/notebooks`
   * instead would conflate "no notebook yet" (a normal, brand-new account)
   * with "credential is dead".
   * https://learn.microsoft.com/en-us/graph/api/user-get
   *
   * It is also the right probe on the *don't echo the credential* test: the
   * `user` resource it returns carries directory profile fields (id,
   * displayName, mail, userPrincipalName) and no token, key or secret of any
   * kind.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Microsoft Graph returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me`);
    if (!res.ok) return {};
    const profile = await res.json().catch(() => null) as GraphUser | null;
    if (!profile) return {};
    // `mail` is null for accounts without a provisioned mailbox address;
    // `userPrincipalName` is always present and is what the user recognises.
    const email = profile.mail ?? profile.userPrincipalName;
    return {
      user: {
        id: profile.id,
        email,
        name: profile.displayName ?? email,
      },
    };
  },
};

export default oauth2;
