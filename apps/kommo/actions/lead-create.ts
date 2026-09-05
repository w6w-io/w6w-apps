import type { ActionDefinition } from "@w6w/types";
import { compact, jsonArray, KommoClient, tagList } from "../lib/client.ts";

interface Input {
  name?: string;
  price?: number;
  pipelineId?: number;
  statusId?: number;
  responsibleUserId?: number;
  tagsToAdd?: string;
  customFieldsValues?: unknown;
}

/**
 * `POST /api/v4/leads` — verified against `adding-leads`. Kommo requires a
 * top-level JSON array even for one lead (its own example passes two), and
 * echoes back only `id`/`request_id`/`_links` for the created row — not the
 * fields it was given. Call `lead-get` afterwards for the full record.
 */
const leadCreate: ActionDefinition<Input> = {
  key: "lead-create",
  type: "perform",
  resource: "lead",
  title: "Create a Lead",
  description: "Create a new lead. Two calls with the same fields create two leads.",
  // Kommo mints a new lead ID per call — nothing here dedupes a retry.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string" },
    { key: "price", label: "Sale Price", type: "number" },
    { key: "pipelineId", label: "Pipeline ID", type: "number", row: "pipeline" },
    {
      key: "statusId",
      label: "Stage (Status) ID",
      type: "number",
      row: "pipeline",
      hint: "Defaults to the first stage of the main pipeline.",
    },
    { key: "responsibleUserId", label: "Responsible User ID", type: "number" },
    {
      key: "tagsToAdd",
      label: "Tags",
      type: "string",
      hint: "Comma-separated tag names to apply.",
    },
    {
      key: "customFieldsValues",
      label: "Custom Fields (JSON)",
      type: "json",
      advanced: true,
      hint: 'A JSON array, e.g. [{"field_id": 123, "values": [{"value": "x"}]}].',
    },
  ],
  output: [
    { key: "id", type: "number", label: "New lead ID" },
    { key: "requestId", type: "string", label: "Kommo's echoed request_id" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "creating a Kommo lead", { name: input.name });
    const body = compact({
      name: input.name,
      price: input.price,
      pipeline_id: input.pipelineId,
      status_id: input.statusId,
      responsible_user_id: input.responsibleUserId,
      tags_to_add: tagList(input.tagsToAdd),
      custom_fields_values: jsonArray(input.customFieldsValues),
    });
    const created = await new KommoClient(ctx).createOne("/leads", "leads", body);
    return { id: created.id, requestId: (created as { request_id?: string }).request_id };
  },
};

export default leadCreate;
