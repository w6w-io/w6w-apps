import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "../lib/client.ts";

interface Input {
  page?: number;
}

const listOrganizations: ActionDefinition<Input> = {
  key: "list-organizations",
  type: "read",
  resource: "organization",
  title: "List Organizations",
  description: "List the organizations the connected user belongs to.",
  params: [
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "organizations", type: "array", label: "Organizations" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request<EventbriteListResponse<"organizations">>(
      `/users/me/organizations/`,
      { query: { page: input.page } },
    );
  },
};

export default listOrganizations;
