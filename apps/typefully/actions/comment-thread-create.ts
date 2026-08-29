import type { ActionDefinition } from "@w6w/types";
import { compact, TypefullyClient } from "../lib/client.ts";
import { draftIdParam, socialSetIdParam } from "../lib/params.ts";

interface Input {
  socialSetId: number;
  draftId: number;
  platform?: string;
  postIndex?: number;
  selectedText: string;
  occurrence?: number;
  text: string;
}

/**
 * `POST /v2/social-sets/{social_set_id}/drafts/{draft_id}/comment-threads` —
 * anchor a new comment thread to a substring of a draft's visible text.
 *
 * For post platforms (`x`, `linkedin`, `mastodon`, `threads`, `bluesky`,
 * `substack`), set Post Index and copy Selected Text verbatim from a
 * `draft-get` response; use Occurrence to disambiguate a repeated substring
 * (0 = first match). For X Articles, set Platform to `x_article` and omit
 * Post Index — Selected Text then matches the article's rendered text, with
 * Markdown syntax and embed tags ignored.
 *
 * A LinkedIn mention (`@[Name](urn:li:organization:ID)`) is indivisible:
 * Selected Text must contain the whole mention or none of it.
 *
 * Not `idempotent`: each call creates a new thread with a new id: retrying
 * after a dropped response creates a duplicate.
 */
const commentThreadCreate: ActionDefinition<Input> = {
  key: "comment-thread-create",
  type: "perform",
  resource: "comment-thread",
  title: "Create Comment Thread",
  description: "Anchor a new comment thread to a substring of a draft's text.",
  idempotent: false,
  params: [
    socialSetIdParam,
    draftIdParam,
    {
      key: "platform",
      label: "Platform",
      type: "select",
      options: [
        { value: "x", label: "X" },
        { value: "linkedin", label: "LinkedIn" },
        { value: "mastodon", label: "Mastodon" },
        { value: "threads", label: "Threads" },
        { value: "bluesky", label: "Bluesky" },
        { value: "substack", label: "Substack" },
        { value: "x_article", label: "X Article" },
      ],
      hint: "Required when the draft has more than one commentable platform; otherwise " +
        "resolves to the draft's own platform. Use x_article to comment on article text.",
    },
    {
      key: "postIndex",
      label: "Post Index",
      type: "number",
      hint: "Zero-based index into the platform's posts array. Omit for X Article.",
      validation: { min: 0, integer: true },
    },
    {
      key: "selectedText",
      label: "Selected Text",
      type: "text",
      required: true,
      hint: "Exact substring of the target's visible text, copied verbatim from Get Draft.",
    },
    {
      key: "occurrence",
      label: "Occurrence",
      type: "number",
      default: 0,
      hint: "Zero-based occurrence of Selected Text when it appears more than once.",
      validation: { min: 0, max: 10000, integer: true },
    },
    {
      key: "text",
      label: "Comment Text",
      type: "text",
      required: true,
      validation: { minLength: 1, maxLength: 10000 },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Comment thread ID" },
    { key: "draft_id", type: "number", label: "Draft ID" },
    { key: "platform", type: "string", label: "Anchored platform" },
    { key: "status", type: "string", label: "unresolved | resolved" },
    { key: "comments", type: "array", label: "Comments in the thread (the root comment first)" },
  ],

  async execute(input, ctx) {
    const body = compact({
      platform: input.platform,
      post_index: input.postIndex,
      selected_text: input.selectedText,
      occurrence: input.occurrence,
      text: input.text,
    });
    return await new TypefullyClient(ctx).json(
      `/social-sets/${input.socialSetId}/drafts/${input.draftId}/comment-threads`,
      { method: "POST", body },
    );
  },
};

export default commentThreadCreate;
