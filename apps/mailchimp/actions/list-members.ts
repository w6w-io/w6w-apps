import type { ActionDefinition } from "@w6w/types";
import { MailchimpClient, type MailchimpListResponse } from "../lib/client.ts";

interface Input {
  listId: string;
  status?: "subscribed" | "unsubscribed" | "cleaned" | "pending" | "transactional";
  emailType?: "html" | "text";
  sinceLastChanged?: string;
  beforeLastChanged?: string;
  beforeTimestampOpt?: string;
  count?: number;
  offset?: number;
}

/**
 * List members of an audience. n8n exposes a "return all" toggle that walks
 * every page; in w6w we keep to a single page and hand back the raw envelope
 * so callers can loop. Defaults are Mailchimp's own (count=10) but capped by
 * caller-provided value.
 */
const listMembers: ActionDefinition<Input> = {
  key: "list-members",
  type: "read",
  resource: "member",
  title: "List Members",
  description: "List members of a Mailchimp list (single page).",
  params: [
    { key: "listId", label: "List ID", type: "string", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "subscribed", label: "Subscribed" },
        { value: "unsubscribed", label: "Unsubscribed" },
        { value: "cleaned", label: "Cleaned" },
        { value: "pending", label: "Pending" },
        { value: "transactional", label: "Transactional" },
      ],
    },
    {
      key: "emailType",
      label: "Email type",
      type: "select",
      options: [
        { value: "html", label: "HTML" },
        { value: "text", label: "Text" },
      ],
    },
    { key: "sinceLastChanged", label: "Since last changed (ISO 8601)", type: "string" },
    { key: "beforeLastChanged", label: "Before last changed (ISO 8601)", type: "string" },
    { key: "beforeTimestampOpt", label: "Before opt-in timestamp (ISO 8601)", type: "string" },
    { key: "count", label: "Count", type: "number", default: 500 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "members", type: "array", label: "Members" },
    { key: "total_items", type: "number", label: "Total items" },
  ],

  async execute(input, ctx) {
    const client = new MailchimpClient(ctx);
    return client.request<MailchimpListResponse<"members">>(
      `/lists/${input.listId}/members`,
      {
        query: {
          status: input.status,
          email_type: input.emailType,
          since_last_changed: input.sinceLastChanged,
          before_last_changed: input.beforeLastChanged,
          before_timestamp_opt: input.beforeTimestampOpt,
          count: input.count ?? 500,
          offset: input.offset ?? 0,
        },
      },
    );
  },
};

export default listMembers;
