import type { ActionDefinition } from "@w6w/types";
import { compact, listQuery, LivestormClient } from "../lib/client.ts";
import type { JsonApiListResponse } from "../lib/client.ts";

interface Input {
  pageNumber?: number;
  pageSize?: number;
  role?: string;
  email?: string;
}

const peopleList: ActionDefinition<Input> = {
  key: "people-list",
  type: "search",
  resource: "person",
  title: "List People",
  description: "List every person (registrant or team member) across your workspace.",
  params: [
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
    return await new LivestormClient(ctx).request<JsonApiListResponse>("/people", {
      query: {
        ...listQuery(input),
        ...compact({ "filter[role]": input.role, "filter[email]": input.email }),
      },
    });
  },
};

export default peopleList;
