import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, TumblrClient } from "../lib/client.ts";
import { blogIdentifierParam, limitOffsetParams } from "../lib/params.ts";

/**
 * `GET /v2/blog/{blog-identifier}/followers` — a blog's followers, wrapped in
 * a `users` field (each with `name`, `following`, `url`, `updated`).
 * Documented "OAuth" auth level: the caller must own/administer the blog.
 */
interface Input {
  blogIdentifier: string;
  limit?: number;
  offset?: number;
}

const blogFollowersList: ActionDefinition<Input> = {
  key: "blog-followers-list",
  type: "read",
  resource: "blog",
  title: "List Blog Followers",
  description: "List the blog's followers.",
  params: [blogIdentifierParam, ...limitOffsetParams()],
  output: [
    { key: "users", type: "array", label: "Followers" },
    { key: "total_users", type: "number", label: "Total followers" },
  ],

  execute(input, ctx) {
    return new TumblrClient(ctx).data(`/blog/${encodeId(input.blogIdentifier)}/followers`, {
      query: compact({ limit: input.limit, offset: input.offset }),
    });
  },
};

export default blogFollowersList;
