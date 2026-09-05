import type { ActionDefinition } from "@w6w/types";
import { TumblrClient } from "../lib/client.ts";

/**
 * `POST /v2/user/unlike` — unlike a post. Documented "OAuth" auth level.
 * Same `id` + `reblog_key` pairing `user-like.ts` requires.
 */
interface Input {
  id: number;
  reblogKey: string;
}

const userUnlike: ActionDefinition<Input> = {
  key: "user-unlike",
  type: "perform",
  resource: "user",
  title: "Unlike Post",
  description: "Unlike a post.",
  idempotent: true,
  params: [
    { key: "id", label: "Post ID", type: "number", required: true },
    { key: "reblogKey", label: "Reblog key", type: "string", required: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new TumblrClient(ctx).status("/user/unlike", {
      method: "POST",
      body: { id: input.id, reblog_key: input.reblogKey },
    });
    return { status };
  },
};

export default userUnlike;
