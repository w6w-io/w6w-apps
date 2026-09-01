import type { ActionDefinition } from "@w6w/types";
import { compact, SellClient } from "../lib/client.ts";
import { idsParam, paginationParams, sortByParam } from "../lib/params.ts";

interface Input {
  page?: number;
  perPage?: number;
  sortBy?: string;
  ids?: string;
  isOrganization?: boolean;
  ownerId?: number;
  organizationId?: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  customerStatus?: string;
  prospectStatus?: string;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts, optionally filtered.",
  params: [
    ...paginationParams(),
    sortByParam(["id", "name", "first_name", "last_name", "email", "updated_at", "created_at"]),
    idsParam,
    { key: "isOrganization", label: "Organizations only", type: "boolean" },
    { key: "ownerId", label: "Owner user ID", type: "number" },
    { key: "organizationId", label: "Belongs to organization (contact ID)", type: "number" },
    { key: "name", label: "Name", type: "string" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    {
      key: "customerStatus",
      label: "Customer status",
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "current", label: "Current customer" },
        { value: "past", label: "Past customer" },
      ],
    },
    {
      key: "prospectStatus",
      label: "Prospect status",
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "current", label: "Current prospect" },
        { value: "lost", label: "Lost prospect" },
      ],
    },
  ],
  output: [
    { key: "items", type: "array", label: "Contacts" },
    { key: "count", type: "number", label: "Count on this page" },
  ],

  async execute(input, ctx) {
    const result = await new SellClient(ctx).list(
      "/contacts",
      compact({
        page: input.page,
        per_page: input.perPage,
        sort_by: input.sortBy,
        ids: input.ids,
        is_organization: input.isOrganization,
        owner_id: input.ownerId,
        contact_id: input.organizationId,
        name: input.name,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone: input.phone,
        customer_status: input.customerStatus,
        prospect_status: input.prospectStatus,
      }),
    );
    return { items: result.items, count: result.count };
  },
};

export default contactList;
