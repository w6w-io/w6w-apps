import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { messageOutput } from "../lib/output.ts";
import { postIdParam } from "../lib/params.ts";

/**
 * `POST /v1/votes/delete` — remove a voter's vote from a post.
 *
 * Idempotent: Canny's own "Returns" text says "successfully deleted, or
 * already doesn't exist" — an explicit no-op on repeat.
 */
interface Input {
  postID: string;
  voterID: string;
}

const voteDelete: ActionDefinition<Input> = {
  key: "vote-delete",
  type: "perform",
  resource: "vote",
  title: "Delete Vote",
  description: "Remove a voter's vote from a post.",
  idempotent: true,
  params: [
    postIdParam,
    {
      key: "voterID",
      label: "Voter",
      type: "string",
      required: true,
      hint: "The voter's unique identifier.",
    },
  ],
  output: messageOutput,

  async execute(input, ctx) {
    const message = await new CannyClient(ctx).postMessage("/votes/delete", {
      postID: input.postID,
      voterID: input.voterID,
    });
    return { message };
  },
};

export default voteDelete;
