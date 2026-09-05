import type { ActionDefinition } from "@w6w/types";
import { compact, JudgeMeClient } from "../lib/client.ts";

/**
 * `POST /replies` — Create a public reply on the review widget.
 *
 * The `200` response carries only a description ("Reply was created
 * successfully"), no schema and no body content type — so this action
 * returns nothing beyond the fact that the call succeeded (the client throws
 * on any non-2xx status, surfacing the documented `422 {"error": "..."}`
 * shape as the thrown error).
 */
interface Input {
  reviewId: number;
  content: string;
  sendReplyEmail?: boolean;
}

const createReply: ActionDefinition<Input> = {
  key: "create-reply",
  type: "perform",
  resource: "reply",
  title: "Create Reply",
  description:
    "Post a public reply to a review, shown on the Judge.me review widget. Defaults to also " +
    "emailing the reviewer, per Judge.me's own default.",
  idempotent: false,
  params: [
    { key: "reviewId", label: "Review ID", type: "number", required: true },
    { key: "content", label: "Reply Content", type: "text", required: true },
    {
      key: "sendReplyEmail",
      label: "Email the Reviewer",
      type: "boolean",
      default: true,
      advanced: true,
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Whether the reply was created" },
  ],

  async execute(input, ctx) {
    await new JudgeMeClient(ctx).status("/replies", {
      method: "POST",
      body: compact({
        review_id: input.reviewId,
        send_reply_email: input.sendReplyEmail,
        reply: { content: input.content },
      }),
    });
    return { ok: true };
  },
};

export default createReply;
