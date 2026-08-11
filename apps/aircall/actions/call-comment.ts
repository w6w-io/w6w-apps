import type { ActionDefinition } from "@w6w/types";
import { AircallClient, encodeId } from "../lib/client.ts";
import { callIdParam } from "../lib/params.ts";

interface Input {
  callId: string;
  content: string;
}

/**
 * `POST /v1/calls/:id/comments` — add a note to a Call. Answers **201**.
 *
 * Three vendor constraints that make this action's shape non-obvious:
 *
 *  - **A Call holds at most five comments.** The sixth request fails with a 400
 *    whose message is "Maximum of 5 notes can be added to a Call."
 *  - **A comment cannot be edited or deleted** once posted, by any route.
 *  - **A comment posted through the API has no owner.** Aircall: "A comment
 *    posted via the Public API does not have an owner", so it renders without an
 *    author where an agent's comment shows one. Put the provenance in the text
 *    if it matters.
 *
 * Emojis are stripped from the content by Aircall, silently.
 */
const callComment: ActionDefinition<Input> = {
  key: "call-comment",
  type: "perform",
  resource: "call",
  title: "Comment on Call",
  description:
    "Add a note to a Call. Maximum five per Call, cannot be edited or deleted, and shows no author.",
  // Not retryable: there is no idempotency key and no upsert, so a replay adds a
  // SECOND identical note — and burns one of the five slots the Call will ever
  // have.
  idempotent: false,
  params: [
    callIdParam,
    {
      key: "content",
      label: "Comment",
      type: "text",
      required: true,
      hint: "Aircall strips emojis from comment text.",
      placeholder: "Please call back this customer!",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status — 201 on success" }],

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    const status = await client.status(`/calls/${encodeId(input.callId)}/comments`, {
      method: "POST",
      body: { content: input.content },
    });
    return { status };
  },
};

export default callComment;
