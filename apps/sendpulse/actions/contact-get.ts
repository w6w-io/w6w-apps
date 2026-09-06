import type { ActionDefinition } from "@w6w/types";
import { SendPulseClient } from "../lib/client.ts";

interface Input {
  contactId: number;
}

/** `GET /crm/v1/contacts/{contactId}` — name, owner, deal count, phones/emails/messengers. */
const action: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get a contact",
  description: "Get a single contact by ID.",
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
  ],
  output: [
    { key: "data", type: "object", label: "Contact" },
  ],

  async execute(input, ctx) {
    return await new SendPulseClient(ctx).crm(`/contacts/${input.contactId}`);
  },
};

export default action;
