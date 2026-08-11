import type { ActionDefinition } from "@w6w/types";
import { BasecampClient } from "../lib/client.ts";

/**
 * `POST /recordings/{recordingId}/comments.json` — comment on anything.
 *
 * Basecamp models messages, to-dos, documents and uploads as **recordings**, so
 * one endpoint comments on all of them: pass the id of whatever you are
 * commenting on, whatever kind it is. That is why this app has one comment
 * action rather than four.
 *
 * `content` is rich text — Basecamp stores HTML.
 *
 * Not idempotent: a repeat posts a second comment.
 */
interface Input {
  recordingId: string;
  content: string;
}

const commentCreate: ActionDefinition<Input> = {
  key: "comment-create",
  type: "perform",
  resource: "comment",
  title: "Create Comment",
  description:
    "Comment on any recording — a message, to-do, document or upload. One endpoint covers them " +
    "all.",
  idempotent: false,
  params: [
    {
      key: "recordingId",
      label: "Recording ID",
      type: "string",
      required: true,
      hint: "The id of the message, to-do, document or upload being commented on.",
    },
    {
      key: "content",
      label: "Comment",
      type: "text",
      required: true,
      hint: "Rich text — Basecamp stores HTML here.",
    },
  ],
  output: [{ key: "id", type: "number", label: "The created comment's id" }],

  execute(input, ctx) {
    return new BasecampClient(ctx).request(
      `/recordings/${encodeURIComponent(input.recordingId)}/comments.json`,
      { method: "POST", body: { content: input.content } },
    );
  },
};

export default commentCreate;
