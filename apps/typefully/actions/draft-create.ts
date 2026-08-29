import type { ActionDefinition } from "@w6w/types";
import { asJson, compact, TypefullyClient } from "../lib/client.ts";
import { socialSetIdParam } from "../lib/params.ts";

interface Input {
  socialSetId: number;
  platforms: unknown;
  draftTitle?: string;
  scratchpadText?: string;
  tags?: string;
  share?: boolean;
  publishAt?: string;
  planAt?: string;
}

/**
 * `POST /v2/social-sets/{social_set_id}/drafts` — create a draft.
 *
 * ## `platforms` is a single JSON object, not individual params
 *
 * The vendor's `Platforms` schema is a discriminated union across seven very
 * different shapes — `x` (up to 50 `XPost`s, each with `media_ids`,
 * `hide_link_preview`, `quote_post_url`, subscriber/paid-partnership/AI-label
 * flags, plus thread-level `settings.reply_to_url`/`community_id`), `linkedin`
 * (mention syntax, `linkedin_reshare_target`), `mastodon`/`threads`/`bluesky`
 * (a shared `LinkPreviewPost` shape), `substack` (exactly one note), and
 * `x_article` (standalone Markdown with `<typ:media>`/`<typ:x-post>` embeds,
 * mutually exclusive with every other platform). Modelling that as a flat
 * `Param[]` tree would need a different field set per platform per post; the
 * vendor's own `Platforms` shape is a better authority to write against
 * directly than a parallel spec of it would be. Pass the object exactly as
 * documented at https://typefully.com/docs/api — the "Multi-platform draft" /
 * "X quote post" / "X Article" examples on that page are valid inputs here
 * verbatim.
 *
 * ## Planning vs. scheduling vs. publishing
 *
 * `plan_at` and `publish_at` are mutually exclusive. A **planned** draft is
 * dated but inert — it shows on the queue/calendar at that date but never
 * auto-publishes until later confirmed by setting `publish_at`. `publish_at`
 * with a future datetime or `"next-free-slot"` schedules it for real;
 * `publish_at: "now"` publishes immediately, but **asynchronously** — the
 * response returns with `publish_state: "in_progress"` while `status` is
 * still `"draft"` and the published-URL fields are null. That is success, not
 * failure: poll `draft-get` until `publish_state` is `"finished"`, then read
 * `status` and the published URLs.
 *
 * Not `idempotent`: retrying a failed create (network drop, timeout) creates a
 * second draft, and Typefully documents no request-level dedupe key.
 */
const draftCreate: ActionDefinition<Input> = {
  key: "draft-create",
  type: "perform",
  resource: "draft",
  title: "Create Draft",
  description: "Create a draft, optionally planned, scheduled, or published immediately.",
  idempotent: false,
  params: [
    socialSetIdParam,
    {
      key: "platforms",
      label: "Platforms",
      type: "json",
      required: true,
      hint: "Per-platform content, exactly as the vendor's `Platforms` schema documents — e.g. " +
        '{"x": {"enabled": true, "posts": [{"text": "Hello world!"}]}}. See ' +
        "https://typefully.com/docs/api for the full shape of every platform.",
    },
    {
      key: "draftTitle",
      label: "Draft Title",
      type: "string",
      advanced: true,
      hint: "Internal organization only — never posted to social media. Max 512 characters.",
    },
    {
      key: "scratchpadText",
      label: "Scratchpad Notes",
      type: "text",
      advanced: true,
      hint: "Plain-text notes attached to the draft. Formatting is stripped.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      advanced: true,
      hint: "Comma-separated tag slugs (not names) — the tags must already exist; create them " +
        "with Create Tag first. Up to 10.",
    },
    {
      key: "share",
      label: "Generate Share Link",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "When true, generates a public URL anyone with the link can use to view the draft.",
    },
    {
      key: "publishAt",
      label: "Publish At",
      type: "string",
      advanced: true,
      hint: '"now" (immediate, asynchronous), "next-free-slot", or a future ISO 8601 datetime ' +
        "with timezone. Omit to save as a plain draft. Mutually exclusive with Plan At.",
    },
    {
      key: "planAt",
      label: "Plan At",
      type: "string",
      advanced: true,
      hint: '"next-free-slot" or a future ISO 8601 datetime with timezone ("now" is not valid ' +
        "here). Mutually exclusive with Publish At.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Draft ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "publish_state", type: "string", label: "Async publish progress, or null" },
    { key: "private_url", type: "string", label: "Private Typefully URL" },
    { key: "share_url", type: "string", label: "Public share URL, or null" },
    { key: "platforms", type: "object", label: "Platform content as stored" },
  ],

  async execute(input, ctx) {
    const platforms = asJson<unknown>(input.platforms, "Platforms");
    const body = compact({
      platforms,
      draft_title: input.draftTitle,
      scratchpad_text: input.scratchpadText,
      tags: input.tags ? input.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      share: input.share,
      publish_at: input.publishAt,
      plan_at: input.planAt,
    });
    ctx.log("info", "creating Typefully draft", { socialSetId: input.socialSetId });
    return await new TypefullyClient(ctx).json(`/social-sets/${input.socialSetId}/drafts`, {
      method: "POST",
      body,
    });
  },
};

export default draftCreate;
