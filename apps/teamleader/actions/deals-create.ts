import type { ActionDefinition } from "@w6w/types";
import { call, compact } from "../lib/client.ts";
import { CURRENCY_CODES, customFieldsParam } from "../lib/params.ts";

/**
 * `POST /deals.create` — verified against
 * `developer.focus.teamleader.eu/docs/api/deals-create` on 2026-09-01.
 * Returns `201` with `{"data": {"type": "deal", "id": "…"}}`.
 */
interface Input {
  customerType: "contact" | "company";
  customerId: string;
  contactPersonId?: string;
  title: string;
  summary?: string;
  sourceId?: string;
  departmentId?: string;
  responsibleUserId?: string;
  phaseId?: string;
  estimatedValueAmount?: number;
  estimatedValueCurrency?: string;
  estimatedProbability?: number;
  estimatedClosingDate?: string;
  customFields?: unknown[];
}

const dealsCreate: ActionDefinition<Input> = {
  key: "deals-create",
  type: "perform",
  resource: "deal",
  title: "Create Deal",
  idempotent: false,
  description: "Create a new deal for a customer (a contact or a company).",
  params: [
    {
      key: "customerType",
      label: "Customer type",
      type: "select",
      required: true,
      options: [{ value: "contact", label: "Contact" }, { value: "company", label: "Company" }],
    },
    { key: "customerId", label: "Customer ID", type: "string", required: true },
    {
      key: "contactPersonId",
      label: "Contact person ID",
      type: "string",
      hint: "Only meaningful when Customer type is Company: the contact at that company this " +
        "deal is with.",
    },
    { key: "title", label: "Title", type: "string", required: true },
    { key: "summary", label: "Summary", type: "text", hint: "This is the remarks field." },
    { key: "sourceId", label: "Source ID", type: "string" },
    { key: "departmentId", label: "Department ID", type: "string" },
    { key: "responsibleUserId", label: "Responsible user ID", type: "string" },
    { key: "phaseId", label: "Phase ID", type: "string" },
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
      hint: "A number between 0 and 1 (inclusive).",
    },
    { key: "estimatedClosingDate", label: "Estimated closing date", type: "date" },
    customFieldsParam,
  ],
  output: [
    { key: "id", type: "string", label: "New deal ID" },
    { key: "type", type: "string", label: 'Resource type ("deal")' },
  ],

  async execute(input, ctx) {
    const estimatedValue = input.estimatedValueAmount !== undefined
      ? { amount: input.estimatedValueAmount, currency: input.estimatedValueCurrency }
      : undefined;

    return await call<{ id: string; type: string }>(
      ctx,
      "deals.create",
      compact({
        lead: compact({
          customer: { type: input.customerType, id: input.customerId },
          contact_person_id: input.contactPersonId,
        }),
        title: input.title,
        summary: input.summary,
        source_id: input.sourceId,
        department_id: input.departmentId,
        responsible_user_id: input.responsibleUserId,
        phase_id: input.phaseId,
        estimated_value: estimatedValue,
        estimated_probability: input.estimatedProbability,
        estimated_closing_date: input.estimatedClosingDate,
        custom_fields: input.customFields,
      }),
    );
  },
};

export default dealsCreate;
