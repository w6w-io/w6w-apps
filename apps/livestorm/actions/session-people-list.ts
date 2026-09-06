import type { ActionDefinition } from "@w6w/types";
import { compact, listQuery, LivestormClient } from "../lib/client.ts";
import type { JsonApiListResponse } from "../lib/client.ts";

/**
 * `GET /sessions/{period_id}/people` — list the people attached to a session.
 *
 * The vendor's own OpenAPI document names this path parameter `period_id` here (Livestorm
 * calls a session a "period" internally), while the sibling write endpoints on the same
 * resource (`POST`/`DELETE .../people`) name theirs `id`. Both address the same session; this
 * app's `id` param sends it either way.
 */
interface Input {
  id: string;
  pageNumber?: number;
  pageSize?: number;
  role?: string;
  attended?: boolean;
  email?: string;
  createdSince?: string;
  createdUntil?: string;
  updatedSince?: string;
  updatedUntil?: string;
  include?: string;
}

const sessionPeopleList: ActionDefinition<Input> = {
  key: "session-people-list",
  type: "search",
  resource: "session",
  title: "List Session People",
  description: "List the people (registrants and team members) attached to a session.",
  params: [
    { key: "id", label: "Session ID", type: "string", required: true },
    { key: "pageNumber", label: "Page number", type: "number", hint: "0-indexed." },
    { key: "pageSize", label: "Page size", type: "number" },
    {
      key: "role",
      label: "Filter: role",
      type: "select",
      options: [
        { label: "Participant", value: "participant" },
        { label: "Team member", value: "team_member" },
      ],
    },
    { key: "attended", label: "Filter: attended", type: "boolean" },
    { key: "email", label: "Filter: email (exact match)", type: "string" },
    { key: "createdSince", label: "Filter: created since", type: "string" },
    { key: "createdUntil", label: "Filter: created until", type: "string" },
    { key: "updatedSince", label: "Filter: updated since", type: "string" },
    { key: "updatedUntil", label: "Filter: updated until", type: "string" },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      options: [{ label: "People", value: "people" }],
    },
  ],
  output: [
    { key: "data", type: "array", label: "People" },
    { key: "meta", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    return await new LivestormClient(ctx).request<JsonApiListResponse>(
      `/sessions/${encodeURIComponent(input.id)}/people`,
      {
        query: {
          ...listQuery(input),
          ...compact({
            "filter[role]": input.role,
            "filter[attended]": input.attended,
            "filter[email]": input.email,
            "filter[created_since]": input.createdSince,
            "filter[created_until]": input.createdUntil,
            "filter[updated_since]": input.updatedSince,
            "filter[updated_until]": input.updatedUntil,
          }),
        },
      },
    );
  },
};

export default sessionPeopleList;
