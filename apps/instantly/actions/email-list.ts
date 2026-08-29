import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient, type InstantlyListPage } from "../lib/client.ts";

/**
 * `GET /api/v2/emails` — list the Unibox: emails a campaign sent or
 * received.
 *
 * **Rate limit: 20 requests/minute**, tighter than every other endpoint in
 * this app (which share the workspace-wide 100/s, 6000/min ceiling) —
 * documented explicitly on this one route.
 */
interface Input {
  search?: string;
  campaign_id?: string;
  list_id?: string;
  eaccount?: string;
  is_unread?: boolean;
  mode?: string;
  lead?: string;
  email_type?: string;
  latest_of_thread?: boolean;
  sort_order?: string;
  limit?: number;
  starting_after?: string;
}

const emailList: ActionDefinition<Input> = {
  key: "email-list",
  type: "search",
  resource: "email",
  title: "List Emails",
  description: "List emails a campaign sent or received (the Unibox). Rate limit: 20 " +
    "requests/minute, tighter than this app's other actions.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: 'A lead email address, or "thread:<thread_id>" to fetch one thread.',
    },
    { key: "campaign_id", label: "Campaign ID", type: "string" },
    { key: "list_id", label: "Lead list ID", type: "string" },
    {
      key: "eaccount",
      label: "Sending account(s)",
      type: "string",
      hint: "Comma-separated email addresses to filter by the sending account used.",
    },
    { key: "is_unread", label: "Unread only", type: "boolean" },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      options: [
        { value: "emode_focused", label: "Focused" },
        { value: "emode_others", label: "Others" },
        { value: "emode_all", label: "All" },
      ],
    },
    { key: "lead", label: "Lead email", type: "string" },
    {
      key: "email_type",
      label: "Email type",
      type: "select",
      options: [
        { value: "received", label: "Received" },
        { value: "sent", label: "Sent" },
        { value: "manual", label: "Manual" },
      ],
    },
    { key: "latest_of_thread", label: "Only the latest email per thread", type: "boolean" },
    {
      key: "sort_order",
      label: "Sort order",
      type: "select",
      options: [
        { value: "desc", label: "Newest first (default)" },
        { value: "asc", label: "Oldest first" },
      ],
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 20,
      validation: { integer: true, min: 1, max: 100 },
    },
    {
      key: "starting_after",
      label: "Starting after (cursor)",
      type: "string",
      hint: "Paste the previous response's `next_starting_after`.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Emails" },
    { key: "next_starting_after", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json<InstantlyListPage<unknown>>("/emails", {
      query: {
        search: input.search,
        campaign_id: input.campaign_id,
        list_id: input.list_id,
        eaccount: input.eaccount,
        is_unread: input.is_unread,
        mode: input.mode,
        lead: input.lead,
        email_type: input.email_type,
        latest_of_thread: input.latest_of_thread,
        sort_order: input.sort_order,
        limit: input.limit,
        starting_after: input.starting_after,
      },
    });
  },
};

export default emailList;
