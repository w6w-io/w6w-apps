import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { messageOutput } from "../lib/output.ts";

/**
 * `POST /v1/posts/merge` — merge a duplicate post into another, moving its
 * votes and comments.
 *
 * Not idempotent: `mergePostID` stops existing as a standalone post once the
 * merge succeeds, so retrying the same call after a success (rather than
 * after a genuine failure) targets a post that is no longer there.
 */
interface Input {
  mergePostID: string;
  intoPostID: string;
  mergerID: string;
}

const postMerge: ActionDefinition<Input> = {
  key: "post-merge",
  type: "perform",
  resource: "post",
  title: "Merge Post",
  description: "Merge a duplicate post into another post.",
  idempotent: false,
  params: [
    {
      key: "mergePostID",
      label: "Post to merge",
      type: "string",
      required: true,
      hint: "The unique identifier of the post that will be merged (and disappear).",
    },
    {
      key: "intoPostID",
      label: "Merge into",
      type: "string",
      required: true,
      hint: "The unique identifier of the post that mergePostID will be merged into.",
    },
    {
      key: "mergerID",
      label: "Merged by",
      type: "string",
      required: true,
      hint: "The unique identifier of the user who performed the merge.",
    },
  ],
  output: messageOutput,

  async execute(input, ctx) {
    const message = await new CannyClient(ctx).postMessage("/posts/merge", {
      mergePostID: input.mergePostID,
      intoPostID: input.intoPostID,
      mergerID: input.mergerID,
    });
    return { message };
  },
};

export default postMerge;
