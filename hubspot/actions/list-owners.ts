import type { ActionDefinition } from "@w6w/types";
import { HubSpotClient, type HubSpotListResponse } from "../lib/client.ts";

interface Input {
  email?: string;
  limit?: number;
  after?: string;
  archived?: boolean;
}

interface Owner {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
  archived?: boolean;
}

const listOwners: ActionDefinition<Input> = {
  key: "list-owners",
  type: "read",
  resource: "owner",
  title: "List Owners",
  description: "List CRM owners (portal users assignable as owner of a contact/company/deal/ticket).",
  params: [
    { key: "email", label: "Email filter", type: "string" },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "after", label: "After (cursor)", type: "string" },
    { key: "archived", label: "Include archived", type: "boolean", default: false },
  ],

  async execute(input, ctx) {
    const client = new HubSpotClient(ctx);
    return client.request<HubSpotListResponse<Owner>>(`/crm/v3/owners`, {
      query: {
        email: input.email,
        limit: input.limit ?? 100,
        after: input.after,
        archived: input.archived,
      },
    });
  },
};

export default listOwners;
