import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, TumblrClient } from "../lib/client.ts";
import { blogIdentifierParam, filterParam } from "../lib/params.ts";

/**
 * `GET /v2/blog/{blog-identifier}/posts/submission` — posts submitted to the
 * blog by other users (fan mail / ask-style submissions), awaiting review.
 * Documented "OAuth" auth level.
 *
 * Like `posts/draft`, the vendor documents only `offset` and `filter` here —
 * no `limit` — so no `limit` param is exposed.
 */
interface Input {
  blogIdentifier: string;
  offset?: number;
  filter?: string;
}

const blogPostsSubmissionList: ActionDefinition<Input> = {
  key: "blog-posts-submission-list",
  type: "read",
  resource: "post",
  title: "List Submission Posts",
  description: "List posts submitted to the blog by other users, awaiting review.",
  params: [
    blogIdentifierParam,
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Submission number to start at. Defaults to 0.",
    },
    filterParam,
  ],
  output: [{ key: "posts", type: "array", label: "Submission posts" }],

  execute(input, ctx) {
    return new TumblrClient(ctx).data(
      `/blog/${encodeId(input.blogIdentifier)}/posts/submission`,
      { query: compact({ offset: input.offset, filter: input.filter }) },
    );
  },
};

export default blogPostsSubmissionList;
