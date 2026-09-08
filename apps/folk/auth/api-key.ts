import type { AuthDefinition } from "@w6w/types";
import { API_URL, errorMessage, NETWORK_PLACEHOLDER } from "../lib/client.ts";

/**
 * API Key (`X-Api-Key` header) plus the network id every scoped endpoint
 * needs — see `lib/client.ts` for how both were verified against the live
 * OAS document and why the network id has nowhere documented to be looked
 * up.
 *
 * `sign` does two things: sets the header, and fills in
 * `NETWORK_PLACEHOLDER` wherever an action's path carries one. This mirrors
 * how `mailchimp/auth/api-key.ts` rewrites `request.url` for its
 * datacenter-in-hostname scheme — `sign` is the only hook holding the
 * credential, so it is the only place this substitution can happen.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "An API key and network id from your folk account. Both are required — nearly " +
    "every endpoint is scoped to a specific network.",
  apiKey: { in: "header", name: "X-Api-Key" },
  connectionLabel: "{{name}} ({{email}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
    },
    {
      key: "networkId",
      label: "Network ID",
      type: "string",
      required: true,
      hint: "folk's own name for a workspace. Every action except Get Current User is scoped " +
        "to this network.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key, networkId } = credential as { apiKey: string; networkId?: string };
    request.headers["x-api-key"] = key;
    if (networkId) {
      request.url = request.url.replace(NETWORK_PLACEHOLDER, encodeURIComponent(networkId));
    }
    return request;
  },

  /**
   * `GET /network/{networkId}/check-access` — the one operation built to
   * answer "can this key see this network?" in a single call, so it proves
   * both credential fields at once (the same reason
   * `checkly/auth/api-key.ts` probes `/v1/accounts/me` rather than a
   * key-only endpoint). Never echoes the key back.
   */
  async test({ credential }, ctx) {
    const { apiKey: key, networkId } = credential as { apiKey?: string; networkId?: string };
    if (!key) return { ok: false, message: "credential missing apiKey" };
    if (!networkId) return { ok: false, message: "credential missing networkId" };

    const res = await ctx.fetch(
      `${API_URL}/network/${encodeURIComponent(networkId)}/check-access`,
      { headers: { "x-api-key": key, accept: "application/json" } },
    );
    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      return {
        ok: false,
        message: `folk rejected the API key (401${
          errorMessage(text) ? `: ${errorMessage(text)}` : ""
        }).`,
      };
    }
    if (res.status === 403 || res.status === 404) {
      return {
        ok: false,
        message: `the key is valid but cannot reach network "${networkId}" (${res.status}) — ` +
          "check the network id",
      };
    }
    if (!res.ok) return { ok: false, message: `folk returned ${res.status}` };

    const body = text ? JSON.parse(text) as { ok?: boolean } : {};
    if (body.ok === false) {
      return { ok: false, message: `folk reported check-access: false for network "${networkId}"` };
    }
    return { ok: true };
  },

  /** Records the key owner's name/email from `GET /user`. Never the key or the network id. */
  async afterConnect({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey?: string };
    if (!key) return {};
    try {
      const res = await ctx.fetch(`${API_URL}/user`, {
        headers: { "x-api-key": key, accept: "application/json" },
      });
      if (!res.ok) return {};
      const body = await res.json().catch(() => null) as { name?: string; email?: string } | null;
      if (!body) return {};
      return { name: body.name, email: body.email };
    } catch {
      return {};
    }
  },
  // No `revoke`: the OAS exposes no endpoint to invalidate a key from the
  // outside — rotation happens in the folk app itself.
};

export default apiKey;
