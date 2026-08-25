import type { ActionDefinition } from "@w6w/types";
import { deskList, type DeskListEnvelope, type DeskListInput } from "../lib/desk.ts";
import { orgId, pageParams, ticketId } from "../lib/params.ts";

interface Input extends DeskListInput {
  ticketId: string;
}

/**
 * `GET /tickets/{ticket_id}/threads` — a "thread" is one message/reply in
 * the ticket's email/forum/social conversation (distinct from an internal
 * `ticket-comment`, which agents write among themselves).
 */
const ticketThreadList: ActionDefinition<Input, DeskListEnvelope<Record<string, unknown>>> = {
  key: "ticket-thread-list",
  type: "read",
  resource: "ticket-thread",
  title: "List Ticket Threads",
  description: "List the conversation threads (customer-facing messages) on a ticket.",
  params: [ticketId, orgId, ...pageParams],
  output: [{ key: "data", type: "array", label: "Threads" }],

  execute(input, ctx) {
    return deskList(ctx, `/tickets/${encodeURIComponent(input.ticketId)}/threads`, input);
  },
};

export default ticketThreadList;
