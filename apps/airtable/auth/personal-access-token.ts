import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Personal Access Token (`bearer`) — the **recommended** path.
 *
 * Airtable retired API keys in Feb 2024 in favour of PATs (and OAuth). PATs are
 * minted at https://airtable.com/create/tokens with a scope + base allowlist,
 * and signed as `Authorization: Bearer <token>` on every request.
 *
 * For the "public integrator" path (browser OAuth flow, one Airtable app,
 * many end users) see `./oauth2.ts`. For legacy API keys see `./api-key.ts`.
 */
const personalAccessToken: AuthDefinition = {
  key: "personal-access-token",
  type: "bearer",
  displayName: "Personal Access Token",
  description:
    "Recommended. Mint a PAT at airtable.com/create/tokens with the scopes and bases you want to expose.",
  connectionLabel: "{{user.email}}",
  fields: [
    {
      key: "apiKey",
      label: "Personal Access Token",
      type: "secret",
      required: true,
      hint: "Create at https://airtable.com/create/tokens.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    const res = await ctx.fetch(`${API_URL}/meta/whoami`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { ok: false, message: `Airtable returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/meta/whoami`);
    if (!res.ok) return {};
    const user = await res.json() as { id?: string; email?: string; scopes?: string[] };
    return {
      user: {
        id: user.id,
        email: user.email,
      },
    };
  },
};

export default personalAccessToken;
