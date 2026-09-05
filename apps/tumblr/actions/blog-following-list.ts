import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, TumblrClient } from "../lib/client.ts";
import { blogIdentifierParam, limitOffsetParams } from "../lib/params.ts";

/**
 * `GET /v2/blog/{blog-identifier}/following` — the blogs a blog follows, most
 * recently-followed first. Documented "OAuth" auth level: the caller must be
 * an owner/member of `blogIdentifier`.
 */
interface Input {
  blogIdentifier: string;
  limit?: number;
  offset?: number;
}

const blogFollowingList: ActionDefinition<Input> = {
  key: "blog-following-list",
  type: "read",
  resource: "blog",
  title: "List Blog Following",
  description: "List the blogs this blog follows, most recently-followed first.",
  params: [blogIdentifierParam, ...limitOffsetParams()],
  output: [
    { key: "blogs", type: "array", label: "Followed blogs" },
    { key: "total_blogs", type: "number", label: "Total followed blogs" },
  ],

  execute(input, ctx) {
    return new TumblrClient(ctx).data(`/blog/${encodeId(input.blogIdentifier)}/following`, {
      query: compact({ limit: input.limit, offset: input.offset }),
    });
  },
};

export default blogFollowingList;
