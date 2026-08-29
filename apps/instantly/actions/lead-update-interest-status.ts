import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient } from "../lib/client.ts";
import { leadInterestStatusOptions } from "../lib/params.ts";

/**
 * `POST /api/v2/leads/update-interest-status` — set a lead's interest status
 * by email, the same action the web app performs when you drag a lead
 * between CRM columns. Leave "Interest status" empty to reset to plain
 * "Lead".
 *
 * There is a 10-minute de-duplication window after any status change on a
 * lead during which further changes do not insert new analytics events — so
 * calling this twice in quick succession with the same target value is safe,
 * but a second DIFFERENT change inside that window will not show up in
 * `campaign-analytics-overview-get` either, by design.
 */
interface Input {
  lead_email: string;
  interest_value: number | null;
  campaign_id?: string;
  list_id?: string;
  disable_auto_interest?: boolean;
}

const leadUpdateInterestStatus: ActionDefinition<Input> = {
  key: "lead-update-interest-status",
  type: "perform",
  resource: "lead",
  title: "Update Lead Interest Status",
  description: "Set (or clear) a lead's interest status by email — the same action as dragging " +
    "a lead between CRM columns in the app.",
  idempotent: true,
  params: [
    { key: "lead_email", label: "Lead email", type: "string", required: true },
    {
      key: "interest_value",
      label: "Interest status",
      type: "select",
      options: leadInterestStatusOptions,
      hint: 'Leave empty to reset the lead to plain "Lead" status.',
    },
    {
      key: "campaign_id",
      label: "Campaign ID",
      type: "string",
      hint: "Scope the update to this campaign's copy of the lead.",
    },
    { key: "list_id", label: "List ID", type: "string" },
    {
      key: "disable_auto_interest",
      label: "Suppress automations for this change",
      type: "boolean",
      hint: "Without this, an explicit status change may still complete campaign leads, " +
        "update/create opportunities, and trigger matching automations and CRM-status " +
        "subsequences.",
    },
  ],
  output: [
    { key: "lead_email", type: "string", label: "Lead email" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json("/leads/update-interest-status", {
      method: "POST",
      body: {
        lead_email: input.lead_email,
        interest_value: input.interest_value ?? null,
        campaign_id: input.campaign_id,
        list_id: input.list_id,
        disable_auto_interest: input.disable_auto_interest,
      },
    });
  },
};

export default leadUpdateInterestStatus;
