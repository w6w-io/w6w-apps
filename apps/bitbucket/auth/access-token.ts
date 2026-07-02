import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Bitbucket Cloud access token (`bearer`) — the modern path. The user creates
 * a Repository/Workspace/Project access token (or a user API token) in
 * Bitbucket, pastes it here, and every request signs with
 * `Authorization: Bearer <token>`.
 *
 * Scoped tokens may not include a `username` field in `/user`; the endpoint
 * still returns `account_id` and `uuid` for a valid token, which is why our
 * test hook just checks for HTTP 200.
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Access Token",
  description:
    "Paste a Bitbucket access token (Repository, Workspace, Project, or user API token).",
  connectionLabel: "{{user.display_name}} ({{user.account_id}})",
  fields: [
    {
      key: "apiKey",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Create under Repository/Workspace/Project settings → Access tokens.",
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
    const res = await ctx.fetch(`${API_URL}/user`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { ok: false, message: `Bitbucket returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/user`);
    if (!res.ok) return {};
    const user = await res.json() as {
      account_id?: string;
      uuid?: string;
      username?: string;
      display_name?: string;
    };
    return {
      user: {
        id: user.account_id ?? user.uuid,
        account_id: user.account_id,
        username: user.username,
        display_name: user.display_name,
      },
    };
  },
};

export default accessToken;
