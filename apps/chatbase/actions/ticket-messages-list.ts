import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient, compact, toCommaList } from "../lib/client.ts";
import {
  agentIdParam,
  paginationParams,
  paginationQuery,
  ticketNumberParam,
} from "../lib/params.ts";

/**
 * `GET /agents/{agentId}/helpdesk/tickets/{ticketNumber}/messages` —
 * chronological by default (oldest first), unlike the conversation-messages
 * endpoint which paginates backward from the newest. System `event`
 * messages are opt-in; the default types are `reply,note`.
 */
interface Input {
  agentId: string;
  ticketNumber: number;
  cursor?: string;
  limit?: number;
  types?: string[] | string;
  order?: "asc" | "desc";
}

const ticketMessagesList: ActionDefinition<Input> = {
  key: "ticket-messages-list",
  type: "read",
  resource: "ticket",
  title: "List Ticket Messages",
  description: "List a ticket's message thread. Defaults to chronological order, oldest first.",
  params: [
    agentIdParam,
    ticketNumberParam,
    ...paginationParams(),
    {
      key: "types",
      label: "Message types",
      type: "multiselect",
      options: [
        { value: "reply", label: "Reply (customer-visible)" },
        { value: "note", label: "Internal note" },
        { value: "event", label: "System event" },
      ],
      hint: "Defaults to reply,note. System events are opt-in.",
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      default: "asc",
      options: [{ value: "asc", label: "Oldest first" }, { value: "desc", label: "Newest first" }],
      hint: "A cursor is only valid for the direction it was issued with.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Messages" },
    { key: "pagination", type: "object", label: "Cursor and hasMore for the next page" },
  ],

  execute(input, ctx) {
    const query = compact({
      ...paginationQuery(input),
      types: toCommaList(input.types),
      order: input.order,
    });
    return new ChatbaseClient(ctx).request(
      `/agents/${
        encodeURIComponent(input.agentId)
      }/helpdesk/tickets/${input.ticketNumber}/messages`,
      { query },
    );
  },
};

export default ticketMessagesList;
