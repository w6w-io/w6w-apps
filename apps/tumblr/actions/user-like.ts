import type { ActionDefinition } from "@w6w/types";
import { TumblrClient } from "../lib/client.ts";

/**
 * `POST /v2/user/like` — like a post. Documented "OAuth" auth level. Requires
 * both the post id and its `reblog_key` (from a posts-list action's
 * `reblog_key` field). Limited to 1,000 likes/day/user.
 */
interface Input {
  id: number;
  reblogKey: string;
}

const userLike: ActionDefinition<Input> = {
  key: "user-like",
  type: "perform",
  resource: "user",
  title: "Like Post",
  description: "Like a post.",
  idempotent: true,
  params: [
    { key: "id", label: "Post ID", type: "number", required: true },
    {
      key: "reblogKey",
      label: "Reblog key",
      type: "string",
      required: true,
      hint: "Take it from the post's own reblog_key field (e.g. from a posts-list action).",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new TumblrClient(ctx).status("/user/like", {
      method: "POST",
      body: { id: input.id, reblog_key: input.reblogKey },
    });
    return { status };
  },
};

export default userLike;
