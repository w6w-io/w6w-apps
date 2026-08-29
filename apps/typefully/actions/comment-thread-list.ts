import type { ActionDefinition } from "@w6w/types";
import { compact, TypefullyClient } from "../lib/client.ts";
import { draftIdParam, paginationParams, socialSetIdParam } from "../lib/params.ts";

interface Input {
  socialSetId: number;
  draftId: number;
  platform?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

const PLATFORM_OPTIONS = [
  { value: "x", label: "X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "mastodon", label: "Mastodon" },
  { value: "threads", label: "Threads" },
  { value: "bluesky", label: "Bluesky" },
  { value: "substack", label: "Substack" },
  { value: "x_article", label: "X Article" },
];

/**
 * `GET /v2/social-sets/{social_set_id}/drafts/{draft_id}/comment-threads` —
 * the same threads collaborators see in the webapp, ordered by creation time.
 * Defaults to `status=unresolved`, so resolved threads are omitted unless you
 * ask for `resolved` or `all`.
 */
const commentThreadList: ActionDefinition<Input> = {
  key: "comment-thread-list",
  type: "search",
  resource: "comment-thread",
  title: "List Comment Threads",
  description: "List comment threads on a draft. Defaults to unresolved threads only.",
  params: [
    socialSetIdParam,
    draftIdParam,
    { key: "platform", label: "Platform", type: "select", options: PLATFORM_OPTIONS },
    {
      key: "status",
      label: "Resolution",
      type: "select",
      default: "unresolved",
      options: [
        { value: "unresolved", label: "Unresolved" },
        { value: "resolved", label: "Resolved" },
        { value: "all", label: "All" },
      ],
    },
    ...paginationParams(10, 50),
  ],
  output: [
    { key: "results", type: "array", label: "Comment threads, each with its comments" },
    { key: "count", type: "number", label: "Total available" },
    { key: "limit", type: "number", label: "Page size used" },
    { key: "offset", type: "number", label: "Offset used" },
  ],

  async execute(input, ctx) {
    return await new TypefullyClient(ctx).json(
      `/social-sets/${input.socialSetId}/drafts/${input.draftId}/comment-threads`,
      {
        query: compact({
          platform: input.platform,
          status: input.status,
          limit: input.limit,
          offset: input.offset,
        }),
      },
    );
  },
};

export default commentThreadList;
