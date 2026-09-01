import type { ActionDefinition } from "@w6w/types";
import { FreshsalesClient } from "../lib/client.ts";
import { pagination, viewIdParam } from "../lib/params.ts";

interface Input {
  viewId: number;
  sort?: string;
  sortType?: string;
  page?: number;
  perPage?: number;
}

/**
 * Freshsales has no flat "list all contacts" endpoint — listing always goes
 * through a saved view (`/api/contacts/view/[view_id]`). See "List Views" to
 * find a view id.
 */
const contactGetMany: ActionDefinition<Input> = {
  key: "contact-get-many",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description:
    'List contacts from a saved view. Freshsales has no flat "list all" endpoint — every ' +
    'listing goes through a view; use "List Views" to find one.',
  params: [
    viewIdParam("contacts"),
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      row: "sort",
      advanced: true,
      options: [
        { value: "lead_score", label: "Lead score" },
        { value: "created_at", label: "Created" },
        { value: "updated_at", label: "Updated" },
        { value: "open_deals_amount", label: "Open deals amount" },
        { value: "last_contacted", label: "Last contacted" },
      ],
    },
    {
      key: "sortType",
      label: "Order",
      type: "select",
      default: "desc",
      row: "sort",
      advanced: true,
      options: [
        { value: "desc", label: "Descending" },
        { value: "asc", label: "Ascending" },
      ],
    },
    ...pagination,
  ],
  output: [
    { key: "contacts", type: "array", label: "Contacts" },
    { key: "total", type: "number", label: "Total (this view)" },
  ],

  async execute(input, ctx) {
    const { items, total } = await new FreshsalesClient(ctx).list(
      "contacts",
      `/contacts/view/${input.viewId}`,
      {
        query: {
          sort: input.sort,
          sort_type: input.sort ? (input.sortType ?? "desc") : undefined,
          page: input.page,
          per_page: input.perPage,
        },
      },
    );
    return { contacts: items, total };
  },
};

export default contactGetMany;
