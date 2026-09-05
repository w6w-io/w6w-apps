import type { ActionDefinition } from "@w6w/types";
import { call, compact } from "../lib/client.ts";
import { CURRENCY_CODES, customFieldsParam } from "../lib/params.ts";

/**
 * `POST /deals.update` — verified against
 * `developer.focus.teamleader.eu/docs/api/deals-update` on 2026-09-01.
 * Returns `204 No Content`.
 */
interface Input {
  id: string;
  customerType?: "contact" | "company";
  customerId?: string;
  contactPersonId?: string;
  title?: string;
  summary?: string;
  sourceId?: string;
  departmentId?: string;
  responsibleUserId?: string;
  estimatedValueAmount?: number;
  estimatedValueCurrency?: string;
  estimatedProbability?: number;
  estimatedClosingDate?: string;
  customFields?: unknown[];
}

const dealsUpdate: ActionDefinition<Input> = {
  key: "deals-update",
  type: "perform",
  resource: "deal",
  title: "Update Deal",
  idempotent: true,
  description: "Update a deal's title, customer, ownership or estimates. To move a deal " +
    "between pipeline phases use Move Deal instead — this endpoint does not accept `phase_id`.",
  params: [
    { key: "id", label: "Deal ID", type: "string", required: true },
    {
      key: "customerType",
      label: "Customer type",
      type: "select",
      options: [{ value: "contact", label: "Contact" }, { value: "company", label: "Company" }],
      hint: "Provide together with Customer ID to change the deal's customer.",
    },
    { key: "customerId", label: "Customer ID", type: "string" },
    { key: "contactPersonId", label: "Contact person ID", type: "string" },
    { key: "title", label: "Title", type: "string" },
    { key: "summary", label: "Summary", type: "text", hint: "This is the remarks field." },
    { key: "sourceId", label: "Source ID", type: "string" },
    { key: "departmentId", label: "Department ID", type: "string" },
    { key: "responsibleUserId", label: "Responsible user ID", type: "string" },
    { key: "estimatedValueAmount", label: "Estimated value amount", type: "number" },
    {
      key: "estimatedValueCurrency",
      label: "Estimated value currency",
      type: "select",
      options: CURRENCY_CODES.map((value) => ({ value, label: value })),
      hint: "Required together with amount.",
    },
    {
      key: "estimatedProbability",
      label: "Estimated probability",
      type: "number",
      validation: { min: 0, max: 1 },
    },
    { key: "estimatedClosingDate", label: "Estimated closing date", type: "date" },
    customFieldsParam,
  ],
  output: [{ key: "id", type: "string", label: "Deal ID" }],

  async execute(input, ctx) {
    const lead = input.customerType && input.customerId
      ? compact({
        customer: { type: input.customerType, id: input.customerId },
        contact_person_id: input.contactPersonId,
      })
      : undefined;
    const estimatedValue = input.estimatedValueAmount !== undefined
      ? { amount: input.estimatedValueAmount, currency: input.estimatedValueCurrency }
      : undefined;

    await call(
      ctx,
      "deals.update",
      compact({
        id: input.id,
        lead,
        title: input.title,
        summary: input.summary,
        source_id: input.sourceId,
        department_id: input.departmentId,
        responsible_user_id: input.responsibleUserId,
        estimated_value: estimatedValue,
        estimated_probability: input.estimatedProbability,
        estimated_closing_date: input.estimatedClosingDate,
        custom_fields: input.customFields,
      }),
    );
    return { id: input.id };
  },
};

export default dealsUpdate;
