import type { ActionDefinition } from "@w6w/types";
import { encodeId, KeapClient, V2 } from "../lib/client.ts";

/**
 * `GET /rest/v2/opportunities/{opportunity_id}` — Retrieve an Opportunity.
 *
 * The response nests rather than flattens: the contact is a `contact` object
 * (id, email, name, company, phone), the stage a `stage` object (id, name,
 * details, reasons) and the owner a `user` object. There is no `contact_id` on
 * the response even though `contact_id` is what you *send* to create one, so a
 * round trip through create-then-read changes the property names underneath
 * you.
 */
interface Input {
  opportunityId: string;
  fields?: string[];
}

const opportunityGet: ActionDefinition<Input> = {
  key: "opportunity-get",
  type: "read",
  title: "Get Opportunity",
  resource: "opportunity",
  description: "Retrieve a single opportunity by id.",
  params: [
    { key: "opportunityId", label: "Opportunity ID", type: "string", required: true },
    {
      key: "fields",
      label: "Optional properties",
      type: "multiselect",
      advanced: true,
      options: [
        { value: "custom_fields", label: "custom_fields" },
        { value: "created_by", label: "created_by" },
        { value: "last_updated_by", label: "last_updated_by" },
        { value: "status_id", label: "status_id" },
        { value: "monthly_revenue", label: "monthly_revenue (legacy accounts only)" },
        { value: "order_revenue", label: "order_revenue (legacy accounts only)" },
        { value: "objection", label: "objection (legacy accounts only)" },
        { value: "status", label: "status (legacy accounts only)" },
        { value: "stage_entrance_time", label: "stage_entrance_time (legacy accounts only)" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Opportunity ID" },
    { key: "opportunity_title", type: "string", label: "Title" },
    { key: "contact", type: "object", label: "Contact" },
    { key: "stage", type: "object", label: "Stage" },
  ],

  execute(input, ctx) {
    const fields = Array.isArray(input.fields) ? input.fields.join(",") : input.fields;
    const client = new KeapClient(ctx);
    return client.json(`${V2}/opportunities/${encodeId(input.opportunityId)}`, {
      query: { fields },
    });
  },
};

export default opportunityGet;
