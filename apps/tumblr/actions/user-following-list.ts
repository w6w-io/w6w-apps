import type { ActionDefinition } from "@w6w/types";
import { compact, TumblrClient } from "../lib/client.ts";
import { limitOffsetParams } from "../lib/params.ts";

/**
 * `GET /v2/user/following` — blogs followed by the connected account.
 * Documented "OAuth" auth level.
 */
interface Input {
  limit?: number;
  offset?: number;
}

const userFollowingList: ActionDefinition<Input> = {
  key: "user-following-list",
  type: "read",
  resource: "user",
  title: "List My Following",
  description: "List the blogs the connected account follows.",
  params: [...limitOffsetParams()],
  output: [
    { key: "blogs", type: "array", label: "Followed blogs" },
    { key: "total_blogs", type: "number", label: "Total followed blogs" },
  ],

  execute(input, ctx) {
    return new TumblrClient(ctx).data("/user/following", {
      query: compact({ limit: input.limit, offset: input.offset }),
    });
  },
};

export default userFollowingList;
