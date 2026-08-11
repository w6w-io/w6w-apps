import type { ActionDefinition } from "@w6w/types";
import { compact, KeapClient, V2 } from "../lib/client.ts";
import { asOptionalJson } from "../lib/params.ts";

/**
 * `POST /rest/v2/opportunities` — Create an Opportunity.
 *
 * Three required properties, and one of them is not obvious: `contact_id`,
 * `opportunity_title` **and `stage_id`**. Keap has no default pipeline stage,
 * so an opportunity cannot be created "unstaged" — fetch the stage list first
 * (List Opportunity Stages) and pick one.
 *
 * The request is flat (`contact_id`, `stage_id`, `user_id`) while the response
 * is nested (`contact`, `stage`, `user` objects). See `opportunity-get.ts`.
 */
interface Input {
  contactId: string;
  title: string;
  stageId: string;
  userId?: string;
  nextActionTime?: string;
  nextActionNotes?: string;
  notes?: string;
  estimatedCloseTime?: string;
  includeInForecast?: boolean;
  projectedRevenueLow?: number;
  projectedRevenueHigh?: number;
  affiliateId?: string;
  customFields?: unknown;
}

const opportunityCreate: ActionDefinition<Input> = {
  key: "opportunity-create",
  type: "perform",
  title: "Create Opportunity",
  resource: "opportunity",
  description: "Create an opportunity against a contact, in a named pipeline stage.",
  // No dedupe key and no duplicate check: a retry is a second opportunity in
  // the pipeline, and pipeline totals are what people report on.
  idempotent: false,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "stageId",
      label: "Stage ID",
      type: "string",
      required: true,
      hint: "Required by Keap — there is no default stage. Use List Opportunity Stages.",
    },
    { key: "userId", label: "Owner user ID", type: "string" },
    { key: "nextActionTime", label: "Next action at", type: "datetime", advanced: true },
    { key: "nextActionNotes", label: "Next action notes", type: "text", advanced: true },
    { key: "notes", label: "Notes", type: "text", advanced: true },
    { key: "estimatedCloseTime", label: "Estimated close", type: "datetime", advanced: true },
    {
      key: "includeInForecast",
      label: "Include in sales forecast",
      type: "boolean",
      advanced: true,
    },
    {
      key: "projectedRevenueLow",
      label: "Projected revenue (low)",
      type: "number",
      advanced: true,
      row: "revenue",
    },
    {
      key: "projectedRevenueHigh",
      label: "Projected revenue (high)",
      type: "number",
      advanced: true,
      row: "revenue",
    },
    { key: "affiliateId", label: "Affiliate ID", type: "string", advanced: true },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      advanced: true,
      hint: 'Array of `{"id": "...", "content": ...}` from GET /rest/v2/opportunities/model.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Opportunity ID" },
    { key: "opportunity_title", type: "string", label: "Title" },
    { key: "stage", type: "object", label: "Stage" },
    { key: "created_time", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    const body = compact({
      contact_id: input.contactId,
      opportunity_title: input.title,
      stage_id: input.stageId,
      user_id: input.userId,
      next_action_time: input.nextActionTime,
      next_action_notes: input.nextActionNotes,
      opportunity_notes: input.notes,
      estimated_close_time: input.estimatedCloseTime,
      include_in_forecast: input.includeInForecast,
      projected_revenue_low: input.projectedRevenueLow,
      projected_revenue_high: input.projectedRevenueHigh,
      affiliate_id: input.affiliateId,
      custom_fields: asOptionalJson<unknown[]>(input.customFields, "Custom fields"),
    });
    const client = new KeapClient(ctx);
    return client.json(`${V2}/opportunities`, { method: "POST", body });
  },
};

export default opportunityCreate;
