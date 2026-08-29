import type { ActionDefinition } from "@w6w/types";
import { compact, TypefullyClient } from "../lib/client.ts";
import { draftIdParam, excludeCommentMarkersParam, socialSetIdParam } from "../lib/params.ts";

interface Input {
  socialSetId: number;
  draftId: number;
  excludeCommentMarkers?: boolean;
}

/**
 * `GET /v2/social-sets/{social_set_id}/drafts/{draft_id}` — one draft's full
 * content across every configured platform, plus status and scheduling.
 *
 * If the draft has comment threads, `posts[*].text` (and, for X Articles,
 * `platforms.x_article.content_markdown`) carries Typefully's
 * `<typ:comment-thread id="…">…</typ:comment-thread>` marker tags — structural
 * anchor metadata for a `GET → modify → PATCH` round-trip, not user text.
 * Preserve them exactly when feeding the result into `draft-update`. Set
 * "Exclude Comment Markers" only for a read-only/export flow (an LLM context
 * window, a CSV, a dashboard) and never PATCH what comes back with it set,
 * unless resolving or removing those comment anchors is the intent.
 */
const draftGet: ActionDefinition<Input> = {
  key: "draft-get",
  type: "read",
  resource: "draft",
  title: "Get Draft",
  description: "Fetch one draft's full content, status, and scheduling information.",
  params: [socialSetIdParam, draftIdParam, excludeCommentMarkersParam],
  output: [
    { key: "id", type: "number", label: "Draft ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "publish_state", type: "string", label: "Async publish progress, or null" },
    { key: "draft_title", type: "string", label: "Internal title, or null" },
    { key: "preview", type: "string", label: "Smart-trimmed text preview" },
    { key: "scheduled_date", type: "string", label: "Scheduled or planned datetime, or null" },
    { key: "tags", type: "array", label: "Tag slugs" },
    { key: "platforms", type: "object", label: "Full per-platform content" },
    { key: "private_url", type: "string", label: "Private Typefully URL" },
    { key: "share_url", type: "string", label: "Public share URL, or null" },
  ],

  async execute(input, ctx) {
    return await new TypefullyClient(ctx).json(
      `/social-sets/${input.socialSetId}/drafts/${input.draftId}`,
      { query: compact({ exclude_comment_markers: input.excludeCommentMarkers }) },
    );
  },
};

export default draftGet;
