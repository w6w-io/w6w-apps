import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Personal Access Token (`bearer`) — the "internal / individual user" path.
 * You paste a personal access token minted at
 * https://app.asana.com/0/my-apps and every request signs with it. No app
 * registration on Asana's side needed.
 *
 * For the "public integrator" path (browser OAuth flow, one Asana app,
 * many end users) see `./oauth2.ts`.
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Personal Access Token",
  description:
    "Paste a personal access token minted at Asana Profile Settings → Apps → Developer apps → Personal access tokens.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  fields: [
    {
      key: "apiKey",
      label: "Personal Access Token",
      type: "secret",
      required: true,
      hint: "Asana Profile Settings → Apps → Developer apps → Personal access tokens.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { ok: false, message: `Asana returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/me`);
    if (!res.ok) return {};
    const body = await res.json() as {
      data?: { gid?: string; name?: string; email?: string };
    };
    const user = body.data ?? {};
    return {
      user: {
        id: user.gid,
        name: user.name,
        email: user.email,
      },
    };
  },
};

export default accessToken;
