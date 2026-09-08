import type { AuthDefinition } from "@w6w/types";
import { API_URL, errorMessage } from "../lib/client.ts";

/**
 * Personal Access Token (`bearer`).
 *
 * Capsule's own "Getting a Bearer Token" section (`overview/authentication`)
 * offers two paths: the full OAuth2 authorization-code flow (for sharing an
 * application with other Capsule users), or generating a token directly from
 * *My Preferences → API Authentication Tokens* "for a one-off integration for
 * internal use, or ... a quick start". This app implements only the latter —
 * OAuth2 needs a registered `client_id`/`client_secret` per publisher, which
 * this app does not have; a personal token is what Capsule's own docs point
 * a one-off/internal integration at, and every request just carries it as
 * `Authorization: Bearer {token}` regardless of which path minted it.
 *
 * The rate limit (4,000 requests/hour, `health/quota.ts`) is scoped to the
 * Capsule USER the token belongs to, not to this app — a second integration
 * using a token for the same user shares the same budget.
 */
const personalAccessToken: AuthDefinition = {
  key: "personal-access-token",
  type: "bearer",
  displayName: "Personal Access Token",
  description:
    "Generate a token under My Preferences → API Authentication Tokens in your Capsule " +
    "account (Settings → My Preferences).",
  connectionLabel: "{{name}} ({{username}})",
  fields: [
    {
      key: "token",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "My Preferences → API Authentication Tokens.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  /**
   * `GET /users/current` — shows the token's own owning user. Never echoes
   * the token itself back (unlike a vendor's `/apikey` or `/me`-as-key-dump
   * endpoint), so this is safe to use as the auth-liveness probe.
   */
  async test({ credential }, ctx) {
    const { token } = credential as { token?: string };
    if (!token) return { ok: false, message: "credential missing token" };

    const res = await ctx.fetch(`${API_URL}/users/current`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
    });
    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      return {
        ok: false,
        message: `Capsule rejected the token (401${
          errorMessage(text) ? `: ${errorMessage(text)}` : ""
        }). Check My Preferences → API Authentication Tokens, or that it wasn't revoked.`,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: `Capsule returned ${res.status}${
          errorMessage(text) ? `: ${errorMessage(text)}` : ""
        }.`,
      };
    }
    return { ok: true };
  },

  /** Records the token's owning user. Never the token itself. */
  async afterConnect({ credential }, ctx) {
    const { token } = credential as { token?: string };
    if (!token) return {};
    try {
      const res = await ctx.fetch(`${API_URL}/users/current`, {
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
      });
      if (!res.ok) return {};
      const body = await res.json().catch(() => null) as {
        user?: { name?: string; username?: string };
      } | null;
      if (!body?.user) return {};
      return { name: body.user.name, username: body.user.username };
    } catch {
      return {};
    }
  },
  // No `revoke`: the v2 API exposes no endpoint to invalidate a token from
  // the outside — revocation is a step the user takes in My Preferences,
  // same as rotating an Insightly or Copper credential.
};

export default personalAccessToken;
