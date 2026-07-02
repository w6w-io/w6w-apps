import type { ActionDefinition } from "@w6w/types";
import { BrevoClient } from "../lib/client.ts";

interface Input {
  email: string;
  attributes?: Record<string, unknown>;
  listIds?: number[];
  updateEnabled?: boolean;
  emailBlacklisted?: boolean;
  smsBlacklisted?: boolean;
  smtpBlacklistSender?: string[];
}

const createContact: ActionDefinition<Input> = {
  key: "create-contact",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact in Brevo. Requires an email address.",
  params: [
    { key: "email", label: "Email", type: "string", required: true, placeholder: "name@email.com" },
    {
      key: "attributes",
      label: "Attributes",
      type: "json",
      hint: "JSON object of contact attributes, e.g. `{\"FIRSTNAME\": \"Ada\"}`.",
    },
    {
      key: "listIds",
      label: "List IDs",
      type: "json",
      hint: "JSON array of list IDs the contact should be added to.",
    },
    { key: "updateEnabled", label: "Update if exists", type: "boolean", default: false },
    { key: "emailBlacklisted", label: "Email blacklisted", type: "boolean" },
    { key: "smsBlacklisted", label: "SMS blacklisted", type: "boolean" },
  ],

  async execute(input, ctx) {
    const client = new BrevoClient(ctx);
    const body: Record<string, unknown> = { email: input.email };
    if (input.attributes) body.attributes = input.attributes;
    if (input.listIds) body.listIds = input.listIds;
    if (input.updateEnabled !== undefined) body.updateEnabled = input.updateEnabled;
    if (input.emailBlacklisted !== undefined) body.emailBlacklisted = input.emailBlacklisted;
    if (input.smsBlacklisted !== undefined) body.smsBlacklisted = input.smsBlacklisted;
    if (input.smtpBlacklistSender) body.smtpBlacklistSender = input.smtpBlacklistSender;
    return client.request("/contacts", { method: "POST", body });
  },
};

export default createContact;
