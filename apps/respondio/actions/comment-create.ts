import type { ActionDefinition } from "@w6w/types";
import { assertIdentifier, RespondioClient } from "../lib/client.ts";

/**
 * `POST /contact/{identifier}/comment` — `CommentClient.create` in the
 * official SDK. An internal note on a contact, invisible to the contact
 * itself; supports `{{@user.id}}` mentions per the SDK's README example.
 * Not idempotent: each call adds a distinct comment.
 */
interface Input {
  identifier: string;
  text: string;
}

/** `FIELD_LIMITS.COMMENT_MAX_LENGTH` in the official `respond-io/mcp-server`. */
const COMMENT_MAX_LENGTH = 1000;

const commentCreate: ActionDefinition<Input> = {
  key: "comment-create",
  type: "perform",
  resource: "comment",
  title: "Create Comment",
  description: "Add an internal comment to a contact.",
  idempotent: false,
  params: [
    { key: "identifier", label: "Contact identifier", type: "string", required: true },
    {
      key: "text",
      label: "Comment",
      type: "text",
      required: true,
      validation: { maxLength: COMMENT_MAX_LENGTH },
      hint: `Up to ${COMMENT_MAX_LENGTH} characters. Mention a user with "{{@user.<id>}}".`,
    },
  ],
  output: [
    { key: "contactId", type: "number", label: "Contact ID" },
    { key: "text", type: "string", label: "Comment text" },
    { key: "created_at", type: "number", label: "Created at (unix seconds)" },
  ],

  execute(input, ctx) {
    const identifier = assertIdentifier(input.identifier);
    if (!input.text) throw new Error("Comment text is required");
    if (input.text.length > COMMENT_MAX_LENGTH) {
      throw new Error(`Comment exceeds ${COMMENT_MAX_LENGTH} characters`);
    }
    return new RespondioClient(ctx).post(`/contact/${identifier}/comment`, { text: input.text });
  },
};

export default commentCreate;
