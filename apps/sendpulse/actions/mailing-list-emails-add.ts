import type { ActionDefinition } from "@w6w/types";
import { SendPulseClient } from "../lib/client.ts";

interface Input {
  id: number;
  email: string;
  variables?: Record<string, unknown>;
}

/**
 * `POST /addressbooks/{id}/emails` — adds one subscriber to a mailing list.
 *
 * SendPulse's schema accepts a whole array of `{email, variables}` per call,
 * plus a **double opt-in** variant that sends a confirmation email instead
 * of subscribing outright (`oneOf: [AddEmailsSingleOptIn,
 * AddEmailsDoubleOptIn]`). This action covers single opt-in, adding one
 * address per call — the workflow-step shape a per-contact automation step
 * actually needs. Double opt-in needs a `confirmation` template configured
 * in the SendPulse dashboard first and is left out until that setup story
 * is designed; batch add is left out for the same reason `contact-create`
 * stays one-contact-per-call — a workflow step processes one record.
 */
const action: ActionDefinition<Input> = {
  key: "mailing-list-emails-add",
  type: "perform",
  resource: "mailing-list",
  title: "Add an email to a mailing list",
  description: "Subscribe one email address to a mailing list (single opt-in).",
  idempotent: true,
  params: [
    { key: "id", label: "Mailing list ID", type: "number", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "variables",
      label: "Variables",
      type: "json",
      default: {},
      hint: 'Custom fields defined on the mailing list, e.g. {"name": "Ada"}.',
    },
  ],
  output: [
    { key: "result", type: "boolean", label: "Added" },
  ],

  async execute(input, ctx) {
    const entry: Record<string, unknown> = { email: input.email };
    if (input.variables && Object.keys(input.variables).length > 0) {
      entry.variables = input.variables;
    }
    return await new SendPulseClient(ctx).bulkEmail(`/addressbooks/${input.id}/emails`, {
      method: "POST",
      body: { emails: [entry] },
    });
  },
};

export default action;
