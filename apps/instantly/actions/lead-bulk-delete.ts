import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient, toList } from "../lib/client.ts";
import { leadDeleteStatusOptions, listIdParam } from "../lib/params.ts";

/**
 * `DELETE /api/v2/leads` — delete many leads from a campaign or list based on
 * filters, rather than one at a time. Requires `campaign_id` or `list_id`.
 *
 * Note: this endpoint's `status` filter uses a DIFFERENT enum from
 * Campaign/Account status — see `lib/params.ts`'s
 * {@link leadDeleteStatusOptions} for exactly which numbers mean what here.
 */
interface Input {
  campaign_id?: string;
  list_id?: string;
  status?: number;
  ids?: string[] | string;
  limit?: number;
}

const leadBulkDelete: ActionDefinition<Input> = {
  key: "lead-bulk-delete",
  type: "perform",
  resource: "lead",
  title: "Delete Leads in Bulk",
  description: "Delete multiple leads from a campaign or list, optionally filtered by status " +
    "or specific IDs.",
  idempotent: true,
  params: [
    {
      key: "campaign_id",
      label: "Campaign ID",
      type: "string",
      hint: "Required if List is empty.",
    },
    { ...listIdParam, hint: "Required if Campaign ID is empty." },
    { key: "status", label: "Status filter", type: "select", options: leadDeleteStatusOptions },
    {
      key: "ids",
      label: "Specific lead IDs",
      type: "array",
      item: { type: "string" },
      hint: "When set, only these leads (within the campaign/list) are deleted.",
    },
    {
      key: "limit",
      label: "Max leads to delete",
      type: "number",
      validation: { integer: true, min: 1, max: 10000 },
      hint: "Leave empty to delete every matching lead.",
    },
  ],
  output: [
    { key: "count", type: "number", label: "Leads deleted" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json("/leads", {
      method: "DELETE",
      body: {
        campaign_id: input.campaign_id,
        list_id: input.list_id,
        status: input.status,
        ids: toList(input.ids),
        limit: input.limit,
      },
    });
  },
};

export default leadBulkDelete;
