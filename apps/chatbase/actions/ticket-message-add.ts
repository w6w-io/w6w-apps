import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient, compact } from "../lib/client.ts";
import { agentIdParam, ticketNumberParam } from "../lib/params.ts";

/**
 * `POST /agents/{agentId}/helpdesk/tickets/{ticketNumber}/messages` — posts a
 * customer-visible reply on behalf of a team member. Content is
 * GitHub-flavored Markdown; raw inline HTML is stripped. Delivery to the
 * customer is asynchronous — a `201` confirms the reply was recorded, not
 * delivered. Posting a reply may transition the ticket's status, matching
 * dashboard behavior. Only `type: "reply"` is supported.
 */
interface Input {
  agentId: string;
  ticketNumber: number;
  content: string;
  authorEmail: string;
}

const ticketMessageAdd: ActionDefinition<Input> = {
  key: "ticket-message-add",
  type: "perform",
  resource: "ticket",
  title: "Add Ticket Message",
  description:
    "Post a customer-visible reply on a ticket. Markdown in, sanitized HTML out. A 201 confirms " +
    "the reply was recorded, not delivered.",
  idempotent: false,
  params: [
    agentIdParam,
    ticketNumberParam,
    {
      key: "content",
      label: "Content",
      type: "text",
      required: true,
      validation: { maxLength: 10000 },
      hint: "GitHub-flavored Markdown. Raw inline HTML is stripped.",
    },
    {
      key: "authorEmail",
      label: "Author email",
      type: "string",
      required: true,
      hint: "Email of the team member the reply is attributed to.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "content", type: "string", label: "Rendered, sanitized HTML body" },
    { key: "contentText", type: "string", label: "The raw markdown body as submitted" },
  ],

  execute(input, ctx) {
    const body = compact({ type: "reply", content: input.content, authorEmail: input.authorEmail });
    return new ChatbaseClient(ctx).request(
      `/agents/${
        encodeURIComponent(input.agentId)
      }/helpdesk/tickets/${input.ticketNumber}/messages`,
      { method: "POST", body },
    );
  },
};

export default ticketMessageAdd;
