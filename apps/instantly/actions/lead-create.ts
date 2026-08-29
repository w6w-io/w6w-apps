import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, InstantlyClient } from "../lib/client.ts";
import { type LeadProfileInput, leadProfileParams, listIdParam } from "../lib/params.ts";

/**
 * `POST /api/v2/leads` — create a single lead.
 *
 * Use `campaign` OR `list_id`, not both. With `campaign`, `email` is
 * required; with `list_id`, `email` is optional but at least one of `email`,
 * `first_name` or `last_name` must be set.
 */
interface Input extends LeadProfileInput {
  campaign?: string;
  list_id?: string;
  email?: string;
  skip_if_in_workspace?: boolean;
  skip_if_in_campaign?: boolean;
  skip_if_in_list?: boolean;
  blocklist_id?: string;
  verify_leads_for_lead_finder?: boolean;
  verify_leads_on_import?: boolean;
}

const leadCreate: ActionDefinition<Input> = {
  key: "lead-create",
  type: "perform",
  resource: "lead",
  title: "Create Lead",
  description: "Create a single lead in a campaign or a lead list.",
  idempotent: false,
  params: [
    {
      key: "campaign",
      label: "Campaign",
      type: "string",
      hint: "Use this OR List, not both. Required if List is empty.",
    },
    listIdParam,
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Required when adding to a Campaign. Optional for a List, but then at least one of " +
        "Email, First name or Last name is required.",
    },
    ...leadProfileParams(),
    {
      key: "skip_if_in_workspace",
      label: "Skip if already in workspace",
      type: "boolean",
    },
    { key: "skip_if_in_campaign", label: "Skip if already in this campaign", type: "boolean" },
    { key: "skip_if_in_list", label: "Skip if already in this list", type: "boolean" },
    { key: "blocklist_id", label: "Blocklist ID to check against", type: "string" },
    {
      key: "verify_leads_for_lead_finder",
      label: "Verify email for Lead Finder",
      type: "boolean",
    },
    { key: "verify_leads_on_import", label: "Verify email on import", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "Lead ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    const { custom_variables, ...rest } = input;
    return new InstantlyClient(ctx).json("/leads", {
      method: "POST",
      body: {
        ...rest,
        custom_variables: asOptionalJson(custom_variables, "Custom variables"),
      },
    });
  },
};

export default leadCreate;
