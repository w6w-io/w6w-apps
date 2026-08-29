import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient } from "../lib/client.ts";

interface Input {
  organization?: string;
  limit?: number;
  offset?: number;
}

/**
 * `GET /v1/users` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Users, 2026-08-29.
 *
 * Missive documents no endpoint for user status (availability/away/out of
 * office) — this lists identity only (`id`, `name`, `email`, `avatar_url`,
 * and `me: true` on the token owner's own entry).
 */
const action: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "List users in organizations the authenticated user is part of. Missive's API " +
    "does not expose user status (availability/away/out of office).",
  params: [
    { key: "organization", label: "Organization ID", type: "string", default: "" },
    { key: "limit", label: "Limit", type: "number", default: 50, hint: "Max: 200." },
    { key: "offset", label: "Offset", type: "number", default: 0, advanced: true },
  ],
  output: [
    { key: "users", type: "array", label: "Users" },
  ],

  async execute(input, ctx) {
    const res = await new MissiveClient(ctx).json<{ users: unknown[] }>("/users", {
      query: compact({
        organization: input.organization,
        limit: input.limit,
        offset: input.offset,
      }),
    });
    return res.users;
  },
};

export default action;
