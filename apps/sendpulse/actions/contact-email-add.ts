import type { ActionDefinition } from "@w6w/types";
import { SendPulseClient } from "../lib/client.ts";

interface Input {
  contactId: number;
  email: string;
  isMain?: boolean;
}

/**
 * `POST /crm/v1/contacts/{contactId}/emails` — how a contact created bare by
 * `contact-create` gets an email address (see that action's doc comment).
 * Max 50 characters, per the vendor's schema.
 */
const action: ActionDefinition<Input> = {
  key: "contact-email-add",
  type: "perform",
  resource: "contact",
  title: "Add an email to a contact",
  description: "Add an email address to an existing contact.",
  idempotent: false,
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
    { key: "email", label: "Email", type: "string", required: true, validation: { maxLength: 50 } },
    {
      key: "isMain",
      label: "Set as main address",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "data", type: "array", label: "The contact's email addresses" },
  ],

  async execute(input, ctx) {
    return await new SendPulseClient(ctx).crm(`/contacts/${input.contactId}/emails`, {
      method: "POST",
      body: { emails: [{ email: input.email, isMain: input.isMain === true }] },
    });
  },
};

export default action;
