import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Personal OAuth Token (`bearer`) — the "internal / individual user" path.
 * You paste a private token minted in your own Eventbrite account and every
 * request signs with it. No app registration on Eventbrite's side needed.
 *
 * For the "public integrator" path (browser OAuth flow, one Eventbrite app,
 * many end users) see `./oauth2.ts`.
 */
const personalToken: AuthDefinition = {
  key: "personal-token",
  type: "bearer",
  displayName: "Personal Token",
  description:
    "Paste a private OAuth token minted at Account Settings → Developer Links → API keys.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  fields: [
    {
      key: "token",
      label: "Private Token",
      type: "secret",
      required: true,
      hint: "Account Settings → Developer Links → API keys → Private Token.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { token } = credential as { token: string };
    const res = await ctx.fetch(`${API_URL}/users/me/`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { ok: false, message: `Eventbrite returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/me/`);
    if (!res.ok) return {};
    const user = await res.json() as {
      id?: string;
      name?: string;
      emails?: Array<{ email: string }>;
    };
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.emails?.[0]?.email,
      },
    };
  },
};

export default personalToken;
