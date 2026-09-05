import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, TumblrClient } from "../lib/client.ts";
import { blogIdentifierParam, postIdParam } from "../lib/params.ts";

/**
 * `GET /v2/blog/{blog-identifier}/posts/{post-id}` — fetch one post, in
 * either NPF or legacy format, for editing or inspection. Documented "OAuth"
 * auth level.
 */
interface Input {
  blogIdentifier: string;
  postId: string;
  postFormat?: string;
}

const postGet: ActionDefinition<Input> = {
  key: "post-get",
  type: "read",
  resource: "post",
  title: "Get Post",
  description: "Fetch a single post by ID, in NPF or legacy format.",
  params: [
    blogIdentifierParam,
    postIdParam,
    {
      key: "postFormat",
      label: "Format",
      type: "select",
      default: "npf",
      options: [{ value: "npf", label: "Neue Post Format" }, { value: "legacy", label: "Legacy" }],
    },
  ],
  output: [{ key: "post", type: "object", label: "The post" }],

  execute(input, ctx) {
    const path = `/blog/${encodeId(input.blogIdentifier)}/posts/${encodeId(input.postId)}`;
    return new TumblrClient(ctx).data(path, {
      query: compact({ post_format: input.postFormat }),
    });
  },
};

export default postGet;
