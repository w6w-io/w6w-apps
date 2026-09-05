import type { ActionDefinition } from "@w6w/types";
import { compact, jsonArray, KommoClient } from "../lib/client.ts";

interface Input {
  id: number;
  name?: string;
  responsibleUserId?: number;
  customFieldsValues?: unknown;
}

/**
 * `PATCH /api/v4/companies/{id}` — verified against `updating-company` (the
 * single-record form; `PATCH /api/v4/companies` with no ID is the separate
 * bulk form and is not implemented here). The response comes back wrapped in
 * `_embedded.companies[0]` and echoes back only `id`, `name`, `updated_at`
 * and `is_deleted` — never the rest of the record.
 */
const companyUpdate: ActionDefinition<Input> = {
  key: "company-update",
  type: "perform",
  resource: "company",
  title: "Update a Company",
  description: "Update fields on an existing company. Only the fields you set are changed.",
  idempotent: true,
  params: [
    { key: "id", label: "Company ID", type: "number", required: true },
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
    { key: "id", type: "number", label: "Company ID" },
    { key: "updatedAt", type: "number", label: "Unix timestamp of the update" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "updating a Kommo company", { id: input.id });
    const body = compact({
      name: input.name,
      responsible_user_id: input.responsibleUserId,
      custom_fields_values: jsonArray(input.customFieldsValues),
    });
    const updated = await new KommoClient(ctx).updateOne(
      `/companies/${input.id}`,
      "companies",
      body,
    );
    return { id: updated.id, updatedAt: updated.updated_at };
  },
};

export default companyUpdate;
