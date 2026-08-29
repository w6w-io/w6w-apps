import type { AuthDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

/**
 * API Key (`apiKey`, header `Authorization: Bearer {{API_KEY}}`).
 *
 * Verified against developer.kustomer.com/kustomer-api-docs/reference/authentication:
 * "All requests to the Kustomer API are authenticated using an API token
 * included with your request's Authorization header ... They should follow
 * the format of `Bearer {{API_KEY}}`." Admins mint the token in
 * Settings > Security > API Keys and scope it to an API role.
 *
 * The org subdomain is collected here rather than per-action: it identifies
 * the account/pod, so it belongs to the Connection. `afterConnect` echoes it
 * onto the connection's display data, which is where `lib/client.ts` reads
 * it from — mirroring `apps/freshdesk/auth/api-key.ts`.
 *
 * `test` probes `GET /v1/users/current` ("Get Current User") — the same
 * scope-free whoami used for a machine (API-key) user, requiring no role
 * beyond having a live token. Its response body carries only display
 * metadata (name, email, role list) and password *metadata* (booleans and a
 * timestamp, never a password) — never the credential itself.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Create a key under Settings > Security > API Keys in Kustomer, and find your org subdomain in the base URL your Kustomer workspace loads from.",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  connectionLabel: "{{agent.name}} ({{orgSubdomain}})",
  fields: [
    {
      key: "orgSubdomain",
      label: "Org subdomain",
      type: "string",
      required: true,
      placeholder: "acme",
      hint: "Just the org name from `acme.api.kustomerapp.com` — not the full URL.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Settings > Security > API Keys in Kustomer.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { orgSubdomain, apiKey } = credential as { orgSubdomain?: string; apiKey?: string };
    if (!orgSubdomain || !apiKey) {
      return { ok: false, message: "credential missing orgSubdomain or apiKey" };
    }
    const res = await ctx.fetch(`${baseUrl(orgSubdomain)}/users/current`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { ok: false, message: `Kustomer returned ${res.status}` };
    return { ok: true };
  },

  /** Records the org subdomain on the connection so the client can build URLs without the credential. */
  async afterConnect({ credential }, ctx) {
    const { orgSubdomain, apiKey } = credential as { orgSubdomain?: string; apiKey?: string };
    if (!orgSubdomain) return {};
    const res = await ctx.fetch(`${baseUrl(orgSubdomain)}/users/current`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { orgSubdomain };
    const body = await res.json().catch(() => ({})) as { data?: { attributes?: unknown } };
    return { orgSubdomain, agent: body.data?.attributes };
  },
};

export default apiKey;
