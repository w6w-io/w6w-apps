import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient, type InstantlyListPage, toList } from "../lib/client.ts";
import { leadFilterOptions, listIdParam } from "../lib/params.ts";

/**
 * `POST /api/v2/leads/list` — search leads. A `POST`, per the vendor's own
 * note, because the filter shape is too complex for query parameters.
 *
 * Ordered by `id` ascending (or by `contact`/email when `distinct_contacts`
 * is set) so a cursor loop is chronological — but only for leads created on
 * or after 2025-10-15; older records may sort out of that order. `limit` is
 * prefilled at 20 rather than the vendor's own 100 ceiling, since a lead
 * search is usually a lookup, not a bulk export.
 */
interface Input {
  search?: string;
  filter?: string;
  campaign?: string;
  list_id?: string;
  in_campaign?: boolean;
  in_list?: boolean;
  ids?: string[] | string;
  contacts?: string[] | string;
  distinct_contacts?: boolean;
  limit?: number;
  starting_after?: string;
}

const leadList: ActionDefinition<Input> = {
  key: "lead-list",
  type: "search",
  resource: "lead",
  title: "Search Leads",
  description: "Search leads by campaign, list, filter or free-text search.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matches email and profile fields. Whole-word / prefix match only.",
    },
    { key: "filter", label: "Filter", type: "select", options: leadFilterOptions },
    { key: "campaign", label: "Campaign ID", type: "string" },
    listIdParam,
    { key: "in_campaign", label: "Must be in a campaign", type: "boolean" },
    { key: "in_list", label: "Must be in a list", type: "boolean" },
    { key: "ids", label: "Lead IDs", type: "array", item: { type: "string" } },
    {
      key: "contacts",
      label: "Emails",
      type: "array",
      item: { type: "string", placeholder: "jondoe@example.com" },
      hint: "Only leads whose email is in this list.",
    },
    {
      key: "distinct_contacts",
      label: "Distinct contacts only",
      type: "boolean",
      hint: "Collapse to one row per email across campaigns/lists.",
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
    { key: "items", type: "array", label: "Leads" },
    { key: "next_starting_after", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json<InstantlyListPage<unknown>>("/leads/list", {
      method: "POST",
      body: {
        search: input.search,
        filter: input.filter,
        campaign: input.campaign,
        list_id: input.list_id,
        in_campaign: input.in_campaign,
        in_list: input.in_list,
        ids: toList(input.ids),
        contacts: toList(input.contacts),
        distinct_contacts: input.distinct_contacts,
        limit: input.limit,
        starting_after: input.starting_after,
      },
    });
  },
};

export default leadList;
