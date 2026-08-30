import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { contactIdParam, organizationIdParam } from "../lib/params.ts";

/**
 * `PATCH /conversations/{contact_id}/mark-read` — set a conversation's read
 * state. Body: `{"read": boolean}` — confirmed against the vendor's own
 * example, which (despite the request being titled "Mark interaction
 * unread" in the collection) sends `{"read": false}`; `read: true` marks it
 * read.
 */
interface Input {
  contactId: string;
  read?: boolean;
  organizationId?: string;
}

const conversationMarkRead: ActionDefinition<Input> = {
  key: "conversation-mark-read",
  type: "perform",
  resource: "conversation",
  title: "Set Conversation Read State",
  description: "Mark a contact's conversation as read or unread.",
  idempotent: true,
  params: [
    contactIdParam,
    { key: "read", label: "Read", type: "boolean", default: true },
    organizationIdParam,
  ],
  output: [{ key: "result", type: "object", label: "The updated conversation state" }],

  async execute(input, ctx) {
    const result = await new VideoAskClient(ctx).entity(
      `/conversations/${encodeId(input.contactId)}/mark-read`,
      {
        method: "PATCH",
        body: { read: input.read ?? true },
        organizationId: input.organizationId,
      },
    );
    return { result };
  },
};

export default conversationMarkRead;
