import type { ActionDefinition } from "@w6w/types";
import { asJson, asOptionalJson, compact, encodeId, TumblrClient } from "../lib/client.ts";
import { blogIdentifierParam, postIdParam } from "../lib/params.ts";

/**
 * `PUT /v2/blog/{blog-identifier}/posts/{post-id}` — edit a post using the
 * Neue Post Format. Documented "OAuth" auth level.
 *
 * The vendor's docs: "all of the request parameters from the NPF Post
 * Creation route are expected" — so this action's params mirror
 * `post-create.ts`'s NPF fields (minus the reblog-only ones, which apply only
 * at creation time). "If you are editing a scheduled post, make sure to
 * include its `publish_on` value" — this app does not read it back for you
 * first; call `post-get` to fetch the current `publish_on` if you need to
 * preserve it.
 */
interface Input {
  blogIdentifier: string;
  postId: string;
  content: unknown;
  layout?: unknown;
  state?: string;
  publishOn?: string;
  date?: string;
  tags?: string;
  sourceUrl?: string;
  sendToTwitter?: boolean;
  isPrivate?: boolean;
  slug?: string;
  interactabilityReblog?: string;
}

const postUpdate: ActionDefinition<Input> = {
  key: "post-update",
  type: "perform",
  resource: "post",
  title: "Update Post",
  description: "Edit an existing post using the Neue Post Format.",
  idempotent: true,
  params: [
    blogIdentifierParam,
    postIdParam,
    {
      key: "content",
      label: "Content blocks (NPF)",
      type: "json",
      required: true,
      hint: "Array of Neue Post Format content blocks — replaces the post's existing content.",
    },
    { key: "layout", label: "Layout (NPF)", type: "json" },
    {
      key: "state",
      label: "State",
      type: "select",
      options: [
        { value: "published", label: "Published" },
        { value: "queue", label: "Queued" },
        { value: "draft", label: "Draft" },
        { value: "private", label: "Private" },
      ],
    },
    {
      key: "publishOn",
      label: "Publish on (ISO 8601)",
      type: "string",
      hint: "Required to preserve a scheduled post's publish time — see the vendor's note above.",
    },
    { key: "date", label: "Backdate to (ISO 8601)", type: "string" },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated." },
    { key: "sourceUrl", label: "Source URL", type: "string" },
    { key: "sendToTwitter", label: "Send to Twitter", type: "boolean" },
    { key: "isPrivate", label: "Private answer", type: "boolean" },
    { key: "slug", label: "URL slug", type: "string" },
    {
      key: "interactabilityReblog",
      label: "Who can reblog",
      type: "select",
      options: [{ value: "everyone", label: "Everyone" }, { value: "noone", label: "No one" }],
    },
  ],
  output: [{ key: "id", type: "string", label: "Edited post ID" }],

  execute(input, ctx) {
    const path = `/blog/${encodeId(input.blogIdentifier)}/posts/${encodeId(input.postId)}`;
    return new TumblrClient(ctx).data(path, {
      method: "PUT",
      body: compact({
        content: asJson(input.content, "content"),
        layout: asOptionalJson(input.layout, "layout"),
        state: input.state,
        publish_on: input.publishOn,
        date: input.date,
        tags: input.tags,
        source_url: input.sourceUrl,
        send_to_twitter: input.sendToTwitter,
        is_private: input.isPrivate,
        slug: input.slug,
        interactability_reblog: input.interactabilityReblog,
      }),
    });
  },
};

export default postUpdate;
