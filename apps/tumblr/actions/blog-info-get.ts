import type { ActionDefinition } from "@w6w/types";
import { encodeId, TumblrClient } from "../lib/client.ts";
import { blogIdentifierParam } from "../lib/params.ts";

/**
 * `GET /v2/blog/{blog-identifier}/info` — title, post count, description and
 * theme for a blog.
 *
 * Documented "API Key" auth level: an unauthenticated call works with a bare
 * `api_key` query parameter. This app signs every request with the connected
 * account's OAuth2 bearer token instead (never a query-string key — see the
 * README on why), which the vendor's own OAuth2 walkthrough shows is accepted
 * anywhere a plain API key would be.
 */
interface Input {
  blogIdentifier: string;
}

const blogInfoGet: ActionDefinition<Input> = {
  key: "blog-info-get",
  type: "read",
  resource: "blog",
  title: "Get Blog Info",
  description: "Fetch a blog's title, post count, description, avatar and theme.",
  params: [blogIdentifierParam],
  output: [{ key: "blog", type: "object", label: "The blog" }],

  execute(input, ctx) {
    return new TumblrClient(ctx).data(`/blog/${encodeId(input.blogIdentifier)}/info`);
  },
};

export default blogInfoGet;
