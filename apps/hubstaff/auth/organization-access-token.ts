import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Hubstaff Organization access token — `Authorization: Bearer hsoat_…`.
 *
 * Verified against the rendered Authentication page
 * (<https://developer.hubstaff.com/authentication/>, fetched 2026-09-22) and
 * live probes against `api.hubstaff.com` on the same day.
 *
 * ## Why an Organization access token and not one of the other two
 *
 * Hubstaff's API accepts three credential kinds, and only one of them fits a
 * single `sign` step:
 *
 *  - **Personal access tokens (PAT)** — the string you create is a *refresh*
 *    token, not an access token. Every call needs a prior
 *    `POST https://account.hubstaff.com/access_tokens` exchange that returns a
 *    24-hour access token *and a new refresh token*, and the vendor's own docs
 *    say the old refresh token stops being accepted ("replace what you have on
 *    disk on every refresh"). That is mutable, rotating state — two hosts
 *    refreshing the same connection would invalidate each other. It also means
 *    sending a credential to a *second* host, `account.hubstaff.com`, which
 *    this app does not declare.
 *  - **OAuth applications** — Authorization Code + PKCE through
 *    `account.hubstaff.com/authorizations/new`. There is no interactive
 *    sign-in step anywhere in this app, so the flow cannot run.
 *  - **Organization access tokens** (`hsoat_…`) — the secret **is** the
 *    credential: "there is no token exchange, no refresh, and no browser flow".
 *    It is created once by an owner/manager/Manage-IT member under
 *    **Settings → Organization → API tokens** and assigned to an existing
 *    member; it then "authenticates as that member, with exactly that member's
 *    current organization role and access". One opaque string, one header.
 *
 * ## The header is the only place the secret ever goes
 *
 * A URL is logged by every proxy between here and Hubstaff, so the secret is
 * never a query parameter. {@link authHeaders} is the single place the wire
 * format is built, and `test` and `afterConnect` go through it too — a
 * hand-rolled second copy is how a probe ends up sending a header the real
 * requests do not.
 *
 * ## Expiry is real, and it is a 401
 *
 * A token is created with an expiry of 30/60/90 days or **Never** (the
 * default). It also dies when its assignee is removed from the organization.
 * Both cases answer `401`. Reassigning a token to another member keeps the
 * secret working — only the acting member changes — so a 401 here means expiry,
 * revocation, or a removed assignee, never "reconnect and it will be fixed".
 */

export interface HubstaffCredential {
  organizationAccessToken: string;
}

/**
 * The one place the wire format is built. Exported so `test` and `afterConnect`
 * exercise the same code path `sign` does.
 */
export function authHeaders(credential: Partial<HubstaffCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.organizationAccessToken ?? ""}` };
}

/**
 * The credential-liveness probe: `GET /v2/organizations`.
 *
 * Chosen by reading the response *schema* and by probing the wire, not by its
 * name:
 *
 *  - **It requires a credential.** With no `Authorization` header it answers
 *    `401 {"code":"not_authorized","error_code":10001,…}` (observed live). It is
 *    not one of Hubstaff's public surfaces.
 *  - **It returns no credential material.** Its body is
 *    `{"organizations":[{id, name, status, created_at, updated_at,
 *    member_profile_fields, metadata, invite_url}]}` — organization identity,
 *    no token, no secret.
 *  - **It is the cheapest read every credential can reach.** It returns "the
 *    organizations the authenticated user is an active member of", so any
 *    assignee role reaches it — unlike the write endpoints (creating a team,
 *    approving a timesheet) that a `user`-role assignee would be refused, which
 *    would report a working Connection as broken.
 *
 * Every other candidate lost on one of those tests: `GET /v2/users/me` returns
 * the member's own `email` and `ip_address` and says nothing about the
 * organization, and `GET /v2/organizations/{id}` needs an id the caller does
 * not have until it has listed something.
 */
export const PROBE_PATH = "/organizations";

const organizationAccessToken: AuthDefinition = {
  key: "organization-access-token",
  type: "bearer",
  displayName: "Organization Access Token",
  description:
    "Paste an Organization access token (starts with `hsoat_`) created under Settings → " +
    "Organization → API tokens in the Hubstaff app. It cannot be retrieved again after " +
    "creation, so store a copy when you make it. It acts as the member it is assigned to, with " +
    "that member's role and access.",
  connectionLabel: "Hubstaff ({{member}})",
  fields: [
    {
      key: "organizationAccessToken",
      label: "Organization Access Token",
      type: "secret",
      required: true,
      hint:
        "Starts with `hsoat_`. Created by an owner, manager or Manage-IT member under Settings → " +
        "Organization → API tokens, and assigned to an existing member — the token acts as that " +
        "member. Choose an expiry of 30/60/90 days or Never; an expired or revoked token " +
        "answers 401 and must be replaced in the Hubstaff app (there is no API to manage them).",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns. The secret never appears in a URL.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<HubstaffCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * Is this token live?
   *
   * The verdict comes from the **body's own machine-readable fields**, never
   * from the status code — Hubstaff answers two structurally different 401s
   * (see {@link HubstaffCredential} and `lib/client.ts`) and a 403 that means
   * something else again. Both 401 shapes were reproduced live on 2026-09-22.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<HubstaffCredential>;
    const token = (cred?.organizationAccessToken ?? "").trim();
    if (!token) return { ok: false, message: "credential is missing organizationAccessToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ organizationAccessToken: token }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { code?: string; error_code?: number; error?: string; error_description?: string | null }
      | null;

    // The shape Hubstaff sends when no credential reached the request at all.
    if (body?.code === "not_authorized" || body?.error_code === 10001) {
      return {
        ok: false,
        message:
          "Hubstaff received no credential (401 not_authorized). The token did not reach the " +
          "request — reconnect this connection.",
      };
    }

    // The shape it sends for a token that is syntactically fine and not usable.
    if (body?.error === "invalid_token" || res.status === 401) {
      return {
        ok: false,
        message: "Hubstaff rejected the token (401 invalid_token): " +
          (body?.error_description ??
            "expired, revoked, malformed, or its assigned member was removed from the " +
              "organization") +
          ". Create a replacement under Settings → Organization → API tokens.",
      };
    }

    if (res.status === 403) {
      return {
        ok: false,
        message: `Hubstaff refused the organizations read (403${
          body?.code ? ` ${body.code}` : ""
        }): ${
          body?.error_description ?? body?.error ?? "authenticated but not authorized"
        }. The API is only available to organizations on an active plan.`,
      };
    }

    return {
      ok: false,
      message: `Hubstaff returned HTTP ${res.status} for ${PROBE_PATH}` +
        `${body?.error ? ` (${body.error})` : ""}`,
    };
  },

  /**
   * Publish the member the token acts as, and nothing else.
   *
   * A list of Connections that all read "Hubstaff" is unusable, and for an
   * organization access token the member is the whole story of what the
   * credential can do — "it authenticates as that member, with exactly that
   * member's current organization role and access". Reassigning the token in
   * the Hubstaff app changes this label without changing the secret.
   *
   * `GET /v2/users/me` returns `email` and `ip_address` alongside the name;
   * this hook takes the name and drops everything else on the floor.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<HubstaffCredential>;
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/users/me`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as { user?: { name?: string } } | null;
    const name = body?.user?.name;
    return typeof name === "string" && name.length > 0 ? { member: name } : {};
  },
};

export default organizationAccessToken;
