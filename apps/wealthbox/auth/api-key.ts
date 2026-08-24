import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Wealthbox personal API access token, sent as a custom header — NOT
 * `Authorization`, and with no `Bearer`/`Token` prefix.
 *
 * ## The wire format, verified against dev.wealthbox.com's own docs
 *
 * The "Authentication" section states: "That token should then be passed as
 * an HTTP Header, with the name `ACCESS_TOKEN`, in all requests to the API",
 * and demonstrates it with:
 *
 *   curl https://api.crmworkspace.com/v1/contacts -i \
 *     -H "ACCESS_TOKEN:12345678901234567890123456789012"
 *
 * The header VALUE is the token verbatim — there is no prefix to add or strip.
 * `apiKey: { in: "header", name: "ACCESS_TOKEN" }` describes exactly that wire
 * shape, so `type: "apiKey"` (rather than a bespoke `sign`-only `custom` auth,
 * as Close needed for its base64 Basic scheme) is the accurate declaration.
 *
 * ## OAuth 2.0 exists but needs manual vendor onboarding
 *
 * Wealthbox also documents an authorization-code + refresh-token OAuth 2.0
 * flow (`https://app.crmworkspace.com/oauth/authorize` /
 * `https://app.crmworkspace.com/oauth/token`, RFC 6749). But obtaining a
 * client id/secret is NOT self-serve: the docs say "please email
 * support@wealthbox.com with your request and details about your
 * application" to register one. There is no public client-registration
 * endpoint or stable client id this app could ship generically, so a static
 * OAuth2 `AuthDefinition` here would either be non-functional or would bake
 * in one integrator's private client id. The personal API access token needs
 * no such registration — dev.wealthbox.com itself recommends it for
 * "building personal integrations... and testing integration capabilities" —
 * so it is what this app ships. Add OAuth as a second `AuthDefinition` if/when
 * this app is registered as a listed Wealthbox integration partner.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Access Token",
  description:
    "Paste a personal API access token from Wealthbox → your name (top right) → Settings → " +
    "API Access Tokens → Create Access Token. Sent as the `ACCESS_TOKEN` header, with no prefix.",
  connectionLabel: "{{user.name}} — {{organization.name}}",
  apiKey: { in: "header", name: "ACCESS_TOKEN" },
  fields: [
    {
      key: "accessToken",
      label: "API Access Token",
      type: "secret",
      required: true,
      hint: "Wealthbox → Settings → API Access Tokens → Create Access Token.",
    },
  ],

  /**
   * The ONLY hook handed the raw credential, and it runs network-less: it
   * stamps the header onto the outbound request and returns it.
   */
  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["access_token"] = accessToken;
    return request;
  },

  /**
   * `GET /v1/me` — Wealthbox's "Retrieve login profile information" endpoint.
   *
   * It is the right liveness probe because every valid token can read its own
   * login profile — no resource permission beyond existing is required, so a
   * scoped-down user cannot make a genuinely working token look broken. Its
   * response body is profile metadata (name, email, plan, linked accounts)
   * only; it never echoes the token, so this probe cannot leak the credential
   * back to a caller.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_BASE}/me`, {
      headers: { accept: "application/json", access_token: accessToken },
    });
    if (res.status === 401) {
      return { ok: false, message: "Wealthbox rejected the API access token (401)" };
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let message: string | undefined;
      try {
        const parsed = JSON.parse(body) as { errors?: unknown };
        message = typeof parsed.errors === "string" ? parsed.errors : undefined;
      } catch {
        // Non-JSON body; the status alone is the more honest message.
      }
      return { ok: false, message: message ?? `Wealthbox returned HTTP ${res.status}` };
    }
    return { ok: true };
  },

  /**
   * Labels the Connection with who and where, from the same `/me` payload.
   * `current_user.account` names which of the (possibly several) `accounts`
   * this token's calls run against; nothing here can carry credential
   * material — only the profile's own name, email and account name are
   * copied out.
   */
  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken: string };
    const res = await ctx.fetch(`${API_BASE}/me`, {
      headers: { accept: "application/json", access_token: accessToken },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as {
      name?: string;
      email?: string;
      current_user?: { account?: number };
      accounts?: Array<{ id?: number; name?: string }>;
    } | null;
    if (!body) return {};

    const accountId = body.current_user?.account;
    const account = body.accounts?.find((a) => a.id === accountId) ?? body.accounts?.[0];
    return {
      user: { name: body.name, email: body.email },
      organization: {
        id: account?.id !== undefined ? String(account.id) : undefined,
        name: account?.name,
      },
    };
  },
};

export default apiKey;
