import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { formIdParam, organizationIdParam } from "../lib/params.ts";

/**
 * `GET /forms/{form_id}/conversations` — "Filter responses": one row per
 * contact who interacted with the form, with its latest status/score/tags.
 *
 * Every query parameter here is copied from the vendor's own worked example,
 * including the documented enums (`message_status`:
 * `without_reply` | `with_reply`) and date shape (`YYYY-MM-DD`). Response
 * envelope is `{next, previous, results, count}` — confirmed against the
 * vendor's captured example, `count` trailing rather than leading the object
 * (harmless for a JSON consumer, noted only because it differs from every
 * other list envelope in this app).
 */
interface Input {
  formId: string;
  excludeHumans?: boolean;
  limit?: number;
  onlyUnread?: boolean;
  onlyWithoutTags?: boolean;
  messageStatus?: "without_reply" | "with_reply";
  scoreGt?: number;
  scoreLt?: number;
  tag?: string;
  createdAtStartDate?: string;
  createdAtEndDate?: string;
  orderBy?: string;
  organizationId?: string;
}

const conversationList: ActionDefinition<Input> = {
  key: "conversation-list",
  type: "search",
  resource: "conversation",
  title: "Filter Responses",
  description: "List a form's contacts (respondents), filtered by read state, tag, score or date.",
  params: [
    formIdParam,
    { key: "excludeHumans", label: "Exclude human agent contacts", type: "boolean" },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      validation: { integer: true, min: 0 },
    },
    { key: "onlyUnread", label: "Only unread", type: "boolean" },
    { key: "onlyWithoutTags", label: "Only without tags", type: "boolean" },
    {
      key: "messageStatus",
      label: "Message status",
      type: "select",
      options: [
        { value: "without_reply", label: "Without reply" },
        { value: "with_reply", label: "With reply" },
      ],
    },
    { key: "scoreGt", label: "Score greater than", type: "number" },
    { key: "scoreLt", label: "Score less than", type: "number" },
    { key: "tag", label: "Tag ID", type: "string" },
    { key: "createdAtStartDate", label: "Created at, from (YYYY-MM-DD)", type: "date" },
    { key: "createdAtEndDate", label: "Created at, to (YYYY-MM-DD)", type: "date" },
    {
      key: "orderBy",
      label: "Order by",
      type: "string",
      hint: "e.g. -latest_interaction (the vendor's own example; a leading - reverses the sort).",
    },
    organizationIdParam,
  ],
  output: [
    { key: "count", type: "number", label: "Total match count" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "previous", type: "string", label: "Previous page URL" },
    { key: "results", type: "array", label: "Contacts (respondents)" },
  ],

  execute(input, ctx) {
    return new VideoAskClient(ctx).list(`/forms/${encodeId(input.formId)}/conversations`, {
      query: {
        exclude_humans: input.excludeHumans,
        limit: input.limit,
        only_unread: input.onlyUnread,
        only_without_tags: input.onlyWithoutTags,
        message_status: input.messageStatus,
        score_gt: input.scoreGt,
        score_lt: input.scoreLt,
        tag: input.tag,
        created_at_start_date: input.createdAtStartDate,
        created_at_end_date: input.createdAtEndDate,
        order_by: input.orderBy,
      },
      organizationId: input.organizationId,
    });
  },
};

export default conversationList;
