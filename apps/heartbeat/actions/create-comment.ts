import type { ActionDefinition } from "@w6w/types";
import { compact, HeartbeatClient } from "../lib/client.ts";
import { RICH_TEXT_HINT } from "../lib/params.ts";

/**
 * `PUT /v0/comments` — reply to a thread, or reply to a comment.
 *
 * Heartbeat threads have exactly two levels of nesting. Leave "Parent
 * comment" empty for a direct reply to the thread; set it to reply to a
 * top-level comment. The vendor requires this field's *presence* (even as
 * null) — it is in the schema's `required` list — so this action always sends
 * it, as `null` when left empty, rather than omitting the key.
 */
interface Input {
  threadID: string;
  text: string;
  parentCommentID?: string;
  userID?: string;
  createdAt?: string;
}

const createComment: ActionDefinition<Input> = {
  key: "create-comment",
  type: "perform",
  resource: "comment",
  title: "Create Comment",
  description: "Reply to a thread, or reply to a top-level comment on it.",
  idempotent: false,
  params: [
    { key: "threadID", label: "Thread ID", type: "string", required: true },
    { key: "text", label: "Content", type: "text", required: true, hint: RICH_TEXT_HINT },
    {
      key: "parentCommentID",
      label: "Parent comment ID",
      type: "string",
      hint: "Leave empty to reply directly to the thread. Must be a top-level comment's id — " +
        "Heartbeat only nests two levels deep.",
    },
    {
      key: "userID",
      label: "Author user ID",
      type: "string",
      hint: "Must be an admin. Defaults to the user who created the API key.",
    },
    {
      key: "createdAt",
      label: "Created at (override)",
      type: "datetime",
      hint: "ISO 8601. Overrides the default creation timestamp.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "userID", type: "string", label: "Author user ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json("/comments", {
      method: "PUT",
      body: {
        ...compact({
          text: input.text,
          threadID: input.threadID,
          userID: input.userID,
          createdAt: input.createdAt,
        }),
        parentCommentID: input.parentCommentID ?? null,
      },
    });
  },
};

export default createComment;
