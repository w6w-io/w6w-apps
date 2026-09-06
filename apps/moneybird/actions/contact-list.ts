import type { ActionDefinition } from "@w6w/types";
import { MoneybirdClient, resolveAdministrationId } from "../lib/client.ts";
import { administrationIdParam, paginationParams } from "../lib/params.ts";

interface Input {
  administrationId?: string;
  query?: string;
  includeArchived?: boolean;
  page?: number;
  perPage?: number;
}

/**
 * `GET /:administration_id/contacts.json` — a paginated, bare-array list.
 *
 * `query` searches across every documented contact field at once (company
 * name, address, email, phone, customer id, tax number, chamber of commerce
 * number, bank account, …) — there is no per-field search parameter.
 */
const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts in an administration, with optional free-text search.",
  params: [
    administrationIdParam,
    {
      key: "query",
      label: "Search",
      type: "string",
      hint: "Matches against company name, address, email, phone, customer ID, tax number, " +
        "chamber of commerce number and bank account.",
    },
    { key: "includeArchived", label: "Include archived", type: "boolean" },
    ...paginationParams(),
  ],
  output: [{ key: "items", type: "array", label: "Contacts" }],

  async execute(input, ctx) {
    const administrationId = resolveAdministrationId(ctx, input.administrationId);
    const items = await new MoneybirdClient(ctx, administrationId).request<unknown[]>(
      "/contacts",
      {
        query: {
          query: input.query,
          include_archived: input.includeArchived,
          page: input.page,
          per_page: input.perPage,
        },
      },
    );
    return { items: items ?? [] };
  },
};

export default contactList;
