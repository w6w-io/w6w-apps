import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient, toList } from "../lib/client.ts";
import { leadFilterOptions, listIdParam } from "../lib/params.ts";

/**
 * `POST /api/v2/leads/move` — move (or copy) leads matching a filter to a
 * different campaign or list. Returns a `BackgroundJob` immediately; the
 * move itself happens asynchronously — poll
 * `GET /api/v2/background-jobs/{id}` (not covered by this app; feed the
 * returned `id` to an HTTP step against that path) to know when it finished.
 *
 * The destination fields are `to_campaign_id` / `to_list_id` — NOT
 * `destination_campaign_id` as the vendor's own prose summary implies
 * elsewhere; only the OpenAPI schema's property names were trusted here.
 *
 * When filtering by `ids`, you must also provide Source campaign or Source
 * list to say which source to filter those IDs from.
 */
interface Input {
  to_campaign_id?: string;
  to_list_id?: string;
  search?: string;
  filter?: string;
  campaign?: string;
  list_id?: string;
  in_campaign?: boolean;
  in_list?: boolean;
  ids?: string[] | string;
  copy_leads?: boolean;
  check_duplicates?: boolean;
  reset_interest_status?: boolean;
}

const leadMove: ActionDefinition<Input> = {
  key: "lead-move",
  type: "perform",
  resource: "lead",
  title: "Move Leads",
  description: "Move (or copy) leads matching a filter to a different campaign or list. " +
    "Returns a background job; the move runs asynchronously.",
  idempotent: false,
  params: [
    { key: "to_campaign_id", label: "Destination campaign ID", type: "string" },
    { key: "to_list_id", label: "Destination list ID", type: "string" },
    { key: "search", label: "Search (First/Last/Email)", type: "string" },
    { key: "filter", label: "Filter", type: "select", options: leadFilterOptions },
    {
      key: "campaign",
      label: "Source campaign ID",
      type: "string",
      hint: "Required when Specific lead IDs is set, to say which source to filter them from.",
    },
    { ...listIdParam, key: "list_id", label: "Source list ID" },
    { key: "in_campaign", label: "Must be in a campaign", type: "boolean" },
    { key: "in_list", label: "Must be in a list", type: "boolean" },
    { key: "ids", label: "Specific lead IDs", type: "array", item: { type: "string" } },
    {
      key: "copy_leads",
      label: "Copy instead of move",
      type: "boolean",
      hint: "Leave the leads in their source campaign/list and add copies to the destination.",
    },
    { key: "check_duplicates", label: "Skip leads already in the destination", type: "boolean" },
    { key: "reset_interest_status", label: "Reset interest status on move", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "Background job ID" },
    { key: "status", type: "string", label: "Job status" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json("/leads/move", {
      method: "POST",
      body: { ...input, ids: toList(input.ids) },
    });
  },
};

export default leadMove;
