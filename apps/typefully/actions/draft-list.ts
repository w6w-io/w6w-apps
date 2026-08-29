import type { ActionDefinition } from "@w6w/types";
import { compact, toList, TypefullyClient } from "../lib/client.ts";
import { paginationParams, socialSetIdParam } from "../lib/params.ts";

interface Input {
  socialSetId: number;
  status?: string;
  tag?: string[] | string;
  orderBy?: string;
  limit?: number;
  offset?: number;
}

/**
 * `GET /v2/social-sets/{social_set_id}/drafts` — list a social set's drafts,
 * most recently edited first by default (`-updated_at`).
 *
 * **Draft statuses**, per the vendor's own definitions: `draft` = saved but
 * not scheduled. `scheduled` = queued to auto-publish at `scheduled_date`.
 * `planned` = dated but inert — it has a `scheduled_date` but will NOT
 * auto-publish until confirmed by later setting `publish_at`; a planned draft
 * whose date has passed is NOT overdue and NOT a failure. `publishing` = a
 * publish is in flight (transient). `published` = posted. `error` = publishing
 * failed.
 */
const draftList: ActionDefinition<Input> = {
  key: "draft-list",
  type: "search",
  resource: "draft",
  title: "List Drafts",
  description: "List a social set's drafts, with optional status/tag filtering and sorting.",
  params: [
    socialSetIdParam,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "draft", label: "Draft" },
        { value: "planned", label: "Planned (dated but inert)" },
        { value: "scheduled", label: "Scheduled" },
        { value: "publishing", label: "Publishing (in flight)" },
        { value: "published", label: "Published" },
        { value: "error", label: "Error" },
      ],
      hint: "Leave unset to list drafts in every status.",
    },
    {
      key: "tag",
      label: "Tags",
      type: "string",
      hint: "One or more tag slugs (not display names), comma-separated — list them via List " +
        "Tags. Drafts matching any of them are returned.",
    },
    {
      key: "orderBy",
      label: "Order By",
      type: "select",
      default: "-updated_at",
      options: [
        { value: "-updated_at", label: "Last edited (newest first)" },
        { value: "updated_at", label: "Last edited (oldest first)" },
        { value: "-created_at", label: "Created (newest first)" },
        { value: "created_at", label: "Created (oldest first)" },
        { value: "-scheduled_date", label: "Scheduled date (latest first)" },
        { value: "scheduled_date", label: "Scheduled date (earliest first)" },
        { value: "-published_at", label: "Published date (latest first)" },
        { value: "published_at", label: "Published date (earliest first)" },
      ],
    },
    ...paginationParams(10, 50),
  ],
  output: [
    { key: "results", type: "array", label: "Drafts" },
    { key: "count", type: "number", label: "Total available" },
    { key: "limit", type: "number", label: "Page size used" },
    { key: "offset", type: "number", label: "Offset used" },
    { key: "next", type: "string", label: "Next page URL, or null" },
    { key: "previous", type: "string", label: "Previous page URL, or null" },
  ],

  async execute(input, ctx) {
    return await new TypefullyClient(ctx).json(`/social-sets/${input.socialSetId}/drafts`, {
      query: compact({
        status: input.status,
        tag: toList(input.tag),
        order_by: input.orderBy,
        limit: input.limit,
        offset: input.offset,
      }),
    });
  },
};

export default draftList;
