import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  customerId?: number;
  viewId?: number;
  externalId?: string;
  trashed?: boolean;
  orderBy?: string;
  cursor?: string;
  limit?: number;
}

/**
 * `GET /tickets` — verified against developers.gorgias.com/reference/list-tickets.
 * Cursor-based pagination per developers.gorgias.com/reference/pagination.
 */
const ticketGetMany: ActionDefinition<Input> = {
  key: "ticket-get-many",
  type: "search",
  resource: "ticket",
  title: "List Tickets",
  description: "List tickets, newest first by default. Use the filters to narrow the set.",
  params: [
    { key: "customerId", label: "Customer ID", type: "number", row: "filter" },
    { key: "viewId", label: "View ID", type: "number", row: "filter" },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      hint: "ID of the ticket in a foreign system.",
    },
    {
      key: "trashed",
      label: "Include trashed",
      type: "boolean",
      default: true,
      advanced: true,
    },
    {
      key: "orderBy",
      label: "Sort by",
      type: "select",
      default: "created_datetime:desc",
      options: [
        { value: "created_datetime:asc", label: "Created (oldest first)" },
        { value: "created_datetime:desc", label: "Created (newest first)" },
        { value: "updated_datetime:asc", label: "Updated (oldest first)" },
        { value: "updated_datetime:desc", label: "Updated (newest first)" },
      ],
    },
    ...pagination,
  ],
  output: [{ key: "data", type: "array", label: "Tickets" }],

  execute(input, ctx) {
    return new GorgiasClient(ctx).request("/tickets", {
      query: {
        customer_id: input.customerId,
        view_id: input.viewId,
        external_id: unset(input.externalId),
        trashed: input.trashed,
        order_by: unset(input.orderBy),
        cursor: unset(input.cursor),
        limit: input.limit,
      },
    });
  },
};

export default ticketGetMany;
