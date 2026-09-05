import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, TumblrClient } from "../lib/client.ts";
import { blogIdentifierParam, filterParam, limitOffsetParams, npfParam } from "../lib/params.ts";

/**
 * `GET /v2/blog/{blog-identifier}/posts` — a blog's published posts, newest
 * first by default. Documented "API Key" auth level.
 *
 * `tag` here is passed as a single value only. Tumblr also documents an
 * ALL-of-these-tags array form (`tag[0]=a&tag[1]=b`, max 4 tags), which this
 * action does not expose — a plain multiselect (comma-joined) would render as
 * `tag=a,b`, which is a different, undocumented query shape, not the
 * indexed-array form the vendor's own docs specify. Left out rather than
 * risking a silently-wrong filter.
 */
interface Input {
  blogIdentifier: string;
  type?: string;
  id?: number;
  tag?: string;
  limit?: number;
  offset?: number;
  before?: number;
  after?: number;
  sort?: string;
  reblogInfo?: boolean;
  notesInfo?: boolean;
  npf?: boolean;
  filter?: string;
}

const TYPE_OPTIONS = ["text", "quote", "link", "answer", "video", "audio", "photo", "chat"].map((
  v,
) => ({ value: v, label: v }));

const blogPostsList: ActionDefinition<Input> = {
  key: "blog-posts-list",
  type: "read",
  resource: "post",
  title: "List Published Posts",
  description: "List a blog's published posts.",
  params: [
    blogIdentifierParam,
    { key: "type", label: "Post type", type: "select", options: TYPE_OPTIONS },
    { key: "id", label: "Post ID", type: "number", hint: "Return only this one post." },
    { key: "tag", label: "Tag", type: "string" },
    ...limitOffsetParams(),
    { key: "before", label: "Before (timestamp)", type: "number" },
    { key: "after", label: "After (timestamp)", type: "number" },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      options: [{ value: "desc", label: "Newest first" }, { value: "asc", label: "Oldest first" }],
    },
    { key: "reblogInfo", label: "Include reblog info", type: "boolean" },
    { key: "notesInfo", label: "Include notes info", type: "boolean" },
    npfParam,
    filterParam,
  ],
  output: [
    { key: "blog", type: "object", label: "The blog" },
    { key: "posts", type: "array", label: "Posts" },
    { key: "total_posts", type: "number", label: "Total posts matching the request" },
  ],

  execute(input, ctx) {
    const path = `/blog/${encodeId(input.blogIdentifier)}/posts`;
    return new TumblrClient(ctx).data(path, {
      query: compact({
        type: input.type,
        id: input.id,
        tag: input.tag,
        limit: input.limit,
        offset: input.offset,
        before: input.before,
        after: input.after,
        sort: input.sort,
        reblog_info: input.reblogInfo ? "true" : undefined,
        notes_info: input.notesInfo ? "true" : undefined,
        npf: input.npf ? "true" : undefined,
        filter: input.filter,
      }),
    });
  },
};

export default blogPostsList;
