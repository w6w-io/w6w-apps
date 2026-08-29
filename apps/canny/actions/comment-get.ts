import type { ActionDefinition } from "@w6w/types";
import { CannyClient } from "../lib/client.ts";
import { commentOutput } from "../lib/output.ts";

/** `POST /v1/comments/retrieve` — a single portal comment by id. */
interface Input {
  id: string;
}

const commentGet: ActionDefinition<Input> = {
  key: "comment-get",
  type: "read",
  resource: "comment",
  title: "Get Comment",
  description: "Retrieve a single portal comment by its id.",
  params: [
    {
      key: "id",
      label: "Comment",
      type: "string",
      required: true,
      hint: "The comment's unique identifier.",
    },
  ],
  output: commentOutput,

  execute(input, ctx) {
    return new CannyClient(ctx).post("/comments/retrieve", { id: input.id });
  },
};

export default commentGet;
