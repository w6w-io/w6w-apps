import type { ActionDefinition } from "@w6w/types";
import { orgIdFrom, ZohoDeskClient } from "../lib/client.ts";
import { orgId, ticketId } from "../lib/params.ts";

interface Input {
  ticketId: string;
  content?: string;
  isPublic?: boolean;
  orgId?: string;
}

/**
 * `POST /tickets/{ticket_id}/comments`. To mention an agent or team inline,
 * Zoho documents a literal marker syntax in `content`:
 * `zsu[@user:{zuid}]zsu` / `zsu[@team:{teamId}_{teamName}]zsu`.
 */
const ticketCommentCreate: ActionDefinition<Input> = {
  key: "ticket-comment-create",
  type: "perform",
  resource: "ticket-comment",
  title: "Create Ticket Comment",
  description: "Add a comment to a ticket. To mention an agent or team, use " +
    "`zsu[@user:{zuid}]zsu` / `zsu[@team:{teamId}_{teamName}]zsu` in the content.",
  idempotent: false,
  params: [
    ticketId,
    { key: "content", label: "Content", type: "text" },
    {
      key: "isPublic",
      label: "Public",
      type: "boolean",
      default: true,
      hint: "Can only be set when adding a comment.",
    },
    orgId,
  ],
  output: [{ key: "id", type: "string", label: "Comment ID" }],

  execute(input, ctx) {
    return new ZohoDeskClient(ctx).request(
      `/tickets/${encodeURIComponent(input.ticketId)}/comments`,
      {
        method: "POST",
        orgId: orgIdFrom(input, ctx),
        body: { content: input.content, isPublic: input.isPublic },
      },
    );
  },
};

export default ticketCommentCreate;
