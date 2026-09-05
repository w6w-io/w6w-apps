import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, TumblrClient } from "../lib/client.ts";
import { blogIdentifierParam, limitOffsetParams } from "../lib/params.ts";

/**
 * `GET /v2/blog/{blog-identifier}/likes` — a blog's publicly-exposed likes.
 * Documented "API Key" auth level (see `blog-info-get.ts` for why this app
 * signs with OAuth2 rather than a query-string key regardless).
 *
 * Tumblr accepts only one of `offset`, `before`, `after` per call — this
 * action exposes all three and passes through whichever the caller sets.
 */
interface Input {
  blogIdentifier: string;
  limit?: number;
  offset?: number;
  before?: number;
  after?: number;
}

const blogLikesList: ActionDefinition<Input> = {
  key: "blog-likes-list",
  type: "read",
  resource: "blog",
  title: "List Blog Likes",
  description:
    "List the posts a blog has publicly liked. Likes sharing must be enabled on the blog.",
  params: [
    blogIdentifierParam,
    ...limitOffsetParams(),
    {
      key: "before",
      label: "Before (timestamp)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Unix timestamp. Mutually exclusive with offset and after.",
    },
    {
      key: "after",
      label: "After (timestamp)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Unix timestamp. Mutually exclusive with offset and before.",
    },
  ],
  output: [
    { key: "liked_posts", type: "array", label: "Liked posts" },
    { key: "liked_count", type: "number", label: "Total liked posts" },
  ],

  execute(input, ctx) {
    return new TumblrClient(ctx).data(`/blog/${encodeId(input.blogIdentifier)}/likes`, {
      query: compact({
        limit: input.limit,
        offset: input.offset,
        before: input.before,
        after: input.after,
      }),
    });
  },
};

export default blogLikesList;
