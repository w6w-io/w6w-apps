import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoldedClient } from "../lib/client.ts";

/**
 * `PUT /leads/{leadId}/dates` — override a lead's recorded creation date.
 *
 * A dedicated endpoint because `createdAt` is not writable through Update
 * Lead's general body — useful when backfilling leads imported from another
 * CRM, where the real creation date predates the Holded record.
 */
interface Input {
  leadId: string;
  date: number;
}

const leadDateUpdate: ActionDefinition<Input> = {
  key: "lead-date-update",
  type: "perform",
  resource: "lead",
  title: "Update Lead Creation Date",
  description: "Override a lead's recorded creation date.",
  idempotent: true,
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Leads result.",
    },
    {
      key: "date",
      label: "Creation date",
      type: "number",
      required: true,
      hint: "Unix timestamp.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "1 on success" },
    { key: "info", type: "string", label: "Human status message" },
    { key: "id", type: "string", label: "Lead ID" },
  ],

  execute(input, ctx) {
    return new HoldedClient(ctx).write(`/leads/${encodeId(input.leadId)}/dates`, "PUT", {
      date: input.date,
    });
  },
};

export default leadDateUpdate;
