import type { ActionDefinition } from "@w6w/types";
import { compact, SellClient } from "../lib/client.ts";
import { idsParam, paginationParams, sortByParam } from "../lib/params.ts";

interface Input {
  page?: number;
  perPage?: number;
  sortBy?: string;
  ids?: string;
  ownerId?: number;
  sourceId?: number;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  status?: string;
  email?: string;
  phone?: string;
}

const leadList: ActionDefinition<Input> = {
  key: "lead-list",
  type: "read",
  resource: "lead",
  title: "List Leads",
  description: "List leads, optionally filtered.",
  params: [
    ...paginationParams(),
    sortByParam([
      "id",
      "first_name",
      "last_name",
      "organization_name",
      "email",
      "created_at",
      "updated_at",
    ]),
    idsParam,
    { key: "ownerId", label: "Owner user ID", type: "number" },
    { key: "sourceId", label: "Source ID", type: "number" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "organizationName", label: "Organization name", type: "string" },
    { key: "status", label: "Status", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
  ],
  output: [
    { key: "items", type: "array", label: "Leads" },
    { key: "count", type: "number", label: "Count on this page" },
  ],

  async execute(input, ctx) {
    const result = await new SellClient(ctx).list(
      "/leads",
      compact({
        page: input.page,
        per_page: input.perPage,
        sort_by: input.sortBy,
        ids: input.ids,
        owner_id: input.ownerId,
        source_id: input.sourceId,
        first_name: input.firstName,
        last_name: input.lastName,
        organization_name: input.organizationName,
        status: input.status,
        email: input.email,
        phone: input.phone,
      }),
    );
    return { items: result.items, count: result.count };
  },
};

export default leadList;
