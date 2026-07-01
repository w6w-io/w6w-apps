import type { ActionDefinition } from "@w6w/types";
import { MailchimpClient, type MailchimpListResponse } from "../lib/client.ts";

interface Input {
  status?: "save" | "sending" | "sent" | "schedule";
  listId?: string;
  beforeCreateTime?: string;
  sinceCreateTime?: string;
  beforeSendTime?: string;
  sinceSendTime?: string;
  sortField?: "create_time" | "send_time";
  sortDirection?: "ASC" | "DESC";
  fields?: string[];
  excludeFields?: string[];
  count?: number;
  offset?: number;
}

/** Default subset of fields — matches n8n's default when the caller doesn't override. */
const DEFAULT_FIELDS = [
  "campaigns.id",
  "campaigns.status",
  "campaigns.tracking",
  "campaigns.settings.from_name",
  "campaigns.settings.title",
  "campaigns.settings.reply_to",
];

const listCampaigns: ActionDefinition<Input> = {
  key: "list-campaigns",
  type: "read",
  resource: "campaign",
  title: "List Campaigns",
  description: "List campaigns, optionally filtered by status, list, or timeframe.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "save", label: "Save" },
        { value: "sending", label: "Sending" },
        { value: "sent", label: "Sent" },
        { value: "schedule", label: "Schedule" },
      ],
    },
    { key: "listId", label: "List ID", type: "string" },
    { key: "beforeCreateTime", label: "Before create time (ISO 8601)", type: "string" },
    { key: "sinceCreateTime", label: "Since create time (ISO 8601)", type: "string" },
    { key: "beforeSendTime", label: "Before send time (ISO 8601)", type: "string" },
    { key: "sinceSendTime", label: "Since send time (ISO 8601)", type: "string" },
    {
      key: "sortField",
      label: "Sort field",
      type: "select",
      options: [
        { value: "create_time", label: "Create time" },
        { value: "send_time", label: "Send time" },
      ],
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      options: [
        { value: "ASC", label: "Ascending" },
        { value: "DESC", label: "Descending" },
      ],
    },
    { key: "fields", label: "Fields", type: "string", repeat: true },
    { key: "excludeFields", label: "Exclude fields", type: "string", repeat: true },
    { key: "count", label: "Count", type: "number", default: 10 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "campaigns", type: "array", label: "Campaigns" },
    { key: "total_items", type: "number", label: "Total items" },
  ],

  async execute(input, ctx) {
    const client = new MailchimpClient(ctx);
    const fields = input.fields && input.fields.length
      ? input.fields.join(",")
      : DEFAULT_FIELDS.join(",");
    const excludeFields = input.excludeFields && input.excludeFields.length
      ? input.excludeFields.join(",")
      : undefined;
    return client.request<MailchimpListResponse<"campaigns">>(`/campaigns`, {
      query: {
        status: input.status,
        list_id: input.listId,
        before_create_time: input.beforeCreateTime,
        since_create_time: input.sinceCreateTime,
        before_send_time: input.beforeSendTime,
        since_send_time: input.sinceSendTime,
        sort_field: input.sortField,
        sort_dir: input.sortDirection,
        fields,
        exclude_fields: excludeFields,
        count: input.count ?? 10,
        offset: input.offset ?? 0,
      },
    });
  },
};

export default listCampaigns;
