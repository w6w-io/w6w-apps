import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, TumblrClient } from "../lib/client.ts";
import { blogIdentifierParam, filterParam, limitOffsetParams } from "../lib/params.ts";

/**
 * `GET /v2/blog/{blog-identifier}/posts/queue` — the blog's currently queued
 * posts. Documented "OAuth" auth level: the caller must own/administer the
 * blog. A blog can hold at most 1,000 queued posts at a time.
 */
interface Input {
  blogIdentifier: string;
  limit?: number;
  offset?: number;
  filter?: string;
}

const blogPostsQueueList: ActionDefinition<Input> = {
  key: "blog-posts-queue-list",
  type: "read",
  resource: "post",
  title: "List Queued Posts",
  description: "List the blog's currently queued posts.",
  params: [blogIdentifierParam, ...limitOffsetParams(), filterParam],
  output: [
    { key: "posts", type: "array", label: "Queued posts" },
    { key: "total_posts", type: "number", label: "Total queued posts" },
  ],

  execute(input, ctx) {
    return new TumblrClient(ctx).data(`/blog/${encodeId(input.blogIdentifier)}/posts/queue`, {
      query: compact({ limit: input.limit, offset: input.offset, filter: input.filter }),
    });
  },
};

export default blogPostsQueueList;
