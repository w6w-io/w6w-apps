import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { messageOutput } from "../lib/output.ts";
import { boardIdParam, postIdParam } from "../lib/params.ts";

/** `POST /v1/posts/change_board` — move a post to a different board. */
interface Input {
  postID: string;
  boardID: string;
}

const postChangeBoard: ActionDefinition<Input> = {
  key: "post-change-board",
  type: "perform",
  resource: "post",
  title: "Change Post Board",
  description: "Move a post to a different board.",
  idempotent: true,
  params: [postIdParam, {
    ...boardIdParam(true),
    hint: "The destination board's unique identifier.",
  }],
  output: messageOutput,

  async execute(input, ctx) {
    const message = await new CannyClient(ctx).postMessage("/posts/change_board", {
      postID: input.postID,
      boardID: input.boardID,
    });
    return { message };
  },
};

export default postChangeBoard;
