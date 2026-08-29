import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, joinIds, WrikeClient } from "../lib/client.ts";

/** `GET /comments/{commentIds}` — one or more comments by ID, regardless of parent. */
interface Input {
  commentIds: string | string[];
  plainText?: boolean;
}

const commentGet: ActionDefinition<Input> = {
  key: "comment-get",
  type: "read",
  resource: "comment",
  title: "Get Comments by ID",
  description: "Fetch one or more comments by ID.",
  params: [
    {
      key: "commentIds",
      label: "Comment ID(s)",
      type: "string",
      required: true,
      hint: "One comment ID, or several comma-separated.",
    },
    { key: "plainText", label: "Plain text", type: "boolean", advanced: true },
  ],
  output: [{ key: "items", type: "array", label: "Comments" }],

  async execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    const items = await new WrikeClient(ctx, host).list(`/comments/${joinIds(input.commentIds)}`, {
      query: { plainText: input.plainText },
    });
    return { items };
  },
};

export default commentGet;
