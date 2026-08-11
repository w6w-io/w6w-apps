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
 *   - **Tenant segment: `common`.** Unlike the sibling `excel` App — where the
 *     workbook API genuinely does not serve consumer OneDrive and the tenant
 *     segment has to be `organizations` — every endpoint this App calls is
 *     documented for *Delegated (personal Microsoft account)* as well as work
 *     or school. `common` is the only value that accepts both, which is what
 *     "OneDrive" means to a user. A deployment that must be restricted to one
 *     tenant registers its own app and overrides these URLs with its tenant id
 *     or verified domain.
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
 * Scopes are the least-privileged set that covers every action in this App,
 * each one taken from the "Least privileged permissions / Delegated" row of the
 * endpoint's own reference page:
 *
 *   - `Files.ReadWrite` — the signed-in user's own drive: read, upload, create
 *     folder, copy, move, rename, delete, createLink, invite, delete permission.
 *   - `Files.ReadWrite.All` — the two things `Files.ReadWrite` does not reach:
 *     `GET /me/drive/sharedWithMe` (least privileged: `Files.Read.All`) and any
 *     drive addressed by id rather than as `/me/drive`. Its delegated form
 *     requires **no admin consent** and is offered on personal Microsoft
 *     accounts, so requesting it does not narrow who can connect.
 *   - `User.Read` — the `test` / `afterConnect` probe.
 *   - `offline_access` — refresh token.
 *
 * The Graph reference lists `Sites.ReadWrite.All` as a further alternative for
 * SharePoint-backed drives. It is deliberately not requested: `Files.ReadWrite.All`
 * already covers "all files the signed-in user can access", and a tenant that has
 * restricted that adds the site permission to its own app registration.
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
  "Files.ReadWrite",
  "Files.ReadWrite.All",
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
   * `User.Read`, so a credential that legitimately lacks a files scope still
   * reports as live rather than as broken.
   * https://learn.microsoft.com/en-us/graph/api/user-get
   *
   * It is also the right probe on the *don't echo the credential* test: the
   * `user` resource it returns carries directory profile fields (id,
   * displayName, mail, userPrincipalName) and no token, key or secret of any
   * kind. `GET /me/drive` would work too but needs a files scope, and
   * `/me/drive/root` would fail for a licensed user whose OneDrive has never
   * been provisioned.
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
