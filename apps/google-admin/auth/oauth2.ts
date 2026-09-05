import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 — the "public integrator" path. The connecting Google account
 * MUST be a Google Workspace **super admin** (or hold a delegated admin role
 * with the matching Directory API privileges) — the Admin SDK Directory API
 * rejects a non-admin token outright, regardless of the scopes granted.
 *
 * Scopes are the read/write forms (not `.readonly`) because this app can
 * insert/update/delete users, groups, group members and org units.
 */
const SCOPES = [
  "https://www.googleapis.com/auth/admin.directory.user",
  "https://www.googleapis.com/auth/admin.directory.group",
  "https://www.googleapis.com/auth/admin.directory.group.member",
  "https://www.googleapis.com/auth/admin.directory.orgunit",
  "https://www.googleapis.com/auth/admin.directory.customer.readonly",
];

const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Google)",
  description:
    "Public OAuth flow. The connecting Google account must be a Workspace super admin (or hold a delegated admin role covering Users, Groups and Org Units) — the Directory API refuses a non-admin token regardless of scope.",
  connectionLabel: "{{customer.customerDomain}}",
  oauth2: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    refreshUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: SCOPES,
    // Google needs these on the authorize URL to hand back a refresh_token.
    extraAuthParams: {
      access_type: "offline",
      prompt: "consent",
    },
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    // Least-scope whoami: lists at most one user for the caller's own
    // customer. Needs only the `admin.directory.user[.readonly]` scope we
    // already request, and a non-admin token is refused with a structured
    // 403 rather than a silent empty page.
    const res = await ctx.fetch(`${API_URL}/users?customer=my_customer&maxResults=1`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Google Admin returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/customers/my_customer`);
    if (!res.ok) return {};
    const customer = await res.json().catch(() => null) as
      | { id?: string; customerDomain?: string }
      | null;
    if (!customer) return {};
    return { customer: { id: customer.id, customerDomain: customer.customerDomain } };
  },
};

export default oauth2;
