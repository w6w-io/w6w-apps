import type { ActionDefinition } from "@w6w/types";
import { compact, listQuery, LivestormClient } from "../lib/client.ts";
import type { JsonApiListResponse } from "../lib/client.ts";

interface Input {
  id: string;
  pageNumber?: number;
  pageSize?: number;
  role?: string;
  email?: string;
}

const eventPeopleList: ActionDefinition<Input> = {
  key: "event-people-list",
  type: "search",
  resource: "event",
  title: "List Event People",
  description: "List the people (registrants and team members) attached to an event.",
  params: [
    { key: "id", label: "Event ID", type: "string", required: true },
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
    { key: "email", label: "Filter: email (exact match)", type: "string" },
  ],
  output: [
    { key: "data", type: "array", label: "People" },
    { key: "meta", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    return await new LivestormClient(ctx).request<JsonApiListResponse>(
      `/events/${encodeURIComponent(input.id)}/people`,
      {
        query: {
          ...listQuery(input),
          ...compact({ "filter[role]": input.role, "filter[email]": input.email }),
        },
      },
    );
  },
};

export default eventPeopleList;
