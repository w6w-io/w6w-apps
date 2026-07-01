import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Access Token (`bearer`) — the "personal / single-workspace" path. Paste
 * a bot (xoxb-…) or user (xoxp-…) token minted in your Slack app's OAuth &
 * Permissions page. Every request signs with it.
 *
 * The signing secret n8n exposes here is only useful for the Slack Events API
 * (webhooks/triggers), which the w6w port does not implement — so it's omitted.
 * For the "public integrator" path see `./oauth2.ts`.
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Access Token",
  description:
    "Paste a bot (xoxb-…) or user (xoxp-…) token from your Slack app's OAuth & Permissions page.",
  connectionLabel: "{{team.name}} ({{user.name}})",
  fields: [
    {
      key: "apiKey",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Slack app → OAuth & Permissions → Bot User OAuth Token (xoxb-…) or User OAuth Token (xoxp-…).",
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
    const res = await ctx.fetch(`${API_URL}/auth.test`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { ok: false, message: `Slack returned ${res.status}` };
    const data = await res.json() as { ok?: boolean; error?: string };
    if (!data.ok) return { ok: false, message: data.error ?? "auth.test failed" };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/auth.test`, { method: "POST" });
    if (!res.ok) return {};
    const data = await res.json() as {
      ok?: boolean;
      user?: string;
      user_id?: string;
      team?: string;
      team_id?: string;
    };
    if (!data.ok) return {};
    return {
      user: { id: data.user_id, name: data.user },
      team: { id: data.team_id, name: data.team },
    };
  },
};

export default accessToken;
