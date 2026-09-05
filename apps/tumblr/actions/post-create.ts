import type { ActionDefinition } from "@w6w/types";
import { asJson, asOptionalJson, compact, encodeId, TumblrClient } from "../lib/client.ts";
import { blogIdentifierParam } from "../lib/params.ts";

/**
 * `POST /v2/blog/{blog-identifier}/posts` — create (or reblog) a post in the
 * Neue Post Format (NPF). Documented "OAuth" auth level.
 *
 * The legacy, per-type creation route (`POST /{blog-identifier}/post`) is
 * left unimplemented: the vendor's own docs say "these legacy posting flows
 * are still available, but we encourage you to use the [NPF] creation
 * route," and NPF is the one format every post-reading action in this app
 * already normalises to via `npf=true`.
 *
 * Reblogging is supported by the same endpoint (set `parentTumblelogUuid` +
 * `parentPostId` + `reblogKey`, all three required together per the vendor's
 * docs) — a separate reblog action would just be this one with three more
 * required fields, so it is folded in here instead.
 *
 * Multipart media upload (the `identifier`-keyed form-data variant for
 * uploading raw image/video bytes alongside the NPF JSON) is out of scope:
 * this app's actions pass a JSON body, and an Action's params model does not
 * have a natural multipart-with-JSON-sibling-parts shape. An `image` NPF
 * content block referencing an already-hosted URL still works.
 */
interface Input {
  blogIdentifier: string;
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
  parentTumblelogUuid?: string;
  parentPostId?: number;
  reblogKey?: string;
  hideTrail?: boolean;
}

const postCreate: ActionDefinition<Input> = {
  key: "post-create",
  type: "perform",
  resource: "post",
  title: "Create Post",
  description: "Create (or reblog) a post using the Neue Post Format.",
  idempotent: false,
  params: [
    blogIdentifierParam,
    {
      key: "content",
      label: "Content blocks (NPF)",
      type: "json",
      required: true,
      hint: "Array of Neue Post Format content blocks. See the NPF specification linked from " +
        "the Tumblr API docs.",
    },
    { key: "layout", label: "Layout (NPF)", type: "json", hint: "Array of NPF layout objects." },
    {
      key: "state",
      label: "State",
      type: "select",
      default: "published",
      options: [
        { value: "published", label: "Published" },
        { value: "queue", label: "Queued" },
        { value: "draft", label: "Draft" },
        { value: "private", label: "Private (published immediately)" },
        { value: "unapproved", label: "Unapproved (new submission)" },
      ],
    },
    {
      key: "publishOn",
      label: "Publish on (ISO 8601)",
      type: "string",
      hint: "Only takes effect when state is queue.",
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
    {
      key: "parentTumblelogUuid",
      label: "Reblog: parent blog UUID",
      type: "string",
      hint: "Set this, Parent post ID and Reblog key together to reblog instead of posting new.",
    },
    { key: "parentPostId", label: "Reblog: parent post ID", type: "number" },
    { key: "reblogKey", label: "Reblog: reblog key", type: "string" },
    { key: "hideTrail", label: "Reblog: hide trail", type: "boolean" },
  ],
  output: [{ key: "id", type: "string", label: "Created post ID" }],

  execute(input, ctx) {
    const isReblog = Boolean(
      input.parentTumblelogUuid && input.parentPostId && input.reblogKey,
    );
    return new TumblrClient(ctx).data(`/blog/${encodeId(input.blogIdentifier)}/posts`, {
      method: "POST",
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
        ...(isReblog
          ? {
            parent_tumblelog_uuid: input.parentTumblelogUuid,
            parent_post_id: input.parentPostId,
            reblog_key: input.reblogKey,
            hide_trail: input.hideTrail,
          }
          : {}),
      }),
    });
  },
};

export default postCreate;
