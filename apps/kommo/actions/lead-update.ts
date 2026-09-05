import type { ActionDefinition } from "@w6w/types";
import { compact, jsonArray, KommoClient, tagList } from "../lib/client.ts";

interface Input {
  id: number;
  name?: string;
  price?: number;
  pipelineId?: number;
  statusId?: number;
  responsibleUserId?: number;
  tagsToAdd?: string;
  tagsToDelete?: string;
  customFieldsValues?: unknown;
}

/**
 * `PATCH /api/v4/leads/{id}` — verified against `updating-single-lead`. Body
 * is a plain object (unlike create's array), but the RESPONSE still comes
 * back wrapped in `_embedded.leads[0]` — and Kommo echoes back only `id` and
 * `updated_at`, never the rest of the record.
 */
const leadUpdate: ActionDefinition<Input> = {
  key: "lead-update",
  type: "perform",
  resource: "lead",
  title: "Update a Lead",
  description: "Update fields on an existing lead. Only the fields you set are changed.",
  idempotent: true,
  params: [
    { key: "id", label: "Lead ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "price", label: "Sale Price", type: "number" },
    { key: "pipelineId", label: "Pipeline ID", type: "number", row: "pipeline" },
    { key: "statusId", label: "Stage (Status) ID", type: "number", row: "pipeline" },
    { key: "responsibleUserId", label: "Responsible User ID", type: "number" },
    { key: "tagsToAdd", label: "Tags to Add", type: "string", row: "tags" },
    { key: "tagsToDelete", label: "Tags to Remove", type: "string", row: "tags" },
    {
      key: "customFieldsValues",
      label: "Custom Fields (JSON)",
      type: "json",
      advanced: true,
      hint: 'A JSON array, e.g. [{"field_id": 123, "values": [{"value": "x"}]}].',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Lead ID" },
    { key: "updatedAt", type: "number", label: "Unix timestamp of the update" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "updating a Kommo lead", { id: input.id });
    const body = compact({
      name: input.name,
      price: input.price,
      pipeline_id: input.pipelineId,
      status_id: input.statusId,
      responsible_user_id: input.responsibleUserId,
      tags_to_add: tagList(input.tagsToAdd),
      tags_to_delete: tagList(input.tagsToDelete),
      custom_fields_values: jsonArray(input.customFieldsValues),
    });
    const updated = await new KommoClient(ctx).updateOne(`/leads/${input.id}`, "leads", body);
    return { id: updated.id, updatedAt: updated.updated_at };
  },
};

export default leadUpdate;
