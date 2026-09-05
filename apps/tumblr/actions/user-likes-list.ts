import type { ActionDefinition } from "@w6w/types";
import { compact, TumblrClient } from "../lib/client.ts";
import { limitOffsetParams } from "../lib/params.ts";

/**
 * `GET /v2/user/likes` — posts liked by the connected account. Documented
 * "OAuth" auth level. Only one of `offset`, `before`, `after` may be set per
 * call — see `blog-likes-list.ts`, which shares this constraint.
 */
interface Input {
  limit?: number;
  offset?: number;
  before?: number;
  after?: number;
}

const userLikesList: ActionDefinition<Input> = {
  key: "user-likes-list",
  type: "read",
  resource: "user",
  title: "List My Likes",
  description: "List posts liked by the connected account.",
  params: [
    ...limitOffsetParams(),
    { key: "before", label: "Before (timestamp)", type: "number" },
    { key: "after", label: "After (timestamp)", type: "number" },
  ],
  output: [
    { key: "liked_posts", type: "array", label: "Liked posts" },
    { key: "liked_count", type: "number", label: "Total liked posts" },
  ],

  execute(input, ctx) {
    return new TumblrClient(ctx).data("/user/likes", {
      query: compact({
        limit: input.limit,
        offset: input.offset,
        before: input.before,
        after: input.after,
      }),
    });
  },
};

export default userLikesList;
