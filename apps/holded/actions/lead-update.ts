import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, encodeId, HoldedClient } from "../lib/client.ts";

/**
 * `PUT /leads/{leadId}` — update a lead's name, value, due date, custom
 * fields or status. "Only the params included in the operation will update
 * the lead" — a partial update, and the reason this is idempotent.
 *
 * Funnel, stage and contact are deliberately not writable here: Holded gives
 * each its own dedicated endpoint (Update Lead Stage, and — for funnel/contact
 * — no update endpoint at all, only at creation), so routing them through this
 * action's body would silently be ignored by the API rather than applied.
 */
interface Input {
  leadId: string;
  name?: string;
  value?: number;
  dueDate?: number;
  customFields?: string;
  status?: number;
}

interface CustomField {
  field?: string;
  value?: string;
}

const leadUpdate: ActionDefinition<Input> = {
  key: "lead-update",
  type: "perform",
  resource: "lead",
  title: "Update Lead",
  description: "Update a lead's name, value, due date, custom fields or status.",
  idempotent: true,
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Leads result.",
    },
    { key: "name", label: "Lead name", type: "string" },
    { key: "value", label: "Monetary value", type: "number" },
    { key: "dueDate", label: "Due date", type: "number", hint: "Unix timestamp." },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      hint: 'JSON array of {field, value}. Example: [{"field":"Source","value":"Website"}]',
    },
    { key: "status", label: "Status", type: "number" },
  ],
  output: [
    { key: "status", type: "number", label: "1 on success" },
    { key: "info", type: "string", label: "Human status message" },
    { key: "id", type: "string", label: "Lead ID" },
  ],

  execute(input, ctx) {
    const body = compact({
      name: input.name,
      value: input.value,
      dueDate: input.dueDate,
      customFields: asOptionalJson<CustomField[]>(input.customFields, "Custom fields"),
      status: input.status,
    });
    return new HoldedClient(ctx).write(`/leads/${encodeId(input.leadId)}`, "PUT", body);
  },
};

export default leadUpdate;
