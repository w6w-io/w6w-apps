import type { AuthDefinition } from "@w6w/types";
import { API_PATH, jiraDcErrorMessage, normalizeBaseUrl } from "../lib/client.ts";

/**
 * Personal Access Token (PAT) — Atlassian's recommended authentication method
 * for Jira Data Center / Server, alongside OAuth 2.0 (which needs a
 * per-instance application-link registration this app does not implement; see
 * the README).
 *
 * Verified against `confluence.atlassian.com/enterprise/using-personal-access-tokens…`
 * (fetched 2026-09-05): "To use a personal access token for authentication,
 * you have to pass it as a bearer token in the Authorization header" —
 * `Authorization: Bearer <token>`. A PAT already "incorporates the user
 * account", so unlike the Basic method there is no separate username field.
 *
 * PATs are minted from the instance's own UI (Profile → Personal Access
 * Tokens) — there is no REST endpoint this app can drive without already
 * holding a credential, so `exchange` is not implemented; the user pastes a
 * token they created themselves.
 */
const personalAccessToken: AuthDefinition = {
  key: "personal-access-token",
  type: "bearer",
  displayName: "Personal Access Token",
  description: "Recommended. Create a token from your Jira profile (avatar → Personal Access " +
    "Tokens), then pair it with your instance's URL.",
  connectionLabel: "{{user.displayName}} ({{baseUrl}})",
  fields: [
    {
      key: "baseUrl",
      label: "Jira instance URL",
      type: "string",
      required: true,
      placeholder: "https://jira.acme.internal",
      hint: "Your organisation's own Jira Data Center or Server address. A URL without a scheme " +
        "is assumed to be https.",
    },
    {
      key: "token",
      label: "Personal Access Token",
      type: "secret",
      required: true,
      hint: "Profile picture → Personal Access Tokens → Create token, in your Jira instance.",
    },
  ],

  /** The only hook handed the raw credential; network-less. */
  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  /**
   * `GET /rest/api/2/myself` — every authenticated user can read their own
   * profile, and its body (`name`, `key`, `displayName`, `emailAddress`)
   * carries no credential material.
   */
  async test({ credential }, ctx) {
    const { baseUrl, token } = credential as { baseUrl?: string; token?: string };
    if (!baseUrl || !token) return { ok: false, message: "credential missing baseUrl or token" };

    let base: string;
    try {
      base = normalizeBaseUrl(baseUrl);
    } catch (err) {
      return { ok: false, message: String((err as Error).message) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}${API_PATH}/myself`, {
        headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `Jira instance unreachable: ${String(err)}` };
    }

    if (res.status === 401) {
      return { ok: false, message: "Jira rejected the token (401) — it may be expired or revoked" };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, message: jiraDcErrorMessage(res.status, res.statusText, text) };
    }
    const body = await res.json().catch(() => null) as { name?: string } | null;
    if (!body?.name) {
      return { ok: false, message: "/myself answered without a `name` field — unexpected shape" };
    }
    return { ok: true };
  },

  /** Records the instance URL and the token owner. Never the token itself. */
  async afterConnect({ credential }, ctx) {
    const { baseUrl, token } = credential as { baseUrl?: string; token?: string };
    if (!baseUrl) return {};
    const normalized = normalizeBaseUrl(baseUrl);
    if (!token) return { baseUrl: normalized };
    const res = await ctx.fetch(`${normalized}${API_PATH}/myself`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    });
    if (!res.ok) return { baseUrl: normalized };
    const me = await res.json().catch(() => ({})) as {
      name?: string;
      key?: string;
      displayName?: string;
      emailAddress?: string;
    };
    return {
      baseUrl: normalized,
      user: { name: me.name, key: me.key, displayName: me.displayName, email: me.emailAddress },
    };
  },
};

export default personalAccessToken;
