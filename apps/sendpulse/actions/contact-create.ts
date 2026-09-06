import type { ActionDefinition } from "@w6w/types";
import { compact, SendPulseClient } from "../lib/client.ts";

interface Input {
  responsibleId: number;
  firstName?: string;
  lastName?: string;
  externalContactId?: string;
}

/**
 * `POST /crm/v1/contacts/create` — the vendor's replacement for the
 * deprecated `POST /contacts`, which this app deliberately does not use.
 *
 * The replacement is much narrower than what it replaces. The deprecated
 * endpoint accepted `phones`, `emails`, `tags` and `attributes` directly in
 * the create body; `/contacts/create` accepts only `responsibleId`
 * (**required** — the deprecated endpoint required nothing at all),
 * `firstName`, `lastName` and `externalContactId`. A phone or email address
 * has to be added afterward through its own endpoint — this app exposes
 * `contact-email-add` for that. Not knowing this reads as "the API lost
 * fields", when the fields moved to their own calls.
 */
const action: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create a contact",
  description: "Create a bare contact (name only). Add an email with `contact-email-add` " +
    "afterward — this endpoint does not accept one directly.",
  idempotent: false,
  params: [
    {
      key: "responsibleId",
      label: "Responsible team member ID",
      type: "number",
      required: true,
      hint: "From `users-list`.",
    },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    {
      key: "externalContactId",
      label: "External contact ID",
      type: "string",
      hint: 'SendPulse: "we do not recommend using it to add an ID from third-party systems".',
    },
  ],
  output: [
    { key: "data", type: "object", label: "Created contact" },
  ],

  async execute(input, ctx) {
    const body = compact({
      responsibleId: input.responsibleId,
      firstName: input.firstName,
      lastName: input.lastName,
      externalContactId: input.externalContactId,
    });
    return await new SendPulseClient(ctx).crm("/contacts/create", { method: "POST", body });
  },
};

export default action;
