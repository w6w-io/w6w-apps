import type { ActionDefinition } from "@w6w/types";
import { compact, GivebutterClient } from "../lib/client.ts";

interface Input {
  name: string;
  head_contact_id?: number;
  note?: string;
  envelope_name?: string;
}

const householdCreate: ActionDefinition<Input> = {
  key: "household-create",
  type: "perform",
  resource: "household",
  title: "Create Household",
  description: "Create a household.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 255 } },
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
    return await new GivebutterClient(ctx).data("/households", { method: "POST", body });
  },
};

export default householdCreate;
