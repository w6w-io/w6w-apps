import type { ActionDefinition } from "@w6w/types";
import { compact, GivebutterClient } from "../lib/client.ts";
import { numericIdParam } from "../lib/params.ts";

interface Input {
  id: string;
  name?: string;
  head_contact_id?: number;
  note?: string;
  envelope_name?: string;
}

const householdUpdate: ActionDefinition<Input> = {
  key: "household-update",
  type: "perform",
  resource: "household",
  title: "Update Household",
  description: "Update a household's fields. Only fields you set are changed.",
  idempotent: true,
  params: [
    numericIdParam("Household"),
    { key: "name", label: "Name", type: "string", validation: { maxLength: 255 } },
    { key: "head_contact_id", label: "Head contact ID", type: "number" },
    { key: "note", label: "Note", type: "text" },
    {
      key: "envelope_name",
      label: "Envelope name",
      type: "string",
      validation: { maxLength: 255 },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Household ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const body = compact({
      name: input.name,
      head_contact_id: input.head_contact_id,
      note: input.note,
      envelope_name: input.envelope_name,
    });
    return await new GivebutterClient(ctx).data(`/households/${encodeURIComponent(input.id)}`, {
      method: "PUT",
      body,
    });
  },
};

export default householdUpdate;
