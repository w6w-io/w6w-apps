import type { ActionDefinition } from "@w6w/types";
import { compact, jsonArray, KommoClient } from "../lib/client.ts";

interface Input {
  name?: string;
  responsibleUserId?: number;
  customFieldsValues?: unknown;
}

/**
 * `POST /api/v4/companies` — verified against `add-companies`. Same
 * array-body, id-only-response shape as leads and contacts. Unlike Mautic's
 * Company, Kommo's `name` field is bare — not prefixed `company*`.
 */
const companyCreate: ActionDefinition<Input> = {
  key: "company-create",
  type: "perform",
  resource: "company",
  title: "Create a Company",
  description: "Create a new company. Two calls with the same fields create two companies.",
  // Kommo does not dedupe on create — two identical calls make two companies.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string" },
    { key: "responsibleUserId", label: "Responsible User ID", type: "number" },
    {
      key: "customFieldsValues",
      label: "Custom Fields (JSON)",
      type: "json",
      advanced: true,
      hint: 'A JSON array, e.g. [{"field_id": 123, "values": [{"value": "x"}]}].',
    },
  ],
  output: [
    { key: "id", type: "number", label: "New company ID" },
    { key: "requestId", type: "string", label: "Kommo's echoed request_id" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "creating a Kommo company", { name: input.name });
    const body = compact({
      name: input.name,
      responsible_user_id: input.responsibleUserId,
      custom_fields_values: jsonArray(input.customFieldsValues),
    });
    const created = await new KommoClient(ctx).createOne("/companies", "companies", body);
    return { id: created.id, requestId: (created as { request_id?: string }).request_id };
  },
};

export default companyCreate;
