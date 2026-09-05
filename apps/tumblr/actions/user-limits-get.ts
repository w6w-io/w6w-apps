import type { ActionDefinition } from "@w6w/types";
import { TumblrClient } from "../lib/client.ts";

/**
 * `GET /v2/user/limits` — the connected account's per-feature rate-limit
 * headroom (blogs/day, follows/day, likes/day, posts/day, …), each with a
 * `limit`, `remaining` and `reset_at`. Documented "OAuth" auth level.
 */
const userLimitsGet: ActionDefinition<Record<string, never>> = {
  key: "user-limits-get",
  type: "read",
  resource: "user",
  title: "Get My Limits",
  description: "Fetch the connected account's per-feature rate-limit headroom.",
  params: [],
  output: [{ key: "user", type: "object", label: "Per-feature limits" }],

  execute(_input, ctx) {
    return new TumblrClient(ctx).data("/user/limits");
  },
};

export default userLimitsGet;
