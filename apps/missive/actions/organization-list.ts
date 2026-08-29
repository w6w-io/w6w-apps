import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
}

/**
 * `GET /v1/organizations` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Organizations,
 * 2026-08-29.
 */
const action: ActionDefinition<Input> = {
  key: "organization-list",
  type: "read",
  resource: "organization",
  title: "List Organizations",
  description: "List organizations the authenticated user is part of.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 50, hint: "Max: 200." },
    { key: "offset", label: "Offset", type: "number", default: 0, advanced: true },
  ],
  output: [
    { key: "organizations", type: "array", label: "Organizations" },
  ],

  async execute(input, ctx) {
    const res = await new MissiveClient(ctx).json<{ organizations: unknown[] }>("/organizations", {
      query: compact({ limit: input.limit, offset: input.offset }),
    });
    return res.organizations;
  },
};

export default action;
