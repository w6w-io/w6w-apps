import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, TumblrClient } from "../lib/client.ts";
import { blogIdentifierParam, filterParam } from "../lib/params.ts";

/**
 * `GET /v2/blog/{blog-identifier}/posts/draft` — the blog's draft posts.
 * Documented "OAuth" auth level.
 *
 * Unlike almost every other list endpoint in this app, the vendor's own docs
 * do NOT offer `limit`/`offset` here — only `before_id` (cursor-style, by
 * post id) and `filter`. No `limit`/`offset` params are exposed for that
 * reason, rather than adding ones the API does not accept.
 */
interface Input {
  blogIdentifier: string;
  beforeId?: number;
  filter?: string;
}

const blogPostsDraftList: ActionDefinition<Input> = {
  key: "blog-posts-draft-list",
  type: "read",
  resource: "post",
  title: "List Draft Posts",
  description: "List the blog's draft posts.",
  params: [
    blogIdentifierParam,
    {
      key: "beforeId",
      label: "Before post ID",
      type: "number",
      hint: "Page through drafts by passing the last post id of the previous page.",
    },
    filterParam,
  ],
  output: [
    { key: "posts", type: "array", label: "Draft posts" },
    { key: "total_posts", type: "number", label: "Total draft posts" },
  ],

  execute(input, ctx) {
    return new TumblrClient(ctx).data(`/blog/${encodeId(input.blogIdentifier)}/posts/draft`, {
      query: compact({ before_id: input.beforeId, filter: input.filter }),
    });
  },
};

export default blogPostsDraftList;
