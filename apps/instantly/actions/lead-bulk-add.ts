import type { ActionDefinition } from "@w6w/types";
import { asJson, InstantlyClient } from "../lib/client.ts";
import { listIdParam } from "../lib/params.ts";

/**
 * `POST /api/v2/leads/add` — add up to 1,000 leads to a campaign or list in
 * one call. Use `campaign_id` OR `list_id`, not both.
 *
 * Not marked idempotent: the response tallies duplicates within the same
 * campaign/list and skips them, but a retry after a dropped response has no
 * caller-supplied idempotency key to de-duplicate against, and a lead that
 * failed for a transient reason the first time may succeed the second —
 * changing the workspace's state either way.
 */
interface Input {
  campaign_id?: string;
  list_id?: string;
  leads: unknown;
}

const leadBulkAdd: ActionDefinition<Input> = {
  key: "lead-bulk-add",
  type: "perform",
  resource: "lead",
  title: "Add Leads in Bulk",
  description: "Add up to 1,000 leads to a campaign or a list in one call. Validates emails and " +
    "checks them against blocklists and existing leads.",
  idempotent: false,
  params: [
    {
      key: "campaign_id",
      label: "Campaign ID",
      type: "string",
      hint: "Use this OR List, not both.",
    },
    listIdParam,
    {
      key: "leads",
      label: "Leads (JSON array)",
      type: "json",
      required: true,
      hint: '[{ "email": "...", "first_name": "...", "last_name": "...", ... }] — up to 1000. ' +
        "Adding to a campaign requires email on each; adding to a list requires at least one of " +
        "email, first_name or last_name.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "total_sent", type: "number", label: "Leads submitted" },
    { key: "leads_uploaded", type: "number", label: "Leads created" },
    { key: "duplicated_leads", type: "number", label: "Already present, skipped" },
    { key: "invalid_email_count", type: "number", label: "Invalid/missing email, skipped" },
    { key: "in_blocklist", type: "number", label: "Skipped — on the blocklist" },
  ],

  execute(input, ctx) {
    const leads = asJson<unknown[]>(input.leads, "Leads");
    ctx.log("info", "bulk-adding leads", { count: leads.length });
    return new InstantlyClient(ctx).json("/leads/add", {
      method: "POST",
      body: { campaign_id: input.campaign_id, list_id: input.list_id, leads },
    });
  },
};

export default leadBulkAdd;
