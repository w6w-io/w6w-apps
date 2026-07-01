import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "../lib/client.ts";

interface Input {
  organizationId: string;
  page?: number;
}

const listOrganizers: ActionDefinition<Input> = {
  key: "list-organizers",
  type: "read",
  resource: "organizer",
  title: "List Organizers",
  description: "List organizers belonging to an organization. Organizers are the public-facing event hosts (logo, bio, social links) — distinct from Organizations.",
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "organizers", type: "array", label: "Organizers" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request<EventbriteListResponse<"organizers">>(
      `/organizations/${input.organizationId}/organizers/`,
      { query: { page: input.page } },
    );
  },
};

export default listOrganizers;
