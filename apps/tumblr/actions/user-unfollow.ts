import type { ActionDefinition } from "@w6w/types";
import { TumblrClient } from "../lib/client.ts";

/**
 * `POST /v2/user/unfollow` — unfollow a blog by URL. Documented "OAuth" auth
 * level.
 */
interface Input {
  url: string;
}

const userUnfollow: ActionDefinition<Input> = {
  key: "user-unfollow",
  type: "perform",
  resource: "user",
  title: "Unfollow Blog",
  description: "Unfollow a blog by its URL.",
  idempotent: true,
  params: [{ key: "url", label: "Blog URL", type: "string", required: true }],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new TumblrClient(ctx).status("/user/unfollow", {
      method: "POST",
      body: { url: input.url },
    });
    return { status };
  },
};

export default userUnfollow;
