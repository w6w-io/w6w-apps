import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  ticketId?: number;
  orderBy?: string;
  cursor?: string;
  limit?: number;
}

/**
 * `GET /messages` — verified against developers.gorgias.com/reference/list-messages.
 * Replaces the deprecated `GET /tickets/{ticket_id}/messages`
 * (developers.gorgias.com/reference/list-ticket-messages marks itself
 * deprecated in favor of this endpoint), which this app therefore does not
 * expose separately.
 */
const messageGetMany: ActionDefinition<Input> = {
  key: "message-get-many",
  type: "search",
  resource: "message",
  title: "List Messages",
  description: "List messages, optionally scoped to one ticket.",
  params: [
    { key: "ticketId", label: "Ticket ID", type: "number" },
    {
      key: "orderBy",
      label: "Sort by",
      type: "select",
      default: "created_datetime:desc",
      options: [
        { value: "created_datetime:asc", label: "Created (oldest first)" },
        { value: "created_datetime:desc", label: "Created (newest first)" },
      ],
    },
    ...pagination,
  ],
  output: [{ key: "data", type: "array", label: "Messages" }],

  execute(input, ctx) {
    return new GorgiasClient(ctx).request("/messages", {
      query: {
        ticket_id: input.ticketId,
        order_by: input.orderBy,
        cursor: input.cursor,
        limit: input.limit,
      },
    });
  },
};

export default messageGetMany;
