import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, TypefullyClient } from "../lib/client.ts";
import { draftIdParam, excludeCommentMarkersParam, socialSetIdParam } from "../lib/params.ts";

/**
 * `publishAt`/`planAt` accept the literal string `"null"` to mean "send JSON
 * `null`" (clear the date) — distinct from leaving the param blank, which
 * means "omit the field, don't touch the date". `compact()` on the rest of the
 * body would otherwise strip a real `null` right back out.
 */
function nullableDate(v: string | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  return v === "null" ? null : v;
}

interface Input {
  socialSetId: number;
  draftId: number;
  platforms?: unknown;
  draftTitle?: string;
  scratchpadText?: string;
  tags?: string;
  share?: boolean;
  publishAt?: string;
  planAt?: string;
  forceOverwriteComments?: boolean;
  excludeCommentMarkers?: boolean;
}

/**
 * `PATCH /v2/social-sets/{social_set_id}/drafts/{draft_id}` — partial update.
 * Only fields you provide are changed; everything else is left as-is.
 *
 * ## Comment-thread markers
 *
 * If the draft has comment threads, submitted `posts[*].text` (and X Article
 * `content_markdown`) must preserve the `<typ:comment-thread id="…">` markers
 * from a prior `draft-get` (called without Exclude Comment Markers). Missing a
 * marker the server still has fails with `409 COMMENTS_MARKER_MISMATCH` unless
 * `forceOverwriteComments` is set, in which case the affected threads are
 * resolved server-side and their anchors stripped. Recommended flow: `draft-get`
 * → edit text while keeping markers intact → `draft-update` with
 * `forceOverwriteComments: false` (the default).
 *
 * ## Planning / scheduling / publishing — same rules as create, plus explicit clear
 *
 * `plan_at`/`publish_at` are mutually exclusive, same semantics as
 * `draft-create`. Additionally here, an **explicit** `plan_at: null` or
 * `publish_at: null` clears the date and returns the draft to plain-draft
 * status — but this action only sends a field when you give it a value, so
 * clearing a date requires typing the literal `null` (as JSON) rather than
 * leaving the field blank.
 *
 * Not `idempotent`: this can trigger a real side effect (moving a draft into
 * `publish_at: "now"`), and Typefully documents no dedupe key for it.
 */
const draftUpdate: ActionDefinition<Input> = {
  key: "draft-update",
  type: "perform",
  resource: "draft",
  title: "Update Draft",
  description: "Partially update a draft's content, tags, sharing, or scheduling.",
  idempotent: false,
  params: [
    socialSetIdParam,
    draftIdParam,
    {
      key: "platforms",
      label: "Platforms",
      type: "json",
      hint: "Only the platforms you include are changed. Same `Platforms` shape as Create " +
        "Draft — see https://typefully.com/docs/api.",
    },
    { key: "draftTitle", label: "Draft Title", type: "string", advanced: true },
    { key: "scratchpadText", label: "Scratchpad Notes", type: "text", advanced: true },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      advanced: true,
      hint: "Comma-separated tag slugs. Replaces the draft's tag list entirely.",
    },
    { key: "share", label: "Generate Share Link", type: "boolean", advanced: true },
    {
      key: "publishAt",
      label: "Publish At",
      type: "string",
      advanced: true,
      hint: '"now", "next-free-slot", a future ISO 8601 datetime, or the literal JSON `null` ' +
        "to clear it. Mutually exclusive with Plan At.",
    },
    {
      key: "planAt",
      label: "Plan At",
      type: "string",
      advanced: true,
      hint: '"next-free-slot", a future ISO 8601 datetime, or the literal JSON `null` to clear ' +
        "it. Mutually exclusive with Publish At.",
    },
    {
      key: "forceOverwriteComments",
      label: "Force Overwrite Comments",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "When true, text missing a stored comment-thread marker is accepted anyway and the " +
        "affected threads are resolved server-side.",
    },
    excludeCommentMarkersParam,
  ],
  output: [
    { key: "id", type: "number", label: "Draft ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "publish_state", type: "string", label: "Async publish progress, or null" },
    { key: "platforms", type: "object", label: "Platform content as stored" },
  ],

  async execute(input, ctx) {
    const body: Record<string, unknown> = compact({
      platforms: asOptionalJson(input.platforms),
      draft_title: input.draftTitle,
      scratchpad_text: input.scratchpadText,
      tags: input.tags !== undefined
        ? input.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
      share: input.share,
      force_overwrite_comments: input.forceOverwriteComments,
    });
    // Applied after `compact` so an explicit clear (`"null"` -> JSON null)
    // survives — `compact` treats `null` as "omit", which is right for every
    // other field but wrong for the one place the vendor gives `null` meaning.
    const publishAt = nullableDate(input.publishAt);
    if (publishAt !== undefined) body.publish_at = publishAt;
    const planAt = nullableDate(input.planAt);
    if (planAt !== undefined) body.plan_at = planAt;

    return await new TypefullyClient(ctx).json(
      `/social-sets/${input.socialSetId}/drafts/${input.draftId}`,
      {
        method: "PATCH",
        query: compact({ exclude_comment_markers: input.excludeCommentMarkers }),
        body,
      },
    );
  },
};

export default draftUpdate;
